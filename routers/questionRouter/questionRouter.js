import { Router } from "express";
import db from "../../database/database.js";
const router = Router();

router.get("/api/questions", async (req, res) => {

    try {
        const [questions] = await db.connection.query("SELECT * FROM questions");
        res.status(200).json(questions);
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ success: false, message: "Error fetching questions" });
    }
});


router.post("/api/questions", async (req, res) => {
    const requestBody = req.body
    try {
        const insertQuery = "INSERT INTO questions (question, answer, wrong_answer_1, wrong_answer_2, wrong_answer_3) VALUES (?, ?, ?, ?, ?)";
        const [result] = await db.connection.query(insertQuery, [requestBody.question, requestBody.answer, requestBody.wrong_answer_1, requestBody.wrong_answer_2, requestBody.wrong_answer_3]);
        const newQuestion = {
            id: result.insertId,
            ...requestBody       
        };
        res.status(200).json(newQuestion);
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ success: false, message: "Error fetching questions" });
    }
});

router.delete("/api/questions/:id", async (req, res) => {
    const questionId = req.params.id;
    try {  
        const [result] = await db.connection.query(
            "DELETE FROM questions WHERE id = ?",
            [questionId]
        );
        res.status(200).json({data: result});
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).json({ success: false, message: "Error fetching questions" });
    }
});

export default router;