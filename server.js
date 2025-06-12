// server.js

require('dotenv').config(); // Load environment variables from .env file
const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { Pool } = require('pg');
const session = require('express-session');
const bcrypt = require('bcrypt'); // Make sure to use 'bcrypt' or 'bcryptjs' consistently

// --- Middleware ---
// Serve static files from the 'public' directory
app.use(express.static('public'));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));
// Parse JSON bodies (for API requests)
app.use(express.json());

// Session management
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey', // Use a strong, unique secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production', maxAge: 24 * 60 * 60 * 1000 } // 24 hours
}));

// --- View engine setup ---
app.set('view engine', 'ejs');
app.set('views', 'views'); // EJS templates will be in the 'views' directory

// --- Database connection ---
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // Required for Render PostgreSQL connection
});

// Test database connection
pool.connect((err, client, done) => {
  if (err) {
    console.error('Database connection error:', err.message);
    return;
  }
  console.log('Connected to PostgreSQL database!');
  done(); // Release the client back to the pool
});

// --- Authentication & Authorization Middleware ---
// Middleware to check if user is authenticated at all
const isAuthenticated = (req, res, next) => {
    if (req.session.user && req.session.user.id) {
        // User is authenticated, proceed
        next();
    } else {
        // User is not authenticated, redirect to appropriate login page
        // Store the original URL to redirect back after successful login
        req.session.redirectTo = req.originalUrl;
        res.redirect('/login/student'); // Default to student login for unauthenticated users
    }
};

// Middleware to check if the authenticated user is a student
const isStudent = (req, res, next) => {
    if (req.session.user && req.session.user.type === 'student') {
        next();
    } else {
        // Not a student, redirect to student login with an error message
        req.session.errorMessage = 'Access denied: Students only.';
        res.redirect('/login/student');
    }
};

// Middleware to check if the authenticated user is faculty
const isFaculty = (req, res, next) => {
    if (req.session.user && req.session.user.type === 'faculty') {
        next();
    } else {
        // Not faculty, redirect to faculty login with an error message
        req.session.errorMessage = 'Access denied: Faculty only.';
        res.redirect('/login/faculty');
    }
};

// --- Routes ---

// Home Page
app.get('/', (req, res) => {
  res.render('pages/home', { user: req.session.user }); // Pass user session info
});

// Student Login Page
app.get('/login/student', (req, res) => {
    const error = req.query.error || req.session.errorMessage; // Get error from query or session
    const success = req.query.success || req.session.successMessage; // Get success from query or session
    const redirectTo = req.session.redirectTo; // Get redirect URL if any

    delete req.session.errorMessage; // Clear after retrieving
    delete req.session.successMessage;
    delete req.session.redirectTo;

    res.render('pages/login-student', {
        title: 'Student Login',
        error: error,
        success: success,
        redirectTo: redirectTo // Pass redirect path to the EJS
    });
});

// Student Login POST
app.post('/login/student', async (req, res) => {
    const { email, password } = req.body;
    const redirectTo = req.session.redirectTo || '/student/dashboard'; // Get stored redirect path or default

    try {
        const result = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
        const student = result.rows[0];

        if (student && await bcrypt.compare(password, student.password)) {
            req.session.studentId = student.id; // Specific ID for student
            req.session.user = { id: student.id, name: student.name, type: 'student' }; // Generic user object
            res.redirect(redirectTo); // Redirect to stored path
        } else {
            req.session.errorMessage = 'Invalid email or password';
            res.redirect('/login/student'); // Redirect back to login with error
        }
    } catch (err) {
        console.error('Error during student login:', err);
        req.session.errorMessage = 'Server error during login. Please try again.';
        res.redirect('/login/student'); // Redirect back to login with error
    }
});

// Student Registration Page
app.get('/register/student', (req, res) => {
    const error = req.query.error || req.session.errorMessage;
    delete req.session.errorMessage;
    res.render('pages/register-student', { title: 'Student Registration', error: error });
});

// Student Registration POST
app.post('/register/student', async (req, res) => {
    const { name, email, roll_number, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password
        await pool.query(
            'INSERT INTO students (name, email, roll_number, password) VALUES ($1, $2, $3, $4)',
            [name, email, roll_number, hashedPassword]
        );
        req.session.successMessage = 'Registration successful! Please login.';
        res.redirect('/login/student'); // Redirect to login page after successful registration
    } catch (err) {
        console.error('Error during student registration:', err);
        let errorMessage = 'Registration failed. Please try again.';
        if (err.code === '23505') { // PostgreSQL unique violation error code
            if (err.detail.includes('email')) {
                errorMessage = 'Email already registered.';
            } else if (err.detail.includes('roll_number')) {
                errorMessage = 'Roll Number already registered.';
            }
        }
        req.session.errorMessage = errorMessage;
        res.redirect('/register/student'); // Redirect back to registration with error
    }
});

