import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { deleteRateLimiter, generalRateLimiter, postRateLimiter } from "../middleware/rateLimit.js";
const router = Router();

router.get("/api/questions", authenticateToken, generalRateLimiter, async (req, res) => {

    try {
        const current_role_name = req.user.role_name
        if (current_role_name != "admin" && current_role_name != "student" && current_role_name != "owner"){
          res.status(403).send({message: 'Forbidden'})
        } 
        const [questions] = await db.connection.query("SELECT * FROM questions");
        res.send(questions);
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

router.post("/api/questions", authenticateToken, postRateLimiter, async (req, res) => {
    const requestBody = req.body
    try {
        const current_role_name = req.user.role_name
        if (current_role_name != "owner"){
          res.status(403).send({message: 'Forbidden'})
        } 
        const insertQuery = "INSERT INTO questions (question, answer, wrong_answer_1, wrong_answer_2, wrong_answer_3) VALUES (?, ?, ?, ?, ?)";
        const [result] = await db.connection.query(insertQuery, [requestBody.question, requestBody.answer, requestBody.wrong_answer_1, requestBody.wrong_answer_2, requestBody.wrong_answer_3]);
        const newQuestion = {
            id: result.insertId,
            ...requestBody       
        };
        res.send( {message:`Successfully created question: ${requestBody.question}`, newQuestion});
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

router.delete("/api/questions/:id", authenticateToken, deleteRateLimiter, async (req, res) => {
    const questionId = req.params.id;
    try {  
        const current_role_name = req.user.role_name
        if (current_role_name != "owner"){
          res.status(403).send({message: 'Forbidden'})
        } 
        const [result] = await db.connection.query(
            "DELETE FROM questions WHERE id = ?",
            [questionId]
        );
        res.send({message: `Successfully deleted question`, data: result});
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

export default router;