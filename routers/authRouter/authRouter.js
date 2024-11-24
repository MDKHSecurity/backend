import { Router } from "express";
import pbkdf2 from "pbkdf2";
import db from "../../database/database.js";
import jwt from "jsonwebtoken";
import { findUser } from "../../utils/checks/findUsers.js"
import { hashPassword, verifyPassword } from "../../utils/passwords/hashPassword.js"
import { authenticateToken } from "../middleware/verifyJWT.js";
const router = Router();

const jwtSecret = process.env.JWT_SECRET;

router.get('/dashboard', authenticateToken, (req, res) => {
    res.send({ customMessage: req.user });
});

router.post("/api/auth/register", async (req, res) => {
    const requestBody = req.body
    const findUserByUsername = await findUser(requestBody.username);
    
    
    if(findUserByUsername.length === 0){
        const {salt, hash} = hashPassword("password");
        
        const insertQuery = "INSERT INTO users (username, salt, password, institution_id, role_id) VALUES (?, ?, ?, ?, ?)";
        const [registeredUser] = await db.connection.query(insertQuery, [requestBody.username, salt, hash, requestBody.institution, requestBody.role]);

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
        const token = jwt.sign(
            {
                username: findUserByUsername.username,
                institution_id: findUserByUsername.institution_id,
                role_id: findUserByUsername.role_id
            },
            process.env.JWT_SECRET, {expiresIn: "120m"}
        );
        const loggedIn = "yes";
        res.cookie('jwt', token, { httpOnly: true, secure: true });
        //res.cookie('logged_in', loggedIn, { httpOnly: true, secure: true });
        res.status(200).send({ message: "Success" });
    }
});

router.get("/api/auth/logout", async (req, res) => {
    try {
        res.clearCookie("jwt");
        res.status(200).send({ message: "User logged out successfully" });
    } catch (error) {
        res.status(500).send({ message: "An error occurred" });
    }
});

export default router;