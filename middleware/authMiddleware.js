module.exports = {
    ensureAuthenticated: function(req, res, next) {
        if (req.isAuthenticated()) {
            return next();
        }
        req.session.returnTo = req.originalUrl; // Store original URL to redirect after login
        // req.flash('error_msg', 'Please log in to view that resource'); // If you use connect-flash
        res.redirect('/login-student'); // Default to student login, adjust as needed
    },
    ensureFaculty: function(req, res, next) {
        if (req.isAuthenticated() && req.user && req.user.role === 'faculty') {
            return next();
        }
        // req.flash('error_msg', 'Unauthorized: You must be a faculty member.');
        res.status(403).render('error', { title: 'Unauthorized', message: 'You are not authorized to access this page.' });
    },
    ensureStudent: function(req, res, next) {
        if (req.isAuthenticated() && req.user && req.user.role === 'student') {
            return next();
        }
        // req.flash('error_msg', 'Unauthorized: You must be a student.');
        res.status(403).render('error', { title: 'Unauthorized', message: 'You are not authorized to access this page.' });
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