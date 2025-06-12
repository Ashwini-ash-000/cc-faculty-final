// routes/student.js
const express = require('express');
const router = express.Router();
const { ensureStudent } = require('../middleware/authMiddleware');
const { Pool } = require('pg'); // Import Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Import models and pass the pool to them
const StudentProfile = require('../models/StudentProfile')(pool);
const Feedback = require('../models/Feedback')(pool);
const Suggestion = require('../models/Suggestion')(pool);
const FacultyProfile = require('../models/FacultyProfile')(pool); // To select faculty for feedback

// Student Dashboard
router.get('/dashboard', ensureStudent, async (req, res) => {
    try {
        const studentProfile = await StudentProfile.findByUserId(req.user.id);
        const recentFeedbacks = studentProfile ? await Feedback.findByStudentId(studentProfile.id) : [];
        const recentSuggestions = await Suggestion.findByUserId(req.user.id);

        res.render('pages/student/dashboard', {
            title: 'Student Dashboard',
            user: req.user,
            student: studentProfile,
            recentFeedbacks: recentFeedbacks,
            recentSuggestions: recentSuggestions,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Student Dashboard Error:', err);
        res.status(500).render('pages/error', { title: 'Error', message: 'Failed to load dashboard data.' });
    }
});

// Submit Feedback Page
router.get('/submit-feedback', ensureStudent, async (req, res) => {
    try {
        const faculties = await FacultyProfile.findAll();
        res.render('pages/student/submit-feedback', {
            title: 'Submit Feedback',
            user: req.user,
            faculties: faculties,
            errors: req.session.messages || []
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Submit Feedback GET Error:', err);
        res.status(500).render('pages/error', { title: 'Error', message: 'Failed to load feedback form.' });
    }
});

// Submit Feedback Handle
router.post('/submit-feedback', ensureStudent, async (req, res) => {
    const { facultyId, courseId, rating, comment } = req.body;
    let errors = [];

    if (!facultyId || !rating || !comment) {
        errors.push({ msg: 'Faculty, Rating, and Comment are required.' });
    }
    if (rating < 1 || rating > 5) {
        errors.push({ msg: 'Rating must be between 1 and 5.' });
    }

    if (errors.length > 0) {
        const faculties = await FacultyProfile.findAll();
        req.session.messages = errors;
        return res.redirect('/student/submit-feedback'); // Redirect to GET route to show errors
    }

    try {
        const studentProfile = await StudentProfile.findByUserId(req.user.id);
        if (!studentProfile) {
            errors.push({ msg: 'Student profile not found. Please complete your profile first.' });
            const faculties = await FacultyProfile.findAll();
            req.session.messages = errors;
            return res.redirect('/student/submit-feedback');
        }

        await Feedback.create(studentProfile.id, parseInt(facultyId), courseId ? parseInt(courseId) : null, parseInt(rating), comment);
        req.session.messages = ['Feedback submitted successfully!'];
        res.redirect('/student/dashboard');

    } catch (err) {
        console.error('Submit Feedback POST Error:', err);
        errors.push({ msg: 'Error submitting feedback. Please try again.' });
        const faculties = await FacultyProfile.findAll();
        req.session.messages = errors;
        res.redirect('/student/submit-feedback');
    }
});

// Submit Suggestion Page
router.get('/submit-suggestion', ensureStudent, (req, res) => {
    res.render('pages/submit-suggestion', {
        title: 'Submit Suggestion',
        user: req.user,
        errors: req.session.messages || []
    });
    req.session.messages = [];
});

// Submit Suggestion Handle
router.post('/submit-suggestion', ensureStudent, async (req, res) => {
    const { subject, description } = req.body;
    let errors = [];

    if (!subject || !description) {
        errors.push({ msg: 'Subject and Description are required.' });
    }

    if (errors.length > 0) {
        req.session.messages = errors;
        return res.redirect('/student/submit-suggestion');
    }

    try {
        await Suggestion.create(req.user.id, subject, description);
        req.session.messages = ['Suggestion submitted successfully!'];
        res.redirect('/student/dashboard');
    } catch (err) {
        console.error('Submit Suggestion POST Error:', err);
        errors.push({ msg: 'Error submitting suggestion. Please try again.' });
        req.session.messages = errors;
        res.redirect('/student/submit-suggestion');
    }
});

// Student Profile Page
router.get('/profile', ensureStudent, async (req, res) => {
    try {
        const studentProfile = await StudentProfile.findByUserId(req.user.id);
        res.render('pages/student/profile', {
            title: 'My Student Profile',
            user: req.user,
            student: studentProfile,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Student Profile Error:', err);
        res.status(500).render('pages/error', { title: 'Error', message: 'Failed to load student profile.' });
    }
});

// Edit Student Profile GET
router.get('/profile/edit', ensureStudent, async (req, res) => {
    try {
        const studentProfile = await StudentProfile.findByUserId(req.user.id);
        res.render('pages/student/edit-profile', {
            title: 'Edit Student Profile',
            user: req.user,
            student: studentProfile || {},
            errors: req.session.messages || []
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Edit Student Profile GET Error:', err);
        res.status(500).render('pages/error', { title: 'Error', message: 'Failed to load edit student profile page.' });
    }
});

// Edit Student Profile POST
router.post('/profile/edit', ensureStudent, async (req, res) => {
    const { firstName, lastName, rollNumber, major, semester, contactEmail, phoneNumber } = req.body;
    let errors = [];

    if (!firstName || !lastName || !rollNumber || !major || !semester || !contactEmail) {
        errors.push({ msg: 'Please fill all required fields.' });
    }

    if (errors.length > 0) {
        req.session.messages = errors;
        return res.redirect('/student/profile/edit');
    }

    try {
        let studentProfile = await StudentProfile.findByUserId(req.user.id);
        const data = {
            firstName, lastName, rollNumber, major, semester: parseInt(semester), contactEmail, phoneNumber
        };

        if (studentProfile) {
            await StudentProfile.update(req.user.id, data);
            req.session.messages = ['Profile updated successfully.'];
        } else {
            await StudentProfile.create(req.user.id, data.firstName, data.lastName, data.rollNumber, data.major, data.semester, data.contactEmail, data.phoneNumber);
            req.session.messages = ['Profile created successfully.'];
        }
        res.redirect('/student/profile');

    } catch (err) {
        console.error('Student Profile Update Error:', err);
        if (err.code === '23505') {
            if (err.detail.includes('roll_number')) {
                errors.push({ msg: `Roll Number '${rollNumber}' is already in use by another student.` });
            } else if (err.detail.includes('contact_email')) {
                errors.push({ msg: `Contact Email '${contactEmail}' is already in use by another student.` });
            } else {
                errors.push({ msg: 'A unique field is duplicated. Please check your inputs.' });
            }
        } else {
            errors.push({ msg: 'An error occurred while saving your profile. Please try again.' });
        }
        req.session.messages = errors;
        res.redirect('/student/profile/edit');
    }
});

module.exports = router;