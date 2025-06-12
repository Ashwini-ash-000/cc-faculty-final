const bcrypt = require('bcryptjs'); // Make sure you have 'bcryptjs' installed

module.exports = (pool) => {
    return {
        // Find user by username (for Passport Local Strategy)
        findByUsername: async (username) => {
            const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            return result.rows[0];
        },
        // Find user by email (useful for registration to check if email exists)
        findByEmail: async (email) => {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows[0];
        },
        // Find user by ID (for Passport deserialization)
        findById: async (id) => {
            const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
            return result.rows[0];
        },
        // Create a new user
        create: async (username, email, password, role) => {
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role', // Return essential user data
                [username, email, hashedPassword, role]
            );
            return result.rows[0];
        },
        // Compare a plain-text password with a hashed password
        comparePassword: async (candidatePassword, hashedPassword) => {
            return bcrypt.compare(candidatePassword, hashedPassword);
        }
        // Add any other user-related database functions here if needed
    };
};