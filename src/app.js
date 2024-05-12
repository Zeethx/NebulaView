import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit:"16kb" }));
app.use(express.static("public"));

app.use(cookieParser());

(async () => {
    try {
        app.on("ready", () => {
            console.log("Server is ready to accept connections");
        });
    } catch (error) {
        console.log("Failed to connect to MongoDB", error);
    }
})()






export default app;