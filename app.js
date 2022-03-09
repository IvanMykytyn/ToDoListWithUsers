require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs")
const mongoose = require("mongoose");
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const findOrCreate = require('mongoose-findorcreate')
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const session = require('express-session')({
  secret: 'secret message actually i dont know what to write',
  resave: false,
  saveUninitialized: false
});

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({extended: true}))
app.use(express.static("public"))
app.use(session)
app.use(passport.initialize())
app.use(passport.session())

mongoose.connect('mongodb://localhost/toDolist3DB')

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate);

const User = mongoose.model("User", userSchema)

passport.use(User.createStrategy());
passport.serializeUser((user, done) => {
    done(null, user._id);
});
passport.deserializeUser((id, done) => {
  User.findById(id, (err, user) => {
    done(err, user);
  });
});
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",

  },
  (accessToken, refreshToken, profile, cb) => {
    User.findOrCreate({ googleId: profile.id }, (err, user) => {
        return cb(err, user);
    });
  }
));
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  (accessToken, refreshToken, profile, cb) => {
    User.findOrCreate({ facebookId: profile.id }, (err, user) => {
      return cb(err, user);
    });
  }
));

app.get("/", (req, res) => {
  res.render("login", {errorEmailMessage: "", errorPasswordMessage: ""})
})
app.get("/list", (req, res) => {
  if(req.isAuthenticated()){
    res.render("list", {listTitle: "Today", newListItems: []});
  }else{
    res.redirect("/login")
  }
})

app.get("/about", (req, res) => {
 res.render("about");
})
app.get("/error", (req, res) => {
  res.render("error")
})
app.get("/login", (req, res) => {
   res.render("login", {errorEmailMessage: "", errorPasswordMessage: ""});
});
app.post('/login',
  passport.authenticate('local',
  { failureRedirect: '/error', failureMessage: true }),
  (req, res) => {
      res.redirect('/list');
});

app.get("/register", (req, res) => {
  res.render("register", {errorEmailMessage: "", errorPasswordMessage: ""});
});

app.post("/register", (req, res) => {
  const password = req.body.password
  const username = req.body.username

  let validateLength = true
  let validateEmptyPassword = true
  let validateEmptyUsername = true

  if (password.length < 8){validateLength = false}
  if (!username){validateEmptyUsername = false}
  if (!password){validateEmptyPassword = false}
  if (!validateEmptyPassword && !validateEmptyUsername){
    const message = "Can't be empty"
    res.render("register", {errorEmailMessage: message, errorPasswordMessage: message})
  }else if (!validateEmptyPassword){
    res.render("register", {errorEmailMessage: "", errorPasswordMessage: "Can't be empty"})
  }else if (!validateEmptyUsername){
    res.render("register", {errorEmailMessage: "Can't be empty", errorPasswordMessage: ""})
  }else if (!validateLength){
    res.render("register", {errorEmailMessage: "", errorPasswordMessage: "Password must be more than 8 symbols"})
  }else{


    User.register({username: username},
      password, (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        }else{
          passport.authenticate('local')(req, res, () => {
            res.redirect('/list');
          })
        }
      });
  }

})

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/lists',
  passport.authenticate('google', {failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to secrets.
    res.redirect('/list');
});

app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/lists',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to secrets.
    res.redirect('/list');
  });

app.listen(3000, () => {
 console.log("the server is running at port 3000");
})
