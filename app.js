//Module Dependences

require("dotenv").config();
const fs = require('fs');
const express = require('express');
const bodyParser = require("body-parser");
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const { time } = require('console');
const { getMaxListeners, features } = require('process');
const ejs = require("ejs");
var url = require('url');
const cloudinary = require('cloudinary').v2;

// Auth dependencies

const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const { Strategy, authenticate } = require("passport");
const findOrCreate = require("mongoose-findorcreate");


//List of Variables
const app = express();
const hostname = '127.0.0.1';
const port = process.env.PORT || '80';

app.use(express.urlencoded({ extended: true }));

//body-parser
app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(express.json({ limit: '50mb' }));

// cloudinary configuration

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});


// Setting up view-engine to EJS
app.set("view engine", "ejs");


// Setting route for serving Static files
app.use(express.static(__dirname + '/public'));


// For Setting session
app.use(
    session({
        secret: process.env.SECRET,
        resave: false,
        saveUninitialized: false,
    })
);

app.use(passport.initialize());
app.use(passport.session());


// Mongoose details
mongoose.connect(process.env.MONGODB_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useFindAndModify: false,
    useCreateIndex: true
});

const db = mongoose.connection;

db.on('connected', () => {
    console.log('Mongoose is connected!');
});


// Schemas for mongoDB


//Schema for login/register
const userSchema = new mongoose.Schema({
    name: String,
    picture: String,
    username: {
        type: String,
        unique: false,
    },
    password: String,
    authType: String,
    following: Array
});

// Tweet Schema 
const tweetSchema = new mongoose.Schema({
    authorName: String,
    date: String,
    tweetInput: String,
    email: String,
    picture: String,
    likes: Array
});


// Pluggins for passport JS local Auth

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate); // for findandCreate


// Models for mongo DB

const User = new mongoose.model("User", userSchema);
const UserDetails = new mongoose.model("UserDetails", userSchema);
const userTweet = mongoose.model("userTweet", tweetSchema);

passport.use(User.createStrategy());


//Passport JS local mongoose (serialize and deserialize)
passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {

        done(err, user);
    });
});


// POST requests handling


// post function for register
app.post("/register", function (req, res) {
    // check if password and confirmpassword are same or not
    // if true
    if (req.body.password != req.body.confirmpassword) {
        res.redirect(url.format({
            pathname: `/register`,
            query: {
                message: "Confirm password does not match."
            }
        }));
    }
    // if false
    else {
        req.body.following = [req.body.username];
        let userdetails = new UserDetails(req.body);
        userdetails.save();

        User.register({ username: req.body.username }, req.body.password, function (err, user) {
            if (err) {
                console.log(err);
                res.redirect(url.format({
                    pathname: `/register`,
                    query: {
                        message: "A user with same email already exists."
                    }
                }));
            } else {
                passport.authenticate("local")(req, res, function () {
                    console.log(user);
                    res.redirect("/home");
                });
            }
        });
    }
});


// post function for login
app.post("/login", function (req, res) {
    const user = new User({
        username: req.body.username,
        password: req.body.password,
    });
    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/home");
            });
        }
    });
});


// post request handling for uploading new tweets to mongoDB
app.post("/newtweet", (req, res) => {
    // check if user is authenticated or not
    if (req.isAuthenticated()) {
        console.log(req.user);
        console.log(req.body.hiddenImgUrl ,"req.body.hiddenImgUrl");
        if (req.body.hiddenImgUrl != "") {
            req.body.tweetInput = `<img src= ${req.body.hiddenImgUrl} alt="tweet" style="width: 75%;height: auto;margin: 15px auto;" //> <br/>` + req.body.tweetInput;
        }
        let myuserTweet = new userTweet(req.body);
        myuserTweet.save();
        res.send("Your Tweet Saved");
    } else {
        console.log("Not Signed In");
        res.send("Please Sign In First");
    }
});


// post request handling for updating number of likes on tweets to mongoDB
app.post("/likesupdate", (req, res) => {
    console.log("post request made");
    userTweet.find({ _id: req.body.tweetId }, (err, data) => {
        if (err) console.log(err);
        else {
            let myLikes = data[0].likes; //now myLikes contains all the initial likes
            myLikes.push(req.user.username); // now push current user's email to myLikes

            // update the likes using updateOne function
            userTweet.updateOne({ _id: req.body.tweetId }, { likes: myLikes }, function (err, result) {
                if (err) {
                    console.log(err)
                } else {
                    console.log("Result :", result);
                    // this redirects the client to home page with the message(as toast) that the post is liked
                    res.redirect(url.format({
                        pathname: `/home`,
                        query: {
                            message: "You liked the tweet."
                        }
                    }));
                }
            });
        }
    });
});


// post request handling for uploading user following details to mongoDB
app.post("/followupdate", (req, res) => {
    console.log("post request made");
    UserDetails.find({ username: req.user.username }, (err, data) => {
        if (err) console.log(err);
        else {
            let myFollowing = data[0].following; //now myFollowing contains all the initial following
            myFollowing.push(req.body.username); //now push the targeted user's email to current user's following

            // update the followings using updateOne function
            UserDetails.updateOne({ username: req.user.username }, { following: myFollowing }, function (err, result) {
                if (err) {
                    console.log(err)
                } else {
                    console.log("Result :", result);
                    res.redirect(url.format({
                        pathname: `/home`,
                        query: {
                            message: `You started following ${req.body.username}.`
                        }
                    }));
                }
            });
        }
    });
});


