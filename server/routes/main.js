const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Comment = require('../models/Comment');
const axios = require('axios'); //new

// Middleware for parsing form data
router.use(express.urlencoded({ extended: true }));

// Home page route
router.get('', async (req, res) => {
    try {
        const locals = {
            title: "My Blog",
            description: "Simple blog with weather"
        };

        // Get weather data
        let weather;
        try {
            weather = await getWeatherData();
            console.log('Weather data:', weather); // Debug log
        } catch (error) {
            console.error('Weather API error:', error);
            weather = null;
        }

        // Get blog posts
        const perPage = 10;
        const page = parseInt(req.query.page) || 1;
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
            weather, // Make sure this is passed
            current: page,
            nextPage: hasNextPage ? nextPage : null,
            currentRoute: '/'
        });

    } catch (error) {
        console.error('Homepage error:', error);
        res.status(500).render('error', { message: 'Server Error' });
    }
});


// Weather helper function
async function getWeatherData() {
    try {
        const response = await axios.get(
            'https://api.open-meteo.com/v1/forecast?latitude=52.52&longitude=13.41&hourly=temperature_2m&current_weather=true'
        );
        
        const current = response.data.current_weather;
        const hourly = response.data.hourly;
        
        return {
            temp: current.temperature,
            description: getWeatherDescription(current.weathercode),
            time: new Date(current.time).toLocaleTimeString(),
            location: 'Atlanta', // Hardcoded for these coordinates
            hourly: hourly.time.map((time, i) => ({
                time: new Date(time).toLocaleTimeString([], {hour: '2-digit'}),
                temp: hourly.temperature_2m[i]
            })).slice(0, 12) // Next 12 hours
        };
    } catch (error) {
        console.error('Weather API failed:', error.message);
        throw error;
    }
}

// Weather code translator
function getWeatherDescription(code) {
    const weatherCodes = {
        0: 'Clear sky',
        1: 'Mainly clear',
        2: 'Partly cloudy',
        3: 'Overcast',
        45: 'Fog',
        48: 'Rime fog',
        51: 'Light drizzle',
        53: 'Moderate drizzle',
        55: 'Dense drizzle',
        56: 'Light freezing drizzle',
        57: 'Dense freezing drizzle',
        61: 'Slight rain',
        63: 'Moderate rain',
        65: 'Heavy rain',
        66: 'Light freezing rain',
        67: 'Heavy freezing rain',
        71: 'Slight snow',
        73: 'Moderate snow',
        75: 'Heavy snow',
        77: 'Snow grains',
        80: 'Slight rain showers',
        81: 'Moderate rain showers',
        82: 'Violent rain showers',
        85: 'Slight snow showers',
        86: 'Heavy snow showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with hail',
        99: 'Heavy thunderstorm with hail'
    };
    return weatherCodes[code] || `Weather code ${code}`;
}

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
