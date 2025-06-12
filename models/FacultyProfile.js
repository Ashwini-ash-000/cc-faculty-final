module.exports = (pool) => {
    return {
        // Find faculty profile by user ID
        findByUserId: async (userId) => {
            const result = await pool.query(
                'SELECT fp.*, u.username, u.email as user_email FROM faculty_profiles fp JOIN users u ON fp.user_id = u.id WHERE fp.user_id = $1',
                [userId]
            );
            return result.rows[0];
        },

        // Find faculty profile by employee ID
        findByEmployeeId: async (employeeId) => {
            const result = await pool.query('SELECT * FROM faculty_profiles WHERE employee_id = $1', [employeeId]);
            return result.rows[0];
        },

        // Create a new faculty profile
        create: async (userId, firstName, lastName, employeeId, department, designation, contactEmail, phoneNumber, officeLocation, researchInterests, officeHours, profilePicture = null) => {
            const result = await pool.query(
                `INSERT INTO faculty_profiles (user_id, first_name, last_name, employee_id, department, designation, contact_email, phone_number, office_location, research_interests, office_hours, profile_picture)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
                 RETURNING *`,
                [userId, firstName, lastName, employeeId, department, designation, contactEmail, phoneNumber, officeLocation, researchInterests, officeHours, profilePicture]
            );
            return result.rows[0];
        },

        // Update an existing faculty profile
        update: async (userId, data) => {
            const { firstName, lastName, employeeId, department, designation, contactEmail, phoneNumber, officeLocation, researchInterests, officeHours, profilePicture } = data;
            const result = await pool.query(
                `UPDATE faculty_profiles SET
                    first_name = $2,
                    last_name = $3,
                    employee_id = $4,
                    department = $5,
                    designation = $6,
                    contact_email = $7,
                    phone_number = $8,
                    office_location = $9,
                    research_interests = $10,
                    office_hours = $11,
                    profile_picture = $12
                 WHERE user_id = $1
                 RETURNING *`,
                [userId, firstName, lastName, employeeId, department, designation, contactEmail, phoneNumber, officeLocation, researchInterests, officeHours, profilePicture]
            );
            return result.rows[0];
        },

        // Get all faculty profiles
        findAll: async () => {
            const result = await pool.query('SELECT * FROM faculty_profiles ORDER BY last_name, first_name');
            return result.rows;
        }
    };
};