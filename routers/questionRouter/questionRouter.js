import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";
const router = Router();

router.get("/api/questions", authenticateToken, async (req, res) => {

    try {
        const [questions] = await db.connection.query("SELECT * FROM questions");
        res.send(questions);
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).send({message: "Internal Error" });
    }
});

router.post("/api/questions", authenticateToken, async (req, res) => {
    const requestBody = req.body
    try {
        const insertQuery = "INSERT INTO questions (question, answer, wrong_answer_1, wrong_answer_2, wrong_answer_3) VALUES (?, ?, ?, ?, ?)";
        const [result] = await db.connection.query(insertQuery, [requestBody.question, requestBody.answer, requestBody.wrong_answer_1, requestBody.wrong_answer_2, requestBody.wrong_answer_3]);
        const newQuestion = {
            id: result.insertId,
            ...requestBody       
        };
        res.send(newQuestion);
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).send({message: "Internal Error" });
    }
});

router.delete("/api/questions/:id", authenticateToken, async (req, res) => {
    const questionId = req.params.id;
    try {  
        const [result] = await db.connection.query(
            "DELETE FROM questions WHERE id = ?",
            [questionId]
        );
        res.send({data: result});
    } catch (error) {
        console.error("Error fetching questions:", error);
        res.status(500).send({message: "Internal Error" });
    }
});

export default router;