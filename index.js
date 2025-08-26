const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const path = require("path");
const { Server } = require("socket.io");

// Load environment variables
dotenv.config();

// Create app and HTTP server
const app = express();
const server = http.createServer(app);

// ✅ Allowed origins
const allowedOrigins = [
  "http://localhost:5173", // Local frontend
  "https://socialnetwork-frontend-psi.vercel.app/" // Deployed frontend
];

// ✅ CORS setup for Socket.IO
const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:5173", // local frontend
      "https://socialnetwork-frontend-psi.vercel.app", // deployed frontend
      "https://socialnetwork-backend-production-7e1a.up.railway.app" // Railway domain
    ],
    methods: ["GET", "POST"],
    credentials: true,
  },
  transports: ["websocket"], // force WebSocket
});


// ✅ Socket.IO connection
io.on("connection", (socket) => {
  console.log("✅ New client connected:", socket.id);

  // Join user-specific room
  socket.on("joinRoom", ({ userId }) => {
    socket.join(userId);
    console.log(`User ${userId} joined room ${userId}`);
  });

  // Handle chat messages
  socket.on("sendMessage", ({ sender, receiver, text }) => {
    console.log(`💬 ${sender} → ${receiver}: ${text}`);
    io.to(receiver).emit("newMessage", { sender, receiver, text });
    io.to(sender).emit("newMessage", { sender, receiver, text });
  });

  socket.on("disconnect", () => {
    console.log("❌ Client disconnected:", socket.id);
  });
});

// Make io accessible to routes
app.set("io", io);

// ✅ CORS middleware for REST APIs
app.use(
  cors({
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
  })
);

// ✅ Force CORS headers for Railway proxy (important!)
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
  }
  res.header("Access-Control-Allow-Credentials", "true");
  res.header(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization"
  );
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// Middlewares
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Routes
const userRoutes = require("./routes/user");
const authRoutes = require("./routes/auth");
const postRoutes = require("./routes/posts");
const friendRoutes = require("./routes/friends");
const storyRoutes = require("./routes/storyRoutes");
const messageRoutes = require("./routes/messageRoutes");
const profileRoutes = require("./routes/profileRoutes");

app.use("/api/user", profileRoutes);
app.use("/api/user", userRoutes); // /api/user/search
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/friends", friendRoutes);
app.use("/api/stories", storyRoutes);
app.use("/api/messages", messageRoutes);

// Test route
app.get("/", (req, res) => {
  res.send("API is running...");
});

// MongoDB and start server
const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");
    server.listen(PORT, () =>
      console.log(`🚀 Server running on http://localhost:${PORT}`)
    );
  })
  .catch((err) => console.error("❌ MongoDB connection error:", err));

module.exports = { app, server, io };
