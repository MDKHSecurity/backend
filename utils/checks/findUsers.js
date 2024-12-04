import db from "../../database/database.js";

export async function findUser(email) {
    const query = `
        SELECT 
            u.id, 
            u.username,
            u.institution_id,
            u.email,
            u.password,
            i.institution_name,
            r.role_name,
            JSON_ARRAYAGG(
                JSON_OBJECT(
                    'id', ro.id, 
                    'name', ro.room_name, 
                    'courses', (
                        SELECT JSON_ARRAYAGG(
                            JSON_OBJECT('id', c.id, 'name', c.course_name)
                        )
                        FROM rooms_courses rc
                        JOIN courses c ON rc.course_id = c.id
                        WHERE rc.room_id = ro.id
                    )
                )
            ) AS rooms
        FROM 
            users u
        LEFT JOIN 
            users_rooms ur ON u.id = ur.user_id
        LEFT JOIN 
            rooms ro ON ur.room_id = ro.id
        JOIN 
            institutions i ON u.institution_id = i.id
        JOIN 
            roles r ON u.role_id = r.id
        WHERE 
            u.email = ?
        GROUP BY 
            u.id;
    `;

    try {
        const [result] = await db.connection.query(query, [email]);
        
        if (!result || result.length === 0) {
            return []; // Return null or a default value
        }
        const userInfo = {
            ...result[0],
            rooms: result[0].rooms // Parse JSON or provide default
        };

        return userInfo;

    } catch (err) {
        console.error("Database query failed:", err);
        throw err; // Re-throw error or handle it
    }
}
