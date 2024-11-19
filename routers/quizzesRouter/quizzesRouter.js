import { Router } from "express";
import db from "../../database/database.js";
const router = Router();

router.get("/api/quizzes", async (req, res) => {
    try {
        const [quizzes] = await db.connection.query("SELECT * FROM quizzes");
        console.log(quizzes)
        res.status(200).json(quizzes);
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).json({ success: false, message: "Error fetching quizzes" });
    }
});

export default router;