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

router.post('/api/auth/refresh', async (req, res) => {
    // const refreshToken = req.cookies['refreshToken'];
    const refreshMock = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6OTQsInVzZXJuYW1lIjoiZSIsImluc3RpdHV0aW9uX2lkIjoxLCJlbWFpbCI6ImVAa2VrLmRrIiwiaW5zdGl0dXRpb25fbmFtZSI6IkhlcmxldiBGb2xrZXNrb2xlIiwicm9sZV9uYW1lIjoib3duZXIiLCJyb29tcyI6W3siaWQiOjEwLCJuYW1lIjoibmV3IiwiY291cnNlcyI6W3siaWQiOjIsIm5hbWUiOiJueXQga3Vyc3VzIn0seyJpZCI6MywibmFtZSI6InRlc3Qga3Vyc3VzIn0seyJpZCI6NCwibmFtZSI6Imt1cnN1czMifV19LHsiaWQiOjE3LCJuYW1lIjoiMTIzIiwiY291cnNlcyI6W3siaWQiOjIsIm5hbWUiOiJueXQga3Vyc3VzIn0seyJpZCI6MywibmFtZSI6InRlc3Qga3Vyc3VzIn1dfV0sImlhdCI6MTczMjg5MTk0MCwiZXhwIjoxNzMyOTc4MzQwfQ.TeNrMHhdaDfaM5ysv79DIXA7fE5M2tEI7aN3NBG5AT4";
    const decoded = jwt.verify(refreshMock, jwtSecret);

    const tokenQuery = `
        SELECT user_id
        FROM tokens 
        WHERE user_id = ?`;     
    const [tokens] = await db.connection.query(tokenQuery, [decoded.id]);

    if (tokens.length === 0 || !refreshMock){
        return res.status(401).send('Access Denied. No refresh token provided.');
    }

    try {

        // Correct access token signing by extracting only the necessary fields
        const accessToken = jwt.sign(
            { 
                id: decoded.id, 
                username: decoded.username, 
                email: decoded.email,
                institution_id: decoded.institution_id,
                role_name: decoded.role_name
            },
            jwtSecret, { expiresIn: '1h' }
        );
        
        res.cookie('jwt', accessToken, { httpOnly: true, secure: true });
        res.send({ user: decoded.username }); 
    } catch (error) {
        console.error(error);
        return res.status(400).send('Invalid refresh token.');
    }
});


router.post("/api/auth/register", async (req, res) => {
    const requestBody = req.body

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
    const requestBody = req.body;
    
    try {
        const findUserByEmail = await findUser(requestBody.email); 

        
        if (!findUserByEmail || Object.keys(findUserByEmail).length === 0) {
            return res.status(500).send({ message: "failed" });
        }
        
        const isPasswordValid = verifyPassword(requestBody.password, findUserByEmail.password);
        if (!isPasswordValid) {
            return res.status(400).send({ message: "invalid credentials" });
        }

        // Exclude the password from the JWT payload
        const { password, ...userWithoutPassword } = findUserByEmail;
        userWithoutPassword.isLoggedIn = true
        const accessToken = jwt.sign(
            userWithoutPassword, // Sign without the password
            process.env.JWT_SECRET, 
            { expiresIn: "5m" },
            
        );
        const refreshToken = jwt.sign(
            userWithoutPassword, // Sign without the password
            process.env.JWT_SECRET, 
            { expiresIn: "1d" }
        );  
        const insertQuery = "INSERT INTO tokens (token_string, token_type_id, user_id) VALUES (?, ?, ?)";
        const [refreshTokenFromDb] = await db.connection.query(insertQuery, [refreshToken, 2, findUserByEmail.id]);
        res.cookie('jwt', accessToken, { httpOnly: true, secure: true });
        res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });
        res.status(200).send({ message: "Success" });
    } catch (err) {
        console.error("Error during login:", err);
        res.status(500).send({ message: "Server error" });
    }
});


router.get("/api/auth/logout", async (req, res) => {
    try {
        // Clear the authentication cookies
        res.clearCookie("jwt", { httpOnly: true, secure: true, path: "/" });
        res.clearCookie("refreshToken", { httpOnly: true, secure: true, path: "/" });

        res.status(200).send({ message: "User logged out successfully" });
    } catch (error) {
        res.status(500).send({ message: "An error occurred" });
    }
});

export default router;