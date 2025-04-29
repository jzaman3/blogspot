const express = require('express');
const router = express.Router();
const Post=require('../models/Post');
const User=require('../models/User');
const bcrypt=require('bcrypt');
const jwt=require('jsonwebtoken');
const multer = require('multer'); //file uploading for piucs NEW
const path = require('path');//additional NEW

const adminLayout='../views/layouts/admin';
const jwtSecret=process.env.JWT_SECRET;

// Set storage engine NEW
const storage = multer.diskStorage({
    destination: './public/uploads/',
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  });
  
const upload = multer({ storage });



const authMiddleware=(req,res,next)=>{
    const token=req.cookies.token;

    if (!token){
        return res.status(401).json({message:'Unauthorized'});
    }
    try{
        const decoded=jwt.verify(token, jwtSecret);
        req.userId=decoded.userId;
        next();
    }catch(error){
        res.status(401).json({message:'Unauthorized'});
    }
}


router.get('/admin', async(req, res) => {
        try{
            const locals = {
                title: "Admin",
                description: "Simple blog"
            }

            res.render('admin/index',{...locals, layout:adminLayout});
        } catch(error){
            console.log(error)
        }
    });


router.post('/admin', async(req, res) => {
        try{
            const {username, password}=req.body;
            const user =await User.findOne({username});
            if(!user){
                return res.status(401).json({message:'Invalid credentials'})
            }

            const isPasswordValid=await bcrypt.compare(password,user.password);
            if(!isPasswordValid){
                return res.status(401).json({message:'Invalid credentials'});
            }

            const token = jwt.sign({userId:user._id},jwtSecret)
            res.cookie('token',token, {httpOnly:true});

            res.redirect('/dashboard');


        } catch(error){
            console.log(error)
        }
    });    


    router.get('/dashboard', authMiddleware, async (req, res) => {
        try {
            const locals={
                title:'Dashboard',
                description:'dashboard created'
            }

            const data=await Post.find();
            res.render('admin/dashboard',{
                ...locals,
                data,
                layout: adminLayout
            });
        } catch (error) {

        }

    });
    
    

    
router.post('/register', async(req, res) => {
    try{

        const {username, password}=req.body;

        const hashedPassword=await bcrypt.hash(password,10);

        try{
            const user=await User.create({username, password:hashedPassword});
            res.status(201).json({message:'User Created',user});
        }catch(error){
            if(error.code===11000){
                res.status(409).json({message:'User already in use'});
            }
            res.status(500).json({message:'internal server error'})
        }

    } catch(error){
        console.log(error)
    }
});    


router.get('/add-post', authMiddleware, async (req, res) => {
    try {
        const locals={
            title:'Add post',
            description:'dashboard created'
        }

        const data=await Post.find();
        res.render('admin/add-post',{
            ...locals,
            data,
            layout: adminLayout
        });
    } catch (error) {

    }

});

//NEW ADD PIC
router.post('/add-post', authMiddleware, upload.single('image'), async (req, res) => {
    try {
      const newPost = new Post({
        title: req.body.title,
        body: req.body.body,
        imageUrl: req.file ? `/uploads/${req.file.filename}` : null,
        caption: req.body.caption
      });
  
      await newPost.save();
      res.redirect('/dashboard');
    } catch (error) {
      console.log(error);
      res.status(500).send('Error uploading post');
    }
  });
  


router.get('/edit-post/:id', authMiddleware, async (req, res) => {
    try {

        const locals={
            title:"Edit",
            description: "Description"
        };

        const data=await Post.findOne({_id:req.params.id});
        res.render('admin/edit-post',{
            ...locals,
            data,
            layout:adminLayout
        })

    } catch (error) {
        console.log(error);
    }

});


router.put('/edit-post/:id', authMiddleware, async (req, res) => {
    try {

        await Post.findByIdAndUpdate(req.params.id,{
            title:req.body.title,
            body:req.body.body,
            updatedAt:Date()
        });
        res.redirect(`/edit-post/${req.params.id}`);

    } catch (error) {

    }

});



router.delete('/delete-post/:id', authMiddleware, async (req, res) => {
    try {

        await Post.deleteOne({_id:req.params.id});
        res.redirect('/dashboard');

    } catch (error) {
        console.log(error);
    }

});



router.get('/logout', (req, res) => {
    res.clearCookie=('token');
    //res.json({message:'Logged out.'});
    res.redirect('/');
});



module.exports=router;