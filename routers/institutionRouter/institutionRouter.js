import { Router } from "express";
import db from "../../database/database.js";
import { authenticateToken } from "../middleware/verifyJWT.js";
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { deleteRateLimiter, generalRateLimiter, postRateLimiter } from "../middleware/rateLimit.js";
const router = Router();

router.get("/api/institutions", authenticateToken, generalRateLimiter, async (req, res) => {
    try {
        const current_role_name = req.user.role_name
        if (current_role_name != "owner"){
          res.status(403).send({message: 'Forbidden'})
        } 
        const [institutions] = await db.connection.query("SELECT * FROM institutions"); 
        res.send(institutions);
        
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

router.post("/api/institutions", authenticateToken, postRateLimiter, async (req, res) => {
    const requestBody = req.body
    const current_role_name = req.user.role_name
    if (current_role_name != "owner"){
      res.status(403).send({message: 'Forbidden'})
    } 
    try {
        
        const insertQuery = "INSERT INTO institutions (institution_name, city, address, licens_amount) VALUES (?, ?, ?, ?)";
        const [institution] = await db.connection.query(insertQuery, [requestBody.institution_name, requestBody.city, requestBody.address, requestBody.licens_amount]);
        const newInstitution = {
            id: institution.insertId,
            ...requestBody       
        };
        res.send({message: `Successfully created institution: ${requestBody.institution_name}`, newInstitution});

    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

router.delete("/api/institutions/:id", authenticateToken, deleteRateLimiter, async (req, res) => {
    const current_role_name = req.user.role_name
    if (current_role_name != "owner"){
      res.status(403).send({message: 'Forbidden'})
    } 
    const institutionId = req.params.id;

    try {  
        const [result] = await db.connection.query(
            "DELETE FROM institutions WHERE id = ?",
            [institutionId]
        );
        res.send({message: `Successfully deleted institution`, result});

    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong" });
    }
});

export default router;