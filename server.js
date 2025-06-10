// server.js
require('dotenv').config(); // Load environment variables from .env file

const express = require('express');
const app = express();
const port = process.env.PORT || 3000;
const { Pool } = require('pg');
const session = require('express-session'); // Added for session management
const bcrypt = require('bcryptjs'); // Added for password hashing

// --- Middleware ---
// Serve static files from the 'public' directory
app.use(express.static('public'));

// Parse URL-encoded bodies (for form submissions)
app.use(express.urlencoded({ extended: true }));

// Parse JSON bodies (for API requests)
app.use(express.json());

// Session management
// Configure session middleware. In a production environment, you would use a more robust session store.
app.use(session({
    secret: process.env.SESSION_SECRET || 'supersecretkey', // Use a strong, unique secret
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' } // Use secure cookies in production
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

// --- Routes ---

// Home Page
app.get('/', (req, res) => {
  res.render('pages/home', { user: req.session.user }); // Pass user session info
});

// Example route for student login (you'll expand this later)
app.get('/login/student', (req, res) => {
    res.render('pages/login-student'); // Assuming you have a login-student.ejs
});

// Example route for faculty login
app.get('/login/faculty', (req, res) => {
    res.render('pages/login-faculty'); // Assuming you have a login-faculty.ejs
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


// Add placeholder pages for now
app.get('/submit-feedback', (req, res) => {
    if (!req.session.studentId) {
        return res.redirect('/login/student?redirect=/submit-feedback'); // Redirect if not logged in
    }
    // In a real app, fetch faculty list for dropdown
    res.render('pages/student/submit-feedback', { success: req.query.success, error: req.query.error });
});

app.get('/submit-suggestion', (req, res) => {
    if (!req.session.userId) { // Check for either student or faculty
        return res.redirect('/login/student?redirect=/submit-suggestion'); // Or faculty, depending on flow
    }
    res.render('pages/submit-suggestion', { success: req.query.success, error: req.query.error });
});

app.get('/student/dashboard', (req, res) => {
    if (!req.session.studentId) {
        return res.redirect('/login/student?redirect=/student/dashboard');
    }
    res.render('pages/student/dashboard', { success: req.query.success, error: req.query.error });
});


// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});