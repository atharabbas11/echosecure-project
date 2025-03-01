//server.js
import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "path";
import { connectDB } from "./lib/db.js";
import authRoutes from "./routes/auth.route.js";
import messageRoutes from "./routes/message.route.js";
import groupRoutes from "./routes/grouproute.js";
import { app, server } from "./lib/socket.js";

dotenv.config();

const PORT = process.env.PORT;
const CLIENT_URL = process.env.CLIENT_URL;

const __dirname = path.resolve();

app.use(cookieParser());
app.use(
  cors({
    origin: CLIENT_URL,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/messages", messageRoutes);
app.use("/api/groups", groupRoutes);
if (process.env.CLIENT_URL === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend", "dist", "index.html"));
  });
}

// Increase the payload size limit for JSON and URL-encoded data
app.use(express.json({ limit: '50mb' }));  // Increase the size limit as necessary
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.options('*', cors());  // Handles pre-flight OPTIONS requests

server.listen(PORT, () => {
  // console.log("server is running on PORT:" + PORT);
  connectDB();
});