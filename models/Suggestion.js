module.exports = (pool) => {
    return {
        // Create a new suggestion
        create: async (userId, subject, description) => {
            const result = await pool.query(
                'INSERT INTO suggestions (user_id, subject, description) VALUES ($1, $2, $3) RETURNING *',
                [userId, subject, description]
            );
            return result.rows[0];
        },

        // Find suggestions by user ID
        findByUserId: async (userId) => {
            const result = await pool.query('SELECT * FROM suggestions WHERE user_id = $1 ORDER BY submitted_at DESC', [userId]);
            return result.rows;
        },

        // Get all suggestions (e.g., for admin/review)
        findAll: async () => {
            const result = await pool.query('SELECT * FROM suggestions ORDER BY submitted_at DESC');
            return result.rows;
        },

        // Update suggestion status
        updateStatus: async (id, status) => {
            const result = await pool.query(
                'UPDATE suggestions SET status = $2 WHERE id = $1 RETURNING *',
                [id, status]
            );
            return result.rows[0];
        }
    };
};