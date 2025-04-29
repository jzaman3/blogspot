const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');

// Middleware for parsing form data
router.use(express.urlencoded({ extended: true }));

// Home page route
router.get('', async (req, res) => {
    try {
        const locals = {
            title: "My Blog",
            description: "Simple blog"
        };

        let perPage = 10;
        let page = parseInt(req.query.page) || 1;

        const data = await Post.aggregate([{ $sort: { createdAt: -1 } }])
            .skip(perPage * page - perPage)
            .limit(perPage)
            .exec();

        const count = await Post.countDocuments();
        const nextPage = parseInt(page) + 1;
        const hasNextPage = nextPage <= Math.ceil(count / perPage);

        res.render('index', {
            ...locals,
            data,
            current: page,
            nextPage: hasNextPage ? nextPage : null,
            currentRoute: '/'
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
});

// Single post page with comments
router.get('/post/:id', async (req, res) => {
    try {
        const slug = req.params.id;
        const post = await Post.findById(slug);
        const comments = await Comment.find({ postId: slug }).sort({ createdAt: -1 });

        res.render('post', {
            post,
            comments,
            title: post.title,
            description: "Simple blog",
            currentRoute: `/post/${slug}`
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Error loading post');
    }
});

// Comment submission
router.post('/post/:id/comment', async (req, res) => {
    try {
        const newComment = new Comment({
            postId: req.params.id,
            name: req.body.name,
            email: req.body.email,
            body: req.body.body
        });

        await newComment.save();
        res.redirect(`/post/${req.params.id}?${Date.now()}`); // Cache-busting

    } catch (error) {
        console.error(error);
        res.status(500).send('Error submitting comment');
    }
});

// Search route
router.post('/search', async (req, res) => {
    try {
        const locals = {
            title: "Search",
            description: "Simple blog"
        };

        let searchTerm = req.body.searchTerm;
        const searchNoSpecialChar = searchTerm.replace(/[^a-zA-Z0-9]/g, "");

        const data = await Post.find({
            $or: [
                { title: { $regex: new RegExp(searchNoSpecialChar, 'i') } },
                { body: { $regex: new RegExp(searchNoSpecialChar, 'i') } }
            ]
        });

        res.render("search", {
            ...locals,
            data
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Search Error');
    }
});

// About page
router.get('/about', (req, res) => {
    const locals = {
        title: "About",
        description: "Simple blog"
    };
    res.render('about', locals);
});

// Contact page
router.get('/contact', (req, res) => {
    const locals = {
        title: "Contact",
        description: "Simple blog"
    };
    res.render('contact', locals);
});

module.exports = router;
