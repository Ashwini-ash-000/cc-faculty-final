const express = require('express');
const router = express.Router();
const { ensureFaculty } = require('../middleware/authMiddleware');

// Import models
const FacultyProfile = require('../models/FacultyProfile');
const Feedback = require('../models/Feedback');
const StudentProfile = require('../models/StudentProfile'); // To count students

// Faculty Dashboard
router.get('/dashboard', ensureFaculty, async (req, res) => {
    try {
        const facultyProfile = await FacultyProfile().findByUserId(req.user.id);
        const totalStudentsCount = await StudentProfile().countAll(); // Example metric
        const recentFeedbacks = await Feedback().findByFacultyId(facultyProfile ? facultyProfile.id : -1); // Pass faculty_profile_id or -1 if not found

        res.render('pages/faculty/dashboard', {
            title: 'Faculty Dashboard',
            user: req.user,
            faculty: facultyProfile,
            totalStudents: totalStudentsCount,
            recentFeedbacks: recentFeedbacks || []
        });
    } catch (err) {
        console.error('Faculty Dashboard Error:', err);
        res.status(500).render('error', { title: 'Error', message: 'Failed to load dashboard data.' });
    }
});

// Faculty Profile Page
router.get('/profile', ensureFaculty, async (req, res) => {
    try {
        const facultyProfile = await FacultyProfile().findByUserId(req.user.id);
        res.render('pages/faculty/profile', {
            title: 'My Profile',
            user: req.user,
            faculty: facultyProfile,
            messages: req.session.messages // For success/error messages
        });
        req.session.messages = [];
    } catch (err) {
        console.error('Faculty Profile Error:', err);
        res.status(500).render('error', { title: 'Error', message: 'Failed to load profile data.' });
    }
});

// Edit Faculty Profile GET
router.get('/profile/edit', ensureFaculty, async (req, res) => {
    try {
        const facultyProfile = await FacultyProfile().findByUserId(req.user.id);
        res.render('pages/faculty/edit-profile', {
            title: 'Edit Faculty Profile',
            user: req.user,
            faculty: facultyProfile || {}, // Pass empty object if no profile yet
            errors: []
        });
    } catch (err) {
        console.error('Edit Faculty Profile GET Error:', err);
        res.status(500).render('error', { title: 'Error', message: 'Failed to load edit profile page.' });
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
    // Add more specific validation if needed (e.g., email format, phone number format)

    if (errors.length > 0) {
        return res.render('pages/faculty/edit-profile', {
            title: 'Edit Faculty Profile',
            user: req.user,
            faculty: req.body, // Populate form with previous input
            errors
        });
    }

    try {
        let facultyProfile = await FacultyProfile().findByUserId(req.user.id);
        const data = {
            firstName, lastName, employeeId, department, designation, contactEmail, phoneNumber, officeLocation,
            researchInterests: researchInterests ? researchInterests.split(',').map(s => s.trim()) : [],
            officeHours
        };

        if (facultyProfile) {
            // Update existing profile
            await FacultyProfile().update(req.user.id, data);
            req.session.messages = ['Profile updated successfully.'];
        } else {
            // Create new profile (if not exists yet)
            await FacultyProfile().create(req.user.id, ...Object.values(data)); // Pass all data values in order
            req.session.messages = ['Profile created successfully.'];
        }
        res.redirect('/faculty/profile');

    } catch (err) {
        console.error('Faculty Profile Update Error:', err);
        if (err.code === '23505') { // PostgreSQL unique violation error code
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
        res.render('pages/faculty/edit-profile', {
            title: 'Edit Faculty Profile',
            user: req.user,
            faculty: req.body,
            errors
        });
    }
});

// Example: View Feedback for Faculty (this needs more logic to link to courses/students)
router.get('/feedback', ensureFaculty, async (req, res) => {
    try {
        const facultyProfile = await FacultyProfile().findByUserId(req.user.id);
        const feedbacks = facultyProfile ? await Feedback().findByFacultyId(facultyProfile.id) : [];

        res.render('pages/faculty/feedback', {
            title: 'My Feedback',
            user: req.user,
            feedbacks: feedbacks
        });
    } catch (err) {
        console.error('Faculty Feedback Error:', err);
        res.status(500).render('error', { title: 'Error', message: 'Failed to load feedback.' });
    }
});


module.exports = router;