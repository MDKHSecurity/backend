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
        console.log(req.body)
        const tokenString = req.params.token;
        console.log(tokenString, "<-- Tokenstring from param")
        const hash = hashElement(tokenString)
        console.log(hash, "<-- Tokenstring hashed param")
    
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
            message: "Token is valid",
            user_id: token.user_id,
            token_id: token.id  
        });
    } catch (error) {
        console.error("Error validating token:", error);
        res.status(500).send({message: "Internal Error"});
    }
});

router.delete('/api/tokens/:id', async (req, res) => {
    try {
        const tokenId = req.params.id;  // Get the token ID from the URL parameter
        console.log(tokenId,"<--Deletetoken")
        // Query to delete the token from the database
        const deleteQuery = `DELETE FROM tokens WHERE id = ?`;

        const [result] = await db.connection.query(deleteQuery, [tokenId]);
        // Check if any rows were affected
        if (result.affectedRows === 0) {
            return res.status(404).send({ message: "Not found" });
        }

        res.status(200).send({ message: "Token deleted successfully" });
    } catch (error) {
        console.error("Error deleting token:", error);
        res.status(500).send({ message: "Internal Error" });
    }
});
export default router;