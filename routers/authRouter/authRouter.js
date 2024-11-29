import { Router } from "express";
import pbkdf2 from "pbkdf2";
import db from "../../database/database.js";
import jwt from "jsonwebtoken";
import { findUser } from "../../utils/checks/findUsers.js"
import { hashElement, verifyPassword } from "../../utils/passwords/hashPassword.js"
import { authenticateToken } from "../middleware/verifyJWT.js";
const router = Router();

const jwtSecret = process.env.JWT_SECRET;

router.get('/dashboard', authenticateToken, (req, res) => {
    res.send({ customMessage: req.user });
});

router.post("/api/auth/register", async (req, res) => {
    const requestBody = req.body
    console.log(requestBody)
    const findUserByUsername = await findUser(requestBody.email);
    if(findUserByUsername.length === 0){
        const {hash} = hashElement(requestBody.password);
        const insertQuery = "INSERT INTO users (username, password, institution_id, role_id, email) VALUES (?, ?, ?, ?, ?)";
        const [registeredUser] = await db.connection.query(insertQuery, [requestBody.username, hash, requestBody.institution, requestBody.role_id, requestBody.email]);
        res.status(200).json({success: true, data: registeredUser}); 
    }else{
        res.status(500).send({message: "failed"});
    }
});

router.post("/api/auth/login", async (req, res) => {
    const requestBody = req.body
    const [findUserByEmail] = await findUser(requestBody.email); 
    console.log(findUserByEmail)
    if(findUserByEmail.length === 0){
        res.status(500).send({message: "failed"});
    }else{
        const isPasswordValid = verifyPassword(requestBody.password, findUserByEmail.password)
        console.log(isPasswordValid)
        if(!isPasswordValid){
            return res.status(400).send({message: "invalid credentials"})
        }
        const token = jwt.sign(
            {
                username: findUserByEmail.username,
                institution_id: findUserByEmail.institution_id,
                role_id: findUserByEmail.role_id
            },
            process.env.JWT_SECRET, {expiresIn: "30m"}
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