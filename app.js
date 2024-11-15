import express from "express";
import dotenv from "dotenv/config";

const app = express();




app.use(express.urlencoded({ extended: true }));
app.use(express.json());

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