// Faculty Login Page
app.get('/login/faculty', (req, res) => {
    const error = req.query.error || req.session.errorMessage;
    const success = req.query.success || req.session.successMessage;
    const redirectTo = req.session.redirectTo;

    delete req.session.errorMessage;
    delete req.session.successMessage;
    delete req.session.redirectTo;

    res.render('pages/login-faculty', {
        title: 'Faculty Login',
        error: error,
        success: success,
        redirectTo: redirectTo
    });
});

// Faculty Login POST
app.post('/login/faculty', async (req, res) => {
    const { email, password } = req.body;
    const redirectTo = req.session.redirectTo || '/faculty/dashboard';

    try {
        const result = await pool.query('SELECT * FROM faculty WHERE email = $1', [email]);
        const faculty = result.rows[0];

        if (faculty && await bcrypt.compare(password, faculty.password)) {
            req.session.facultyId = faculty.id; // Specific ID for faculty
            req.session.user = { id: faculty.id, name: faculty.name, type: 'faculty' }; // Generic user object
            res.redirect(redirectTo);
        } else {
            req.session.errorMessage = 'Invalid email or password';
            res.redirect('/login/faculty');
        }
    } catch (err) {
        console.error('Error during faculty login:', err);
        req.session.errorMessage = 'Server error during login. Please try again.';
        res.redirect('/login/faculty');
    }
});

// Faculty Registration Page
app.get('/register/faculty', (req, res) => {
    const error = req.query.error || req.session.errorMessage;
    delete req.session.errorMessage;
    res.render('pages/register-faculty', { title: 'Faculty Registration', error: error });
});

// Faculty Registration POST
app.post('/register/faculty', async (req, res) => {
    const { name, email, department, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO faculty (name, email, department, password) VALUES ($1, $2, $3, $4)',
            [name, email, department, hashedPassword]
        );
        req.session.successMessage = 'Faculty registration successful! Please login.';
        res.redirect('/login/faculty');
    } catch (err) {
        console.error('Error during faculty registration:', err);
        let errorMessage = 'Registration failed. Please try again.';
        if (err.code === '23505' && err.detail.includes('email')) {
            errorMessage = 'Email already registered.';
        }
        req.session.errorMessage = errorMessage;
        res.redirect('/register/faculty');
    }
});

// Basic Logout Route
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            console.error('Error destroying session:', err);
            return res.status(500).send('Could not log out.');
        }
        res.redirect('/');
    });
});

// --- Protected Routes ---

// Student Dashboard (requires authentication and student role)
app.get('/student/dashboard', isAuthenticated, isStudent, (req, res) => {
    const success = req.session.successMessage;
    const error = req.session.errorMessage;
    delete req.session.successMessage;
    delete req.session.errorMessage;
    res.render('pages/student/dashboard', {
        title: 'Student Dashboard',
        user: req.session.user, // Pass the entire user object
        success: success,
        error: error
    });
});

