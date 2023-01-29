require('dotenv').config();
const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt')
// modules which we installed for our passport framework
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();
app.set("view engine","ejs")
app.use(express.static("public"))
app.use(bodyParser.urlencoded({extended:true}));

// adding the session

app.use(session({
    secret: process.env.SECRET2,
    saveUninitialized:false,
    resave: false 
}));

app.use(passport.initialize()); // initalizing passport
app.use(passport.session()); // launching the session
mongoose.set("strictQuery", false);
mongoose.connect('mongodb://127.0.0.1:27017/AuthurizeDB');

const userSchema = new mongoose.Schema({
    email : String,
    password : String,
    googleId : String
});

userSchema.plugin(passportLocalMongoose);

userSchema.plugin(findOrCreate);

const User = new mongoose.model("User" , userSchema); // our mongoose model alike which we will create new documents.

passport.use(User.createStrategy()); // creating the strategy from our userschema

passport.serializeUser(function(user,done){ // serialsation of the cookie
    done(null,user.id);
}); 
passport.deserializeUser(function(id,done){ // serialsation of the cookie
    User.findById(id,function(err,user){
        done(err,user);
    });
});  

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL : "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get('/auth/google',
  passport.authenticate('google', { scope: ["profile"] })

  );
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: "/" }),
  function(req, res) {
    // after a sucessful authentication we will redirect our user to the secrets page.
    res.redirect("/spotify.");
  });

app.get("/register",(req,res)=>{
  res.render("register")
})

app.get("/",(req,res)=>{
  res.render("register")
})

app.get("/login",(req,res)=>{
    res.render("login")
})
app.get("/spotify.",(req,res)=>{
  res.render("index")
})
const isAuth = (req,res,next)=>{
  if(req.session.isAuth){
      next()
  }else{
      res.redirect("/login");
  }
}
app.get("/spotify",isAuth,(req,res)=>{
  res.render("index")
})

app.get("/logout",(req,res)=>{
  req.session.destroy((err)=>{
      if(err) throw err;
      res.redirect("/");
  });
});

// post route

app.post("/login",(req,res)=>{
  const {username,password} = req.body;

    User.findOne({email : username},(err,data)=>{

      
      if(!data){
        return res.redirect('/login');
      }
      
      bcrypt.compare(password, data.password, function(err, result) {
        
        if(result === false){
          return res.redirect('/login')
        }
        req.session.isAuth = true;
        res.redirect('/spotify');
      });
    });
    })
    
    app.post("/register",(req,res)=>{
      
  const {email ,password} = req.body;
    
    User.findOne({email : email},(err,data)=>{
      if(data){
        return res.redirect('/register');
      }
      else{
        bcrypt.hash(password, 12, (err, hash)=> {
          
          if(err){
            return console.log(err);
          }
          const newone = new User({
            email : email,
            password : hash
          })
          
          newone.save();
          
          res.redirect('/login')
        });
      }
    });

    
})

app.listen(3000 , ()=>{
    console.log("Server Started");
})