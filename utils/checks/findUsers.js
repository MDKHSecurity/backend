import db from "../../database/database.js";

export async function findUser(email, password) {
    try {
    const query = `
    SELECT 
        u.id, 
        u.username,
        u.institution_id,
        u.email,
        i.institution_name,
        r.role_name
    FROM 
        users u
    JOIN 
        institutions i ON u.institution_id = i.id
    JOIN 
        roles r ON u.role_id = r.id
    WHERE 
        u.email = ? AND u.password = ?;
`;

        const [result] = await db.connection.query(query, [email, password]);
        if (!result || result.length === 0) {
            return []; // Return null or a default value
        }
        return result[0];

    } catch (err) {
        console.error("Database query failed:", err);
        throw err; // Re-throw error or handle it
    }
}

export async function findUserNoPassword(email) {
    try {
    const query = `
    SELECT 
        u.id, 
        u.username,
        u.institution_id,
        u.email,
        i.institution_name,
        r.role_name
    FROM 
        users u
    JOIN 
        institutions i ON u.institution_id = i.id
    JOIN 
        roles r ON u.role_id = r.id
    WHERE 
        u.email = ?
`;

        const [result] = await db.connection.query(query, [email]);
        if (!result || result.length === 0) {
            return []; // Return null or a default value
        }
        return result[0];

    } catch (err) {
        console.error("Database query failed:", err);
        throw err; // Re-throw error or handle it
    }
}