require('dotenv').config();
const bodyParser = require("body-parser");
const express = require("express");
const mongoose = require("mongoose");
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
    res.redirect("/sucess");
  });

app.get("/",(req,res)=>{
    res.redirect('/login')
})

app.get("/login",(req,res)=>{
    res.render("login")
})
app.get("/sucess",(req,res)=>{
    res.render("index")
})

app.listen(3000 , ()=>{
    console.log("Server Started");
})