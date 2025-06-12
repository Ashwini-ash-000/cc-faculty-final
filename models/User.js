const bcrypt = require('bcryptjs');

module.exports = (pool) => {
    return {
        // Find a user by ID
        findById: async (id) => {
            const result = await pool.query('SELECT id, username, email, role FROM users WHERE id = $1', [id]);
            return result.rows[0];
        },

        // Find a user by username
        findByUsername: async (username) => {
            const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
            return result.rows[0];
        },

        // Find a user by email
        findByEmail: async (email) => {
            const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
            return result.rows[0];
        },

        // Create a new user
        create: async (username, email, password, role) => {
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await pool.query(
                'INSERT INTO users (username, email, password, role) VALUES ($1, $2, $3, $4) RETURNING id, username, email, role',
                [username, email, hashedPassword, role]
            );
            return result.rows[0];
        },

        // Compare password (static method, not part of instance)
        comparePassword: async (candidatePassword, hashedPassword) => {
            return bcrypt.compare(candidatePassword, hashedPassword);
        }
    };
};