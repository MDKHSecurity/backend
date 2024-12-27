import { Router } from "express";
import db from "../../database/database.js";
import { hashElement } from "../../utils/passwords/hashPassword.js"
import { logErrorToFile } from "../../utils/logErrorToFile/logErrorToFile.js";
import { deleteRateLimiter, generalRateLimiter } from "../middleware/rateLimit.js";
const router = Router();

const jwtSecret = process.env.JWT_SECRET;

router.get('/api/tokens/:token', generalRateLimiter, async (req, res) => {
    try {
        const tokenString = req.params.token;
        const hash = hashElement(tokenString)
    
        const tokenQuery = `
            SELECT id, token_string, expires_at, user_id 
            FROM tokens 
            WHERE token_string = ?`;
        const [tokens] = await db.connection.query(tokenQuery, [hash]);
        if (tokens.length === 0) {
            return res.status(401).send({ message: "Talk to Administrator" });
        }
        const token = tokens[0];
        const now = new Date();
        if (new Date(token.expires_at) < now || tokens.length === 0) {
            return res.status(401).send({ message: "Talk to Administrator"});
        }
        res.send({ 
            // message: "Token is valid",
            user_id: token.user_id,
            token_id: token.id  
        });
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({message: "Something went wrong"});
    }
});

router.delete('/api/tokens/:id', deleteRateLimiter, async (req, res) => {
    try {
        const tokenId = req.params.id;  // Get the token ID from the URL parameter
        
        // Query to delete the token from the database
        const deleteQuery = `DELETE FROM tokens WHERE id = ?`;

        const [result] = await db.connection.query(deleteQuery, [tokenId]);
        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(400).send({ message: "Bad Request" });
        }

        res.status(200).send({ message: `Successfully deleted token`});
    } catch (error) {
        logErrorToFile(error, req.originalUrl);
        res.status(500).send({ message: "Something went wrong" });
    }
});
export default router;