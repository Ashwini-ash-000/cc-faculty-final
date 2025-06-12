// routes/faculty.js
const express = require('express');
const router = express.Router();
const { ensureFaculty } = require('../middleware/authMiddleware');
const { Pool } = require('pg'); // Import Pool
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Import models and pass the pool to them
const FacultyProfile = require('../models/FacultyProfile')(pool);
const Feedback = require('../models/Feedback')(pool);
const StudentProfile = require('../models/StudentProfile')(pool); // To count students

// Faculty Dashboard
router.get('/dashboard', ensureFaculty, async (req, res) => {
    try {
        const facultyProfile = await FacultyProfile.findByUserId(req.user.id);
        const totalStudentsCount = await StudentProfile.countAll();
        const recentFeedbacks = facultyProfile ? await Feedback.findByFacultyId(facultyProfile.id) : [];

        res.render('pages/faculty/dashboard', {
            title: 'Faculty Dashboard',
            user: req.user,
            faculty: facultyProfile,
            totalStudents: totalStudentsCount,
            recentFeedbacks: recentFeedbacks || [],
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Faculty Dashboard Error:', err);
        res.status(500).render('pages/error', { title: 'Error', message: 'Failed to load dashboard data.' }); // Adjusted path for error.ejs
    }
});

// Faculty Profile Page
router.get('/profile', ensureFaculty, async (req, res) => {
    try {
        const facultyProfile = await FacultyProfile.findByUserId(req.user.id);
        res.render('pages/faculty/profile', {
            title: 'My Profile',
            user: req.user,
            faculty: facultyProfile,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Faculty Profile Error:', err);
        res.status(500).render('pages/error', { title: 'Error', message: 'Failed to load profile data.' });
    }
});

// Edit Faculty Profile GET
router.get('/profile/edit', ensureFaculty, async (req, res) => {
    try {
        const facultyProfile = await FacultyProfile.findByUserId(req.user.id);
        res.render('pages/faculty/edit-profile', {
            title: 'Edit Faculty Profile',
            user: req.user,
            faculty: facultyProfile || {},
            errors: req.session.messages || []
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Edit Faculty Profile GET Error:', err);
        res.status(500).render('pages/error', { title: 'Error', message: 'Failed to load edit profile page.' });
    }
});

// Edit Faculty Profile POST
router.post('/profile/edit', ensureFaculty, async (req, res) => {
    const { firstName, lastName, employeeId, department, designation, contactEmail, phoneNumber, officeLocation, researchInterests, officeHours } = req.body;
    let errors = [];

    // Basic validation
    if (!firstName || !lastName || !employeeId || !department || !designation || !contactEmail) {
        errors.push({ msg: 'Please fill all required fields.' });
    }

    if (errors.length > 0) {
        req.session.messages = errors;
        return res.redirect('/faculty/profile/edit');
    }

    try {
        let facultyProfile = await FacultyProfile.findByUserId(req.user.id);
        const data = {
            firstName, lastName, employeeId, department, designation, contactEmail, phoneNumber, officeLocation,
            researchInterests: researchInterests ? researchInterests.split(',').map(s => s.trim()) : [],
            officeHours
        };

        if (facultyProfile) {
            await FacultyProfile.update(req.user.id, data);
            req.session.messages = ['Profile updated successfully.'];
        } else {
            await FacultyProfile.create(req.user.id, data.firstName, data.lastName, data.employeeId, data.department, data.designation, data.contactEmail, data.phoneNumber, data.officeLocation, data.researchInterests, data.officeHours);
            req.session.messages = ['Profile created successfully.'];
        }
        res.redirect('/faculty/profile');

    } catch (err) {
        console.error('Faculty Profile Update Error:', err);
        if (err.code === '23505') {
            if (err.detail.includes('employee_id')) {
                errors.push({ msg: `Employee ID '${employeeId}' is already in use by another faculty.` });
            } else if (err.detail.includes('contact_email')) {
                errors.push({ msg: `Contact Email '${contactEmail}' is already in use by another faculty.` });
            } else {
                errors.push({ msg: 'A unique field is duplicated. Please check your inputs.' });
            }
        } else {
            errors.push({ msg: 'An error occurred while saving your profile. Please try again.' });
        }
        req.session.messages = errors;
        res.redirect('/faculty/profile/edit');
    }
});

// Example: View Feedback for Faculty
router.get('/feedback', ensureFaculty, async (req, res) => {
    try {
        const facultyProfile = await FacultyProfile.findByUserId(req.user.id);
        const feedbacks = facultyProfile ? await Feedback.findByFacultyId(facultyProfile.id) : [];

        res.render('pages/faculty/feedback', {
            title: 'My Feedback',
            user: req.user,
            feedbacks: feedbacks,
            messages: req.session.messages || []
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Faculty Feedback Error:', err);
        res.status(500).render('pages/error', { title: 'Error', message: 'Failed to load feedback.' });
    }
});

module.exports = router;