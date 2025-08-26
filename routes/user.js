const express = require("express");
const router = express.Router();
const protect = require("../middleware/authMiddleware");
const User = require("../models/User");
const multer = require("multer");
const path = require("path");

// Multer storage for profile pictures
const profileStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/profilePics/");
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + path.extname(file.originalname)); // e.g., userId.jpg
  },
});
const uploadProfile = multer({ storage: profileStorage });

// Multer storage for cover pictures
const coverStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads/coverPics/");
  },
  filename: function (req, file, cb) {
    cb(null, req.user.id + path.extname(file.originalname)); // e.g., userId.jpg
  },
});
const uploadCover = multer({ storage: coverStorage });

// GET /api/user/profile — only accessible if logged in
router.get("/profile", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    console.log("req.user from token:", req.user);
    if (!user) return res.status(404).json({ message: "User not found" });

    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.get("/all", protect, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user.id } }).select(
      "name email"
    );
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/me", protect, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Error in /me route:", err);
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const userId = req.params.id;
    console.log("Fetching user with ID:", userId);
    const user = await User.findById(userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Profile picture upload route
router.post("/profile-pic", protect, uploadProfile.single("profilePic"), async (req, res) => {
  console.log("🔹 Profile upload route hit");
  console.log("req.user:", req.user);
  console.log("req.file:", req.file);

  if (!req.file) {
    console.log("⚠ No file uploaded");
    return res.status(400).json({ message: "No file uploaded" });
  }

  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePic: `/uploads/profilePics/${req.file.filename}` },
      { new: true }
    );
    console.log("✅ Updated user:", user);
    res.json({ message: "Profile picture updated", profilePic: user.profilePic });
  } catch (err) {
    console.error("❌ Upload error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});



// Cover picture upload route
router.post(
  "/cover-pic",
  protect,
  uploadCover.single("coverPic"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded" });

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { coverPic: `/uploads/coverPics/${req.file.filename}` },
        { new: true }
      );

      res.json({ message: "Cover image updated", coverPic: user.coverPic });
    } catch (err) {
      console.error("Error uploading cover image:", err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

router.get("/search", protect, async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) return res.status(400).json({ message: "Query is required" });

    const loggedInUser = await User.findById(req.user.id);
    if (!loggedInUser) return res.status(404).json({ message: "User not found" });

    const users = await User.find({
      username: { $regex: query, $options: "i" },
      _id: { $ne: req.user.id },
    }).select("username email friends");

    const results = users.map((u) => ({
      id: u._id,
      username: u.username,
      isFriend: loggedInUser.friends.some((friendId) =>
        friendId.equals(u._id)
      ),
    }));

    res.json(results);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Server error" });
  }
});
// Update user profile info (name, bio)
router.put("/:id", protect, async (req, res) => {
  try {
    const { name, bio } = req.body;
    const userId = req.params.id;

    // Optional: you may want to check if req.user.id === userId for security

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { name, bio },
      { new: true, runValidators: true }
    ).select("-password");

    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(updatedUser);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
