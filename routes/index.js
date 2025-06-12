// routes/index.js
const express = require('express');
const router = express.Router();
const passport = require('passport'); // Needed for passport.authenticate
const { forwardAuthenticated } = require('../middleware/authMiddleware'); // Middleware
const { Pool } = require('pg'); // Import Pool for database connection in this module

// Re-instantiate the database pool for this route file
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Import models and pass the pool to them
const User = require('../models/User')(pool);
const FacultyProfile = require('../models/FacultyProfile')(pool);
const StudentProfile = require('../models/StudentProfile')(pool);

// Homepage
router.get('/', (req, res) => {
    res.render('pages/home', {
        title: 'Welcome to the Portal',
        user: req.user // Pass current user for conditional rendering in EJS
    });
});

// --- Login Routes ---

// Faculty Login Page
router.get('/login-faculty', forwardAuthenticated, (req, res) => {
    res.render('pages/login-faculty', {
        title: 'Faculty Login',
        errors: req.session.messages || [] // Ensure it's an array, even if empty
    });
    req.session.messages = []; // Clear messages after display
});

// Faculty Login Handle
router.post('/login-faculty', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) {
            req.session.messages = [info.message]; // Store message for display
            return res.redirect('/login-faculty');
        }
        if (user.role !== 'faculty') { // Ensure user has a 'role' property from your User model
            req.session.messages = ['Only faculty can login here.'];
            return res.redirect('/login-faculty');
        }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            const redirectUrl = req.session.returnTo || '/faculty/dashboard';
            delete req.session.returnTo; // Clear stored URL
            return res.redirect(redirectUrl);
        });
    })(req, res, next);
});


// Student Login Page
router.get('/login-student', forwardAuthenticated, (req, res) => {
    res.render('pages/login-student', {
        title: 'Student Login',
        errors: req.session.messages || []
    });
    req.session.messages = [];
});

// Student Login Handle
router.post('/login-student', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) { return next(err); }
        if (!user) {
            req.session.messages = [info.message];
            return res.redirect('/login-student');
        }
        if (user.role !== 'student') { // Ensure user has a 'role' property
            req.session.messages = ['Only students can login here.'];
            return res.redirect('/login-student');
        }
        req.logIn(user, (err) => {
            if (err) { return next(err); }
            const redirectUrl = req.session.returnTo || '/student/dashboard';
            delete req.session.returnTo;
            return res.redirect(redirectUrl);
        });
    })(req, res, next);
});

// --- Register Routes ---

// Faculty Register Page
router.get('/register-faculty', forwardAuthenticated, (req, res) => {
    res.render('pages/register-faculty', {
        title: 'Faculty Registration',
        errors: req.session.messages || [] // Use req.session.messages for errors too
    });
    req.session.messages = [];
});

// Faculty Register Handle
router.post('/register-faculty', async (req, res) => {
    const { username, email, password, password2, firstName, lastName, employeeId, department, designation } = req.body;
    let errors = [];

    // Basic validation
    if (!username || !email || !password || !password2 || !firstName || !lastName || !employeeId || !department || !designation) {
        errors.push({ msg: 'Please fill all required fields.' });
    }
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match.' });
    }
    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters.' });
    }

    if (errors.length > 0) {
        req.session.messages = errors; // Store errors in session for redirect-and-display
        return res.redirect('/register-faculty'); // Redirect to GET route to display errors
    }

    try {
        const existingUser = await User.findByEmail(email); // Use User.findByEmail directly
        if (existingUser) {
            errors.push({ msg: 'Email is already registered.' });
            req.session.messages = errors;
            return res.redirect('/register-faculty');
        }
        const existingEmployee = await FacultyProfile.findByEmployeeId(employeeId); // Use FacultyProfile.findByEmployeeId directly
        if (existingEmployee) {
            errors.push({ msg: 'Employee ID is already registered.' });
            req.session.messages = errors;
            return res.redirect('/register-faculty');
        }

        const newUser = await User.create(username, email, password, 'faculty');
        await FacultyProfile.create(
            newUser.id,
            firstName,
            lastName,
            employeeId,
            department,
            designation,
            email,
            null, // phone_number
            null, // office_location
            [],   // research_interests
            null  // office_hours
        );

        req.session.messages = ['Faculty account registered successfully! Please login.'];
        res.redirect('/login-faculty');

    } catch (err) {
        console.error('Faculty Registration Error:', err);
        errors.push({ msg: 'Server error during registration. Please try again.' });
        req.session.messages = errors;
        res.redirect('/register-faculty'); // Redirect back with error
    }
});

// Student Register Page
router.get('/register-student', forwardAuthenticated, (req, res) => {
    res.render('pages/register-student', {
        title: 'Student Registration',
        errors: req.session.messages || []
    });
    req.session.messages = [];
});

// Student Register Handle
router.post('/register-student', async (req, res) => {
    const { username, email, password, password2, firstName, lastName, rollNumber, major, semester } = req.body;
    let errors = [];

    // Basic validation
    if (!username || !email || !password || !password2 || !firstName || !lastName || !rollNumber || !major || !semester) {
        errors.push({ msg: 'Please fill all required fields.' });
    }
    if (password !== password2) {
        errors.push({ msg: 'Passwords do not match.' });
    }
    if (password.length < 6) {
        errors.push({ msg: 'Password must be at least 6 characters.' });
    }

    if (errors.length > 0) {
        req.session.messages = errors;
        return res.redirect('/register-student');
    }

    try {
        const existingUser = await User.findByEmail(email);
        if (existingUser) {
            errors.push({ msg: 'Email is already registered.' });
            req.session.messages = errors;
            return res.redirect('/register-student');
        }
        const existingStudent = await StudentProfile.findByRollNumber(rollNumber);
        if (existingStudent) {
            errors.push({ msg: 'Roll Number is already registered.' });
            req.session.messages = errors;
            return res.redirect('/register-student');
        }

        const newUser = await User.create(username, email, password, 'student');
        await StudentProfile.create(
            newUser.id,
            firstName,
            lastName,
            rollNumber,
            major,
            parseInt(semester),
            email,
            null
        );

        req.session.messages = ['Student account registered successfully! Please login.'];
        res.redirect('/login-student');

    } catch (err) {
        console.error('Student Registration Error:', err);
        errors.push({ msg: 'Server error during registration. Please try again.' });
        req.session.messages = errors;
        res.redirect('/register-student');
    }
});


// Logout Handle
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        req.session.messages = ['You have been logged out.'];
        res.redirect('/');
    });
});

module.exports = router;