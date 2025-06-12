module.exports = (pool) => {
    return {
        // Find student profile by user ID
        findByUserId: async (userId) => {
            const result = await pool.query(
                'SELECT sp.*, u.username, u.email as user_email FROM student_profiles sp JOIN users u ON sp.user_id = u.id WHERE sp.user_id = $1',
                [userId]
            );
            return result.rows[0];
        },

        // Find student profile by roll number
        findByRollNumber: async (rollNumber) => {
            const result = await pool.query('SELECT * FROM student_profiles WHERE roll_number = $1', [rollNumber]);
            return result.rows[0];
        },

        // Create a new student profile
        create: async (userId, firstName, lastName, rollNumber, major, semester, contactEmail, phoneNumber) => {
            const result = await pool.query(
                `INSERT INTO student_profiles (user_id, first_name, last_name, roll_number, major, semester, contact_email, phone_number)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                 RETURNING *`,
                [userId, firstName, lastName, rollNumber, major, semester, contactEmail, phoneNumber]
            );
            return result.rows[0];
        },

        // Update an existing student profile
        update: async (userId, data) => {
            const { firstName, lastName, rollNumber, major, semester, contactEmail, phoneNumber } = data;
            const result = await pool.query(
                `UPDATE student_profiles SET
                    first_name = $2,
                    last_name = $3,
                    roll_number = $4,
                    major = $5,
                    semester = $6,
                    contact_email = $7,
                    phone_number = $8
                 WHERE user_id = $1
                 RETURNING *`,
                [userId, firstName, lastName, rollNumber, major, semester, contactEmail, phoneNumber]
            );
            return result.rows[0];
        },

        // Get all student profiles
        findAll: async () => {
            const result = await pool.query('SELECT * FROM student_profiles ORDER BY roll_number');
            return result.rows;
        },

        // Count all students
        countAll: async () => {
            const result = await pool.query('SELECT COUNT(*) FROM student_profiles');
            return parseInt(result.rows[0].count, 10);
        }
    };
};