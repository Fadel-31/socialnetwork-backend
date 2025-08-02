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

// Socket.IO setup
const io = new Server(server, {
  cors: {
    origin: "https://socialnetwork-frontend-psi.vercel.app", // your frontend deployed URL
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // added missing methods
    credentials: true,
  },
  transports: ["websocket", "polling"], // explicit transports
});

// Socket.IO connection
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

// Middlewares
app.use(cors({
  origin: "https://socialnetwork-frontend-psi.vercel.app",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"], // match Socket.IO
  credentials: true,
}));
app.options("*", cors({  // Handle preflight requests for all routes
  origin: "https://socialnetwork-frontend-psi.vercel.app",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  credentials: true,
}));
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
