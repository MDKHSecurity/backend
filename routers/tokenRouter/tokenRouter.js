import { Router } from "express";
import pbkdf2 from "pbkdf2";
import db from "../../database/database.js";
import jwt from "jsonwebtoken";
import { hashElement, verifyPassword } from "../../utils/passwords/hashPassword.js"
import { authenticateToken } from "../middleware/verifyJWT.js";
const router = Router();

const jwtSecret = process.env.JWT_SECRET;

router.get('/api/tokens/:token', async (req, res) => {
    try {
        
        const tokenString = req.params.token;
        const {hash} = hashElement(tokenString)
    
        const tokenQuery = `
            SELECT id, token_string, expires_at, user_id 
            FROM tokens 
            WHERE token_string = ?`;
        const [tokens] = await db.connection.query(tokenQuery, [hash]);
        if (tokens.length === 0) {
            return res.status(400).send({ message: "Token not valid" });
        }
        const token = tokens[0];
        const now = new Date();
        if (new Date(token.expires_at) < now || tokens.length === 0) {
            return res.status(400).send({ message: "Token not valid" });
        }
        res.send({ 
            message: "Token is valid",
            user_id: token.user_id,
            token_id: token.id  
        });
    } catch (error) {
        console.error("Error validating token:", error);
        res.status(500).send({ message: "An error occurred while validating the token" });
    }
});

router.delete('/api/tokens/:id' , async (req, res) => {
    try {
        const tokenId = req.params.id;  // Get the token ID from the URL parameter

        // Query to delete the token from the database
        const deleteQuery = `DELETE FROM tokens WHERE id = ?`;

        const [result] = await db.connection.query(deleteQuery, [tokenId]);

        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Token not found" });
        }

        // Return a success message
        res.status(200).json({ message: "Token deleted successfully" });
    } catch (error) {
        console.error("Error deleting token:", error);
        res.status(500).json({ message: "An error occurred while deleting the token" });
    }
});
export default router;