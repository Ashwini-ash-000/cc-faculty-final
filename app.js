require('dotenv').config(); // Load environment variables

const express = require('express');
const path = require('path');
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bodyParser = require('body-parser');
const pgSession = require('connect-pg-simple')(session); // Import the pg-simple store
const { Pool } = require('pg'); // PostgreSQL client

// --- Database Connection (PostgreSQL) ---
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false // Required for Render or other SSL connections
});

pool.on('connect', () => console.log('Connected to PostgreSQL database!'));
pool.on('error', (err) => console.error('PostgreSQL database error:', err.message));

// --- Import Models (using direct DB queries for simplicity) ---
// In a larger app, you'd have 'models' directory with functions for DB ops
const User = require('./models/User')(pool); // Pass the pool to the User model
const FacultyProfile = require('./models/FacultyProfile')(pool);
const StudentProfile = require('./models/StudentProfile')(pool);
const Feedback = require('./models/Feedback')(pool);
const Suggestion = require('./models/Suggestion')(pool);


// --- Import Routes ---
const indexRoutes = require('./routes/index');
const facultyRoutes = require('./routes/faculty');
const studentRoutes = require('./routes/student');

const app = express();

// --- Middleware Setup ---

// Body Parser Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// EJS Setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Correct Session Middleware (using connect-pg-simple)
app.use(session({
    store: new pgSession({
        pool: pool, // Connection pool
        tableName: 'session' // Use a table named 'session' to store sessions
    }),
    secret: process.env.SESSION_SECRET, // Make sure this is set in Render env vars!
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24, // 24 hours
        secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
        httpOnly: true
    }
}));

// Passport Authentication Middleware - This MUST come AFTER session middleware
app.use(passport.initialize());
app.use(passport.session());

// --- Passport Local Strategy ---
passport.use(new LocalStrategy(
    async (username, password, done) => {
        try {
            const user = await User.findByUsername(username);
            if (!user) {
                return done(null, false, { message: 'Incorrect username or password.' });
            }
            const isMatch = await User.comparePassword(password, user.password);
            if (!isMatch) {
                return done(null, false, { message: 'Incorrect username or password.' });
            }
            return done(null, user);
        } catch (err) {
            console.error('Passport authentication error:', err);
            return done(err);
        }
    }
));

// Serialize user (store user ID in session)
passport.serializeUser((user, done) => {
    done(null, user.id);
});

// Deserialize user (retrieve user object from ID in session)
passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        console.error('Passport deserialization error:', err);
        done(err, null);
    }
});

// Make user data available in all EJS templates
app.use((req, res, next) => {
    res.locals.currentUser = req.user;
    next();
});

// --- Routes ---
app.use('/', indexRoutes);
app.use('/faculty', facultyRoutes);
app.use('/student', studentRoutes);

// --- Error Handling ---
// Catch 404
app.use((req, res, next) => {
    res.status(404).render('error', { title: '404 Not Found', message: 'The page you are looking for does not exist.' });
});

// General error handler
app.use((err, req, res, next) => {
    console.error(err.stack); // Log error stack for debugging
    res.status(err.status || 500).render('error', {
        title: `Error ${err.status || 500}`,
        message: err.message,
        error: process.env.NODE_ENV === 'development' ? err : {} // Show error details in development
    });
});

// --- Start Server ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Access at http://localhost:${PORT}`);
});