//End points or GET requests handling


// get request handling for logging out
app.get("/logout", function (req, res) {
    req.logout();
    res.redirect("/");
});


// get request handling for serving index page
app.get("/", (req, res) => {
    let pageTitle = "Chitter";
    let cssName = "css/index.css";
    let username = "Guest";
    let email = "";
    let picture = "https://cdn2.iconfinder.com/data/icons/ios-7-icons/50/user_male2-512.png";
    // Here res.render is used twice because the scope of data variable (which has to be passed onto client side) has limited scope
    if (req.isAuthenticated()) {
        UserDetails.find({ username: req.user.username }, (err, data) => {
            if (err)
                console.log(err);
            else {
                username = data[0].name;
                picture = data[0].picture || "https://fomantic-ui.com/images/avatar/small/joe.jpg";
                email = req.user.username;

                res.render("index", {
                    pageTitle: pageTitle,
                    cssName: cssName,
                    username,
                    picture,
                    email
                });
            }

        })

    }
    else {
        res.render("index", {
            pageTitle: pageTitle,
            cssName: cssName,
            username,
            picture,
            email
        });
    }
});


// get request handling for serving home page
app.get('/home', (req, res) => {
    let pageTitle = "Chitter";
    let cssName = "css/index.css";
    let updateMessage = "";
    if (req.query.message != "") {
        updateMessage = req.query.message;
    }
    if (req.isAuthenticated()) {
        var email = req.user.username;
        var username = req.user.username;
        // Here the mongoose find functions are nested to ensure that all the variables used here have sufficient scope
        UserDetails.find({ username: req.user.username }, (err, data) => {
            if (err)
                console.log(err);
            else if (data) {
                username = data[0].name;

                UserDetails.find({}, async (err, totalData) => {
                    if (err)
                        console.log(err);
                    else if (totalData) {
                        console.log(totalData, "totalData");
                        let followUsers = totalData;
                        for (let i = 0; i < followUsers.length; i++) {
                            if (followUsers[i].username == data[0].username) {
                                followUsers.splice(i, 1);
                            }
                            for (let j = 0; j < data[0].following.length; j++) {
                                if (followUsers[i] != undefined) {
                                    console.log(followUsers[i], "followUsers[i");
                                    if (followUsers[i].username == data[0].following[j]) {
                                        followUsers.splice(i, 1);
                                    }
                                }
                            }

                        }

                        console.log(followUsers, "followUsers");

                        // picture and email are available for google and facebook auth
                        var picture = req.user.picture || "https://fomantic-ui.com/images/avatar/small/joe.jpg";
                        console.log(req.user);
                        await res.render("home", {
                            updateMessage,
                            cssName,
                            pageTitle,
                            username,
                            picture,
                            email,
                            followUsers
                        });
                    }
                });
            }
        })
    } else {
        res.redirect("/login");
    }
});


// get request handling for serving register page
app.get('/register', (req, res) => {
    let pageTitle = "Register | Chitter";
    let cssName = "css/index.css";
    let username = "Guest";
    let email = "";
    let picture = "https://cdn2.iconfinder.com/data/icons/ios-7-icons/50/user_male2-512.png";
    let updateMessage = "";
    if (req.query.message != "") {
        updateMessage = req.query.message;
    }
    if (req.isAuthenticated()) {
        username = req.user.name;
        picture = req.user.picture;
        email = req.user.email;
    }
    res.render("register", {
        pageTitle: pageTitle,
        cssName: cssName,
        username,
        picture,
        email,
        updateMessage
    });
});


// get request handling for serving login page
app.get('/login', (req, res) => {
    let pageTitle = "Login | Chitter";
    let cssName = "css/index.css";
    let username = "Guest";
    let email = "";
    let picture = "https://cdn2.iconfinder.com/data/icons/ios-7-icons/50/user_male2-512.png";
    let updateMessage = "";
    if (req.query.message != "") {
        updateMessage = req.query.message;
    }
    if (req.isAuthenticated()) {
        username = req.user.name;
        picture = req.user.picture;
        email = req.user.email;
    }
    res.render("login", {
        pageTitle: pageTitle,
        cssName: cssName,
        username,
        picture,
        email,
        updateMessage
    });
});


// serving requests from client side JS

//get request handling for finding all tweets from mongoDB
app.get("/getTweet", (req, res) => {
    console.log("get request made");
    userTweet.find({}, (err, data) => {
        if (err) console.log(err);
        else {
            UserDetails.find({ username: req.user.username }, (err, userData) => {
                if (err)
                    console.log(err);
                else {
                    var temp = [];
                    for (let i = 0; i < data.length; i++) {
                        for (let j = 0; j < userData[0].following.length; j++) {
                            if (data[i].email == userData[0].following[j]) {
                               temp.push(data[i]);
                            }
                        }
                    }
                    console.log(temp , "temp");
                    res.send(temp);
                }
            });
        }
    })
})

// Staus Checking of User
//Whether he is authenticated or not
app.get("/status", (req, res) => {
    if (req.isAuthenticated()) {
        console.log("Yeh he is authenticated");
        res.send("1");
    }
    else {
        console.log("Nope! not authenticated");
        res.send("0");
    }
})


// setting up the express server to listen on specified port

app.listen(port, () => {
    console.log(`Server running at  http://${hostname}:${port}/`);
});
