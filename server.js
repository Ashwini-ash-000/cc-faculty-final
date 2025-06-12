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

// server.js (add these after the existing Basic Logout Route)

// Student Registration
app.get('/register/student', (req, res) => {
    res.render('pages/register-student', { error: req.query.error });
});

app.post('/register/student', async (req, res) => {
    const { name, email, roll_number, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO students (name, email, roll_number, password) VALUES ($1, $2, $3, $4)',
            [name, email, roll_number, hashedPassword]
        );
        res.redirect('/login/student?success=Registration successful! Please login.');
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation error
            return res.redirect('/register/student?error=Email or Roll Number already registered.');
        }
        res.redirect('/register/student?error=Registration failed. Please try again.');
    }
});

// Student Login
app.post('/login/student', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM students WHERE email = $1', [email]);
        const student = result.rows[0];

        if (student && await bcrypt.compare(password, student.password)) {
            req.session.studentId = student.id;
            req.session.user = { id: student.id, name: student.name, type: 'student' };
            req.session.userId = student.id; // Generic ID for suggestions
            req.session.userType = 'student'; // Generic type for suggestions
            const redirectUrl = req.query.redirect || '/student/dashboard';
            res.redirect(redirectUrl);
        } else {
            res.render('pages/login-student', { error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error during login.');
    }
});

// Faculty Registration (Similar to student, consider if you need a separate admin registration)
app.get('/register/faculty', (req, res) => {
    res.render('pages/register-faculty', { error: req.query.error });
});

app.post('/register/faculty', async (req, res) => {
    const { name, email, department, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        await pool.query(
            'INSERT INTO faculty (name, email, department, password) VALUES ($1, $2, $3, $4)',
            [name, email, department, hashedPassword]
        );
        res.redirect('/login/faculty?success=Faculty registration successful! Please login.');
    } catch (err) {
        console.error(err);
        if (err.code === '23505') { // Unique violation error
            return res.redirect('/register/faculty?error=Email already registered.');
        }
        res.redirect('/register/faculty?error=Registration failed. Please try again.');
    }
});

// Faculty Login
app.post('/login/faculty', async (req, res) => {
    const { email, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM faculty WHERE email = $1', [email]);
        const faculty = result.rows[0];

        if (faculty && await bcrypt.compare(password, faculty.password)) {
            req.session.facultyId = faculty.id;
            req.session.user = { id: faculty.id, name: faculty.name, type: 'faculty' };
            req.session.userId = faculty.id; // Generic ID for suggestions
            req.session.userType = 'faculty'; // Generic type for suggestions
            const redirectUrl = req.query.redirect || '/faculty/dashboard';
            res.redirect(redirectUrl);
        } else {
            res.render('pages/login-faculty', { error: 'Invalid email or password' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error during login.');
    }
});


// Middleware to ensure user is logged in (optional, but good for specific routes)
function requireLogin(req, res, next) {
    if (!req.session.user) {
        return res.redirect('/login/student?error=Please log in to access this page.'); // Or /login/faculty
    }
    next();
}

// Ensure faculty is logged in for their dashboard
app.get('/faculty/dashboard', requireLogin, async (req, res) => {
    if (req.session.user.type !== 'faculty') {
        return res.status(403).send('Access Denied: Only faculty can view this dashboard.');
    }
    const facultyId = req.session.facultyId; // Use the specific facultyId from session

    try {
        const feedbackResult = await pool.query(
            `SELECT f.rating, f.comments, s.name as student_name, f.created_at
             FROM feedback f
             JOIN students s ON f.student_id = s.id
             WHERE f.faculty_id = $1
             ORDER BY f.created_at DESC`,
            [facultyId]
        );

        const avgRatingResult = await pool.query(
            'SELECT AVG(rating) as avg_rating FROM feedback WHERE faculty_id = $1',
            [facultyId]
        );

        res.render('pages/faculty/dashboard', {
            feedbacks: feedbackResult.rows,
            avgRating: avgRatingResult.rows[0].avg_rating ? parseFloat(avgRatingResult.rows[0].avg_rating).toFixed(2) : 'N/A', // Format and handle no feedback
            facultyName: req.session.user.name // Pass faculty name for display
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error retrieving faculty dashboard.');
    }
});


// Student Feedback Submission
app.post('/submit-feedback', requireLogin, async (req, res) => {
    if (req.session.user.type !== 'student') {
        return res.status(403).send('Access Denied: Only students can submit feedback.');
    }
    const { facultyId, rating, comments } = req.body;
    const studentId = req.session.studentId; // Assuming session management setup

    try {
        await pool.query(
            'INSERT INTO feedback (faculty_id, student_id, rating, comments) VALUES ($1, $2, $3, $4)',
            [facultyId, studentId, rating, comments]
        );
        res.redirect('/student/dashboard?success=Feedback submitted successfully!');
    } catch (err) {
        console.error(err);
        res.redirect('/submit-feedback?error=Submission failed. Please try again.');
    }
});

// To display faculty list on feedback submission page (example)
app.get('/submit-feedback', requireLogin, async (req, res) => {
    if (req.session.user.type !== 'student') {
        return res.status(403).send('Access Denied: Only students can access this page.');
    }
    try {
        const facultyList = await pool.query('SELECT id, name, department FROM faculty ORDER BY name');
        res.render('pages/student/submit-feedback', {
            faculty: facultyList.rows,
            success: req.query.success,
            error: req.query.error
        });
    } catch (err) {
        console.error(err);
        res.status(500).send('Server error while fetching faculty list.');
    }
});


// Suggestion Submission
app.post('/submit-suggestion', requireLogin, async (req, res) => {
    const { suggestion } = req.body;
    const userId = req.session.userId;     // From generic session ID
    const userType = req.session.userType; // From generic session type

    try {
        await pool.query(
            'INSERT INTO suggestions (user_id, user_type, suggestion) VALUES ($1, $2, $3)',
            [userId, userType, suggestion]
        );
        res.redirect(`/${userType}/dashboard?success=Suggestion submitted successfully!`);
    } catch (err) {
        console.error(err);
        res.redirect('/submit-suggestion?error=Submission failed. Please try again.');
    }
});

// Admin Dashboard (Placeholder - you'll build this out later)
app.get('/admin/dashboard', requireLogin, (req, res) => {
    // Implement admin role check here later
    res.render('pages/admin/dashboard');
});