// Submit Feedback (Student Only) (requires authentication and student role)
app.get('/submit-feedback', isAuthenticated, isStudent, async (req, res) => {
    const success = req.session.successMessage;
    const error = req.session.errorMessage;
    delete req.session.successMessage;
    delete req.session.errorMessage;

    try {
        // Fetch all faculty names for the dropdown
        const result = await pool.query('SELECT id, name, department FROM faculty ORDER BY name');
        const facultyList = result.rows;
        res.render('pages/student/submit-feedback', {
            title: 'Submit Feedback',
            user: req.session.user,
            facultyList: facultyList,
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching faculty for feedback form:', err);
        req.session.errorMessage = 'Could not load faculty list. Please try again later.';
        res.redirect('/student/dashboard'); // Redirect if faculty list cannot be fetched
    }
});

app.post('/submit-feedback', isAuthenticated, isStudent, async (req, res) => {
    const { facultyId, rating, comments } = req.body;
    const studentId = req.session.studentId;

    try {
        await pool.query(
            'INSERT INTO feedback (faculty_id, student_id, rating, comments) VALUES ($1, $2, $3, $4)',
            [facultyId, studentId, rating, comments]
        );
        req.session.successMessage = 'Feedback submitted successfully!';
        res.redirect('/student/dashboard'); // Redirect to student dashboard
    } catch (err) {
        console.error('Error submitting feedback:', err);
        req.session.errorMessage = 'Failed to submit feedback. Please try again.';
        res.redirect('/student/dashboard'); // Redirect with error
    }
});

// Faculty Dashboard (NEW - requires authentication and faculty role)
app.get('/faculty/dashboard', isAuthenticated, isFaculty, async (req, res) => {
    const facultyId = req.session.facultyId;
    const success = req.session.successMessage;
    const error = req.session.errorMessage;
    delete req.session.successMessage;
    delete req.session.errorMessage;

    try {
        // Fetch feedback specifically for this faculty
        const result = await pool.query(
            `SELECT f.rating, f.comments, f.created_at, s.name as student_name, s.roll_number
             FROM feedback f
             JOIN students s ON f.student_id = s.id
             WHERE f.faculty_id = $1
             ORDER BY f.created_at DESC`,
            [facultyId]
        );
        const feedbackList = result.rows;

        res.render('pages/faculty/dashboard', {
            title: 'Faculty Dashboard',
            user: req.session.user,
            feedbackList: feedbackList,
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching faculty feedback:', err);
        req.session.errorMessage = 'Could not load feedback. Please try again later.';
        res.redirect('/faculty/dashboard'); // Redirect if feedback cannot be fetched
    }
});


// Submit Suggestion (Accessible to both authenticated Student and Faculty)
app.get('/submit-suggestion', isAuthenticated, (req, res) => {
    const success = req.session.successMessage;
    const error = req.session.errorMessage;
    delete req.session.successMessage;
    delete req.session.errorMessage;
    res.render('pages/submit-suggestion', {
        title: 'Submit Suggestion',
        user: req.session.user,
        success: success,
        error: error
    });
});

app.post('/submit-suggestion', isAuthenticated, async (req, res) => {
    const { suggestion } = req.body;
    const userId = req.session.user.id;
    const userType = req.session.user.type; // 'student' or 'faculty'

    try {
        await pool.query(
            'INSERT INTO suggestions (user_id, user_type, suggestion) VALUES ($1, $2, $3)',
            [userId, userType, suggestion]
        );
        req.session.successMessage = 'Suggestion submitted successfully!';
        // Redirect based on user type
        res.redirect(userType === 'student' ? '/student/dashboard' : '/faculty/dashboard');
    } catch (err) {
        console.error('Error submitting suggestion:', err);
        req.session.errorMessage = 'Failed to submit suggestion. Please try again.';
        res.redirect(userType === 'student' ? '/student/dashboard' : '/faculty/dashboard');
    }
});

// View All Suggestions (Faculty Only) (requires authentication and faculty role)
app.get('/view-suggestions', isAuthenticated, isFaculty, async (req, res) => {
    const success = req.session.successMessage;
    const error = req.session.errorMessage;
    delete req.session.successMessage;
    delete req.session.errorMessage;

    try {
        const result = await pool.query('SELECT * FROM suggestions ORDER BY created_at DESC');
        const suggestions = result.rows;
        res.render('pages/faculty/view-suggestions', { // You'll need to create this EJS file
            title: 'All Suggestions',
            user: req.session.user,
            suggestions: suggestions,
            success: success,
            error: error
        });
    } catch (err) {
        console.error('Error fetching suggestions:', err);
        req.session.errorMessage = 'Could not load suggestions. Please try again later.';
        res.redirect('/faculty/dashboard'); // Redirect if suggestions cannot be fetched
    }
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});


const express = require('express');
const app = express();
const path = require('path');

const PORT = process.env.PORT || 3000;

// Set EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // Set the views directory

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Define a route to render the index page
app.get('/', (req, res) => {
    // Data to pass to the EJS template
    const data = {
        userName: 'John Doe'
    };
    res.render('index', data);
});

// Example for an about page
app.get('/about', (req, res) => {
    res.render('about', { title: 'About Us', pageContent: 'This is the about page content.' });
});


// Add a simple 'about.ejs' for testing (create this file in views/)
// views/about.ejs
/*
<%- include('./partials/head', { title: 'About Us' }); %>
    <header>
        <h1>About Us</h1>
        <nav>
            <ul>
                <li><a href="/">Home</a></li>
                <li><a href="/about">About</a></li>
                <li><a href="/contact">Contact</a></li>
            </ul>
        </nav>
    </header>
    <main>
        <p><%= pageContent %></p>
    </main>
<%- include('./partials/foot'); %>
*/

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});