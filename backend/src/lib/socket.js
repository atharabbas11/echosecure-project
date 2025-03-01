//lib/socket.js
import { Server } from "socket.io";
import http from "http";
import express from "express";
import dotenv from "dotenv";

const app = express();
const server = http.createServer(app);


dotenv.config();
const CLIENT_URL = process.env.CLIENT_URL;

const io = new Server(server, {
  cors: {
    origin: CLIENT_URL,
    methods: ["GET", "POST"],
    credentials: true, // Allow cookies and authentication headers
  },
});

// used to store online users
const userSocketMap = {}; // {userId: socketId}

export function getReceiverSocketId(userId) {
  return userSocketMap[userId];
}

io.on("connection", (socket) => {
  // console.log("A user connected", socket.id);

  const userId = socket.handshake.query.userId;
  if (userId) {
    userSocketMap[userId] = socket.id;
    // console.log("User connected:", userId, "Socket ID:", socket.id); // Log user connection
  }
  
  // Listen for typing events
  socket.on('typing', (data) => {
    // console.log(`${data.senderId} is typing...`);
    // Emit the typing event to the other user
    socket.to(data.receiverId).emit('typing', data);
  });

  socket.on('groupTyping', (data) => {
    // console.log(`${data.senderId} is typing in group ${data.groupId}...`);
    const group = groups.find(g => g._id === data.groupId);
    group.members.forEach(memberId => {
      if (memberId !== data.senderId) {
        const memberSocketId = getReceiverSocketId(memberId);
        if (memberSocketId) {
          io.to(memberSocketId).emit('groupTyping', data);
        }
      }
    });
  });

  // Notify all clients about online users
  io.emit("getOnlineUsers", Object.keys(userSocketMap));

  socket.on("sendGroupMessage", async (message) => {
  });

  socket.on("newGroupMessage", (message) => {
    // Handle new group message
    setGroupMessages((prevMessages) => [...prevMessages, message]);
  });
  
  // io.emit() is used to send events to all the connected clients
  io.emit("getOnlineUsers", Object.keys(userSocketMap));
  socket.on("disconnect", () => {
    // console.log("A user disconnected", socket.id);
    delete userSocketMap[userId];
    io.emit("getOnlineUsers", Object.keys(userSocketMap));
  });
});

export { io, app, server };
