import db from "../../database/database.js";

export async function findUser(username) {
    const query = "SELECT * FROM users WHERE username = ?";
    const [result] = await db.connection.query(query, [username]);
    
    // Return true if the user is found, false if no user is found
    return result;
}