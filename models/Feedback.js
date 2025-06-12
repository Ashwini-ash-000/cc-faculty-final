module.exports = (pool) => {
    return {
        // Create new feedback
        create: async (studentId, facultyId, courseId, rating, comment) => {
            const result = await pool.query(
                'INSERT INTO feedbacks (student_id, faculty_id, course_id, rating, comment) VALUES ($1, $2, $3, $4, $5) RETURNING *',
                [studentId, facultyId, courseId, rating, comment]
            );
            return result.rows[0];
        },

        // Find feedback by student ID
        findByStudentId: async (studentId) => {
            const result = await pool.query('SELECT * FROM feedbacks WHERE student_id = $1 ORDER BY submitted_at DESC', [studentId]);
            return result.rows;
        },

        // Find feedback for a specific faculty (useful for faculty dashboard)
        findByFacultyId: async (facultyId) => {
            const result = await pool.query('SELECT * FROM feedbacks WHERE faculty_id = $1 ORDER BY submitted_at DESC', [facultyId]);
            return result.rows;
        },

        // Get all feedback (e.g., for admin)
        findAll: async () => {
            const result = await pool.query('SELECT * FROM feedbacks ORDER BY submitted_at DESC');
            return result.rows;
        }
    };
};