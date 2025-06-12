const express = require('express');
const router = express.Router();
const passport = require('passport');
const { forwardAuthenticated } = require('../middleware/authMiddleware');

// Import models to use in routes (ensure you pass the pool to them in app.js)
const User = require('../models/User');
const FacultyProfile = require('../models/FacultyProfile');
const StudentProfile = require('../models/StudentProfile');

// Homepage
router.get('/', (req, res) => {
    res.render('pages/home', {
        title: 'Welcome to the Portal'
    });
});

// --- Login Routes ---

// Faculty Login Page
router.get('/login-faculty', forwardAuthenticated, (req, res) => {
    res.render('pages/login-faculty', {
        title: 'Faculty Login',
        errors: req.session.messages // Passport messages are stored here
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
        if (user.role !== 'faculty') {
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
        errors: req.session.messages
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
        if (user.role !== 'student') {
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
        errors: []
    });
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
        return res.render('pages/register-faculty', { title: 'Faculty Registration', errors, ...req.body });
    }

    try {
        const existingUser = await User().findByEmail(email);
        if (existingUser) {
            errors.push({ msg: 'Email is already registered.' });
            return res.render('pages/register-faculty', { title: 'Faculty Registration', errors, ...req.body });
        }
        const existingEmployee = await FacultyProfile().findByEmployeeId(employeeId);
        if (existingEmployee) {
            errors.push({ msg: 'Employee ID is already registered.' });
            return res.render('pages/register-faculty', { title: 'Faculty Registration', errors, ...req.body });
        }

        const newUser = await User().create(username, email, password, 'faculty');
        await FacultyProfile().create(
            newUser.id,
            firstName,
            lastName,
            employeeId,
            department,
            designation,
            email, // Use user email as contact email for simplicity initially
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
        res.render('pages/register-faculty', { title: 'Faculty Registration', errors, ...req.body });
    }
});

// Student Register Page
router.get('/register-student', forwardAuthenticated, (req, res) => {
    res.render('pages/register-student', {
        title: 'Student Registration',
        errors: []
    });
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
        return res.render('pages/register-student', { title: 'Student Registration', errors, ...req.body });
    }

    try {
        const existingUser = await User().findByEmail(email);
        if (existingUser) {
            errors.push({ msg: 'Email is already registered.' });
            return res.render('pages/register-student', { title: 'Student Registration', errors, ...req.body });
        }
        const existingStudent = await StudentProfile().findByRollNumber(rollNumber);
        if (existingStudent) {
            errors.push({ msg: 'Roll Number is already registered.' });
            return res.render('pages/register-student', { title: 'Student Registration', errors, ...req.body });
        }

        const newUser = await User().create(username, email, password, 'student');
        await StudentProfile().create(
            newUser.id,
            firstName,
            lastName,
            rollNumber,
            major,
            parseInt(semester),
            email, // Use user email as contact email
            null   // phone_number
        );

        req.session.messages = ['Student account registered successfully! Please login.'];
        res.redirect('/login-student');

    } catch (err) {
        console.error('Student Registration Error:', err);
        errors.push({ msg: 'Server error during registration. Please try again.' });
        res.render('pages/register-student', { title: 'Student Registration', errors, ...req.body });
    }
});


// Logout Handle
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) { return next(err); }
        // req.flash('success_msg', 'You are logged out');
        req.session.messages = ['You have been logged out.'];
        res.redirect('/');
    });
});

module.exports = router;