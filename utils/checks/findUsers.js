import db from "../../database/database.js";

export async function findUser(email) {
    const query = "SELECT * FROM users WHERE email = ?";
    const [result] = await db.connection.query(query, [email]);
    
    // Return true if the user is found, false if no user is found
    return result;
}