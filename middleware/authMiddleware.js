// middleware/authMiddleware.js

module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.session.returnTo = req.originalUrl; // Store original URL to redirect after login
        req.session.messages = ['Please log in to view that resource.']; // Using your custom messages
        res.redirect('/login-student'); // Default to student login, adjust as needed
    },
    ensureFaculty: function(req, res, next) {
        if (req.isAuthenticated() && req.user && req.user.role === 'faculty') {
            return next();
        }
        req.session.messages = ['Unauthorized: You must be a faculty member to access this page.']; // Using your custom messages for feedback
        // Change 'error' to 'pages/error' to match your view structure
        res.status(403).render('pages/error', { title: 'Unauthorized', message: 'You are not authorized to access this page.' });
    },
    ensureStudent: function(req, res, next) {
        if (req.isAuthenticated() && req.user && req.user.role === 'student') {
            return next();
        }
        req.session.messages = ['Unauthorized: You must be a student to access this page.']; // Using your custom messages for feedback
        // Change 'error' to 'pages/error' to match your view structure
        res.status(403).render('pages/error', { title: 'Unauthorized', message: 'You are not authorized to access this page.' });
    },
    // Middleware to redirect if already logged in
    forwardAuthenticated: function(req, res, next) {
        if (!req.isAuthenticated()) {
            return next();
        }
        // Redirect based on role if already logged in
        if (req.user.role === 'faculty') {
            res.redirect('/faculty/dashboard');
        } else if (req.user.role === 'student') {
            res.redirect('/student/dashboard');
        } else {
            res.redirect('/'); // Fallback
        }
    }
};