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
  res.render("login")
})
app.get("/list", (req, res) => {
  res.render("list", {listTitle: "Today", newListItems: []});
})

app.get("/about", (req, res) => {
 res.render("about");
})

app.get("/login", (req, res) => {
   res.render("login");
});
app.post('/login',
  passport.authenticate('local',
  { failureRedirect: '/login', failureMessage: true }),
  (req, res) => {
      res.redirect('/');
});


app.get("/register", (req, res) => {
  res.render("register");
});
app.post("/register", (req, res) => {
  User.register({username: req.body.username },
     req.body.password, (err, user) => {
        if (err) {
          console.log(err);
          res.redirect("/register");
        }else{
          passport.authenticate('local')(req, res, () => {
            res.redirect('/');
          })
        }
    });
})

app.get('/logout', (req, res) => {
    req.logout();
    res.redirect('/');
});

app.get('/auth/google', passport.authenticate('google', { scope: ['profile'] }));
app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
});

app.get('/auth/facebook', passport.authenticate('facebook'));
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect to secrets.
    res.redirect('/secrets');
  });

app.listen(3000, () => {
 console.log("the server is running at port 3000");
})
