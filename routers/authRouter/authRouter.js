import { Router } from "express";
import pbkdf2 from "pbkdf2";
import db from "../../database/database.js";
import jwt from "jsonwebtoken";
import { findUser } from "../../utils/checks/findUsers.js"
import { hashPassword, verifyPassword } from "../../utils/passwords/hashPassword.js"
const router = Router();

const jwtSecret = process.env.JWT_SECRET;

router.post("/api/auth/register", async (req, res) => {
    const requestBody = req.body
    
    const findUserByUsername = await findUser(requestBody.username);

    if(findUserByUsername.length === 0){
        const {salt, hash} = hashPassword(requestBody.password);
    
        const insertQuery = "INSERT INTO users (username, salt, password, classroom_id, institution_id, role_id) VALUES (?, ?, ?, ?, ?, ?)";
        const [registeredUser] = await db.connection.query(insertQuery, [requestBody.username, salt, hash, requestBody.classroom, requestBody.institution, requestBody.role]);

        res.status(200).json({ success: true, data: registeredUser }); 
    }else{
        res.status(500).send({message: "failed"});
    }
});

router.post("/api/auth/login", async (req, res) => {
    const requestBody = req.body

    const [findUserByUsername] = await findUser(requestBody.username);
    if(findUserByUsername.length === 0){
        res.status(500).send({message: "failed"});
    }else{
        const isPasswordValid = verifyPassword(requestBody.password, findUserByUsername.salt, findUserByUsername.password)
        
        if(!isPasswordValid){
            return res.status(400).send({message: "invalid credentials"})
        }

        const token = jwt.sign(findUserByUsername.username, process.env.JWT_SECRET);
        
        res.send({token})
    }
});

export default router;