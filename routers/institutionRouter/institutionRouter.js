import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";
const router = Router();

router.get("/api/institutions", authenticateToken, async (req, res) => {
    try {
        const [institutions] = await db.connection.query("SELECT * FROM institutions"); 
        res.send(institutions);
        
    } catch (error) {
        console.error("Error fetching quizzes:", error);
        res.status(500).send({message: "Something went wrong" });
    }
});

router.post("/api/institutions", authenticateToken, async (req, res) => {
    const requestBody = req.body
    try {
        const insertQuery = "INSERT INTO institutions (institution_name, city, address, licens_amount) VALUES (?, ?, ?, ?)";
        const [institution] = await db.connection.query(insertQuery, [requestBody.institution_name, requestBody.city, requestBody.address, requestBody.licens_amount]);
        const newInstitution = {
            id: institution.insertId,
            ...requestBody       
        };
        res.send({message: `Successfully created institution: ${requestBody.institution_name}`, newInstitution});

    } catch (error) {
        console.error("Error fetching institutions:", error);
        res.status(500).send({message: "Something went wrong" });
    }
});

router.delete("/api/institutions/:id", authenticateToken, async (req, res) => {
    const institutionId = req.params.id;

    try {  
        const [result] = await db.connection.query(
            "DELETE FROM institutions WHERE id = ?",
            [institutionId]
        );
        res.send({message: `Successfully deleted institution`, result});

    } catch (error) {
        console.error("Error fetching institutions:", error);
        res.status(500).send({message: "Something went wrong" });
    }
});

export default router;