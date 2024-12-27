import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { deleteRateLimiter, generalRateLimiter, postRateLimiter } from "../middleware/rateLimit.js";
const router = Router();

router.get("/api/quizzes", authenticateToken, generalRateLimiter, async (req, res) => {
    try {

        const current_role_name = req.user.role_name
        if (current_role_name != "admin" && current_role_name != "student" && current_role_name != "owner"){
          res.status(403).send({message: 'Forbidden'})
        }  
        // Query to fetch all quizzes
        const [quizzes] = await db.connection.query("SELECT * FROM quizzes");

        // For each quiz, fetch associated questions
        const quizzesWithDetails = await Promise.all(
            quizzes.map(async (quiz) => {
                // Fetch questions associated with the quiz
                const [questions] = await db.connection.query(
                    `
                    SELECT q.* 
                    FROM quizzes_questions qq
                    INNER JOIN questions q ON qq.question_id = q.id
                    WHERE qq.quiz_id = ?
                    `,
                    [quiz.id]
                );

                // Add the associated questions to the quiz
                return {
                    ...quiz,
                    questions,
                };
            })
        );           
        res.send(quizzesWithDetails);
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

router.get("/api/quizzes/:id", authenticateToken, generalRateLimiter, async (req, res) => {
    const { id } = req.params;
    try {
        const current_role_name = req.user.role_name
        if (current_role_name != "admin" && current_role_name != "student" && current_role_name != "owner"){
          res.status(403).send({message: 'Forbidden'})
        } 
        const [quizResult] = await db.connection.query(
            "SELECT * FROM quizzes WHERE id = ?",
            [id]
        );

        if (quizResult.length === 0) {
            return res.status(400).json({ success: false, message: "Quiz not found" });
        }

        const quiz = quizResult[0];

        // Fetch questions associated with the quiz
        const [questions] = await db.connection.query(
            `
            SELECT q.* 
            FROM quizzes_questions qq
            INNER JOIN questions q ON qq.question_id = q.id
            WHERE qq.quiz_id = ?
            `,
            [quiz.id]
        );

        quiz.questions = questions;

        res.send(quiz);
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

//mangler at poste til quizzes_questions
router.post("/api/quizzes", authenticateToken, postRateLimiter, async (req, res) => {
    const requestBody = req.body;
    const current_role_name = req.user.role_name
    if (current_role_name != "owner"){
      res.status(403).send({message: 'Forbidden'})
    } 
    const { quiz_name, number_of_questions, questions } = requestBody;
    if (!quiz_name || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).send({message: "Bad Request" });
    }
    try {
        // Start transaction
        await db.connection.beginTransaction();

        // Insert into quizzes table
        const insertQuizQuery = "INSERT INTO quizzes (quiz_name, number_of_questions) VALUES (?, ?)";
        const [quiz] = await db.connection.query(insertQuizQuery, [quiz_name, number_of_questions]);
        const quizId = quiz.insertId; // Get the inserted quiz's ID

        // Insert into quizzes_questions table
        const insertQuestionsQuery = "INSERT INTO quizzes_questions (quiz_id, question_id) VALUES ?";
        const questionsValues = questions.map(questionId => [quizId, questionId]); // Map to a 2D array
        await db.connection.query(insertQuestionsQuery, [questionsValues]);

        // Commit transaction
        await db.connection.commit();
        const newQuiz = {
            id: quiz.insertId,
            ...requestBody       
        };
        res.send( {message:`Successfully created quiz: ${quiz_name}`, newQuiz});

    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        await db.connection.rollback();
        res.status(500).send({message: "Something went wrong" });
    }
});


router.delete("/api/quizzes/:id", authenticateToken, deleteRateLimiter, async (req, res) => {
    const quizId = req.params.id;
    try {  
        const current_role_name = req.user.role_name
        if (current_role_name != "owner"){
          res.status(403).send({message: 'Forbidden'})
        } 
        const [result] = await db.connection.query(
            "DELETE FROM quizzes WHERE id = ?",
            [quizId]
        );
        res.send({message: `Successfully deleted quiz`, data: result});
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

export default router;