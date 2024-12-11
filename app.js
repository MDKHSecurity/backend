import express from "express";
import dotenv from "dotenv/config";
import cors from "cors";
import { fileURLToPath } from 'url';
import path from 'path';
import https from 'https';
import fs from 'fs';

const app = express();

// Required to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Set the allowed origin for CORS
const allowedOrigins = "https://localhost:5173";

app.use(
  cors({
    credentials: true,
    origin: allowedOrigins
  })
);

// Import and use your routes
import videoRouter from "./routers/videoRouter/videoRouter.js";
app.use(videoRouter);

import tokenRouter from "./routers/tokenRouter/tokenRouter.js";
app.use(tokenRouter);

import rolesRouter from "./routers/roleRouter/rolesRouter.js";
app.use(rolesRouter);

import questionRouter from "./routers/questionRouter/questionRouter.js";
app.use(questionRouter);

import quizzesRouter from "./routers/quizzesRouter/quizzesRouter.js";
app.use(quizzesRouter);

import institutionRouter from "./routers/institutionRouter/institutionRouter.js";
app.use(institutionRouter);

import courseRouter from "./routers/courseRouter/courseRouter.js";
app.use(courseRouter);

import authRouter from "./routers/authRouter/authRouter.js";
app.use(authRouter);

import userRouter from "./routers/userRouter/userRouter.js";
app.use(userRouter);

import roomsRouter from "./routers/roomsRouter/roomsRouter.js";
app.use(roomsRouter);

import statisticsRouter from "./routers/statisticsRouter/statisticsRouter.js";
app.use(statisticsRouter);

// Create an HTTPS server
const sslServer = https.createServer({
  key: fs.readFileSync(path.join(__dirname, 'cert', 'back-key.pem')),  // Path to private key
  cert: fs.readFileSync(path.join(__dirname, 'cert', 'back-cert.pem')), // Path to certificate
}, app);

// Use environment variable for port, default to 8080 if not set
const PORT = process.env.PORT || 8080;
sslServer.listen(PORT, () => {
  console.log(`Server is running on https://localhost:${PORT}`);
});
