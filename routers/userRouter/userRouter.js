import { Router } from "express";
import db from "../../database/database.js";

const router = Router();

router.get("/api/users", async (req, res) => {
    try {
        const query = `
            SELECT u.id, u.username, u.password, c.classroom_name, u.institution_id, u.role_id
            FROM users u
            JOIN classrooms c ON u.classroom_id = c.id
            WHERE u.classroom_id = 1;
        `;
        
        const [users] = await db.connection.query(query);

        res.status(200).json({ success: true, data: users });
    } catch (error) {
        console.error("Error fetching users:", error);
        res.status(500).json({ success: false, message: "Error fetching users" });
    }
});

export default router;