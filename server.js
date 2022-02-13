const express = require("express");
const { pool } = require("./dbConfig");
const bcrypt = require("bcrypt");
const passport = require("passport");
const flash = require("express-flash");
const session = require("express-session");
require("dontenv").config();
const app = express();

const PORT = process.env.PORT || 3000;

const initializePassport = require("./passportConfig");

initializePassport(passport);

app.use(express.urlencoded({ extended: false}));
app.set("view engine", "ejs");

app.use(
    session({
      secret: process.env.SESSION_SECRET,
      resave: false,
      saveUninitialized: false
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());
  app.use(flash());


app.get("/", (req, res) => {
    res.render('index');
});

app.get('/users/register', checkAuthenticated, (req, res) => {
    res.render("register.ejs");
});

app.get('/users/login', checkAuthenticated, (req, res) => {
    console.log(req.session.flash.error);
    res.render("login.ejs");
});

app.get('/users/dashboard', checkNotAuthenticated, (req, res) => {
    console.log(req.isAuthenticated());
    res.render("dashboard", { user: req.user.name });
});

app.get("/users/logout", (req, res) => {
    req.logout();
    res.render("index", { message: "You have logged out successfully" });
  });

app.post('/users/register', async (req, res) => {
    let { name, email, password, password2 } = req.body;

    let errors = [];

    console.log({
        name,
        email,
        password,
        password2
    });

    if  (!name || !email || !password || !password2) {
        errors.push({ message: "All Fields Required" });
    }

    if(password.length < 6) {
        errors.push({ message: "Password Minimum: 6 Characters" });
    }

    if(password != password2) {
        errors.push({ message: "Passwords Do Not Match" });
    }

    if(errors.length > 0) {
        //re-renders page if there are errors
        res.render("register", { errors, name, email, password, password2 });
    } else {
      hashedPassword = await bcrypt.hash(password, 10);
      console.log(hashedPassword);
      // Validation passed
      pool.query(
        `SELECT * FROM users
          WHERE email = $1`,
        [email],
        (err, results) => {
          if (err) {
            console.log(err);
          }
          console.log(results.rows);
  
          if (results.rows.length > 0) {
            return res.render("register", {
              message: "Account Already Exists - Please Login or Use a New E-mail"
            });
          } else {
            pool.query(
              `INSERT INTO users (name, email, password)
                  VALUES ($1, $2, $3)
                  RETURNING id, password`,
              [name, email, hashedPassword],
              (err, results) => {
                if (err) {
                  throw err;
                }
                console.log(results.rows);
                req.flash("success_msg", "Registered! Please Login");
                res.redirect("/users/login");
              }
            );
          }
        }
      );
    }
});


app.post(
    "/users/login",
    passport.authenticate("local", {
      successRedirect: "/users/dashboard",
      failureRedirect: "/users/login",
      failureFlash: true
    })
  );
  
  function checkAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return res.redirect("/users/dashboard");
    }
    next();
  }
  
  function checkNotAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
      return next();
    }
    res.redirect("/users/login");
  }
  
  app.listen(PORT, () => {
    console.log(`This Server is Running on Port ${PORT}`);
  });
  

