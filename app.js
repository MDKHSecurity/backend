import express from "express";
import dotenv from "dotenv/config";
import cors from "cors";

const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const allowedOrigins = "http://localhost:5173"

app.use(
  cors({
    credentials: true,
    origin: true
  })
);

import videoRouter from "./routers/videoRouter/videoRouter.js";
app.use(videoRouter);

import authRouter from "./routers/authRouter/authRouter.js";
app.use(authRouter);

import userRouter from "./routers/userRouter/userRouter.js";
app.use(userRouter);

const PORT = 8080 || process.env.PORT;
app.listen(PORT, () => {{
    console.log("Server is running on port", PORT);
}});
