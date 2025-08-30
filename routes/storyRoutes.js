const express = require("express");
const router = express.Router();
const Story = require("../models/story");
const User = require("../models/User"); // ensure path matches your project
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads/stories/"),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname)),
});
const upload = multer({ storage });

// Create story
router.post("/create", authMiddleware, upload.single("media"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "Media file required" });

    const userId = req.user.id;
    const mediaUrl = `/uploads/stories/${req.file.filename}`;
    const mediaType = req.file.mimetype.startsWith("image/") ? "image" : "video";

    const newStory = new Story({ userId, mediaUrl, mediaType, isStory: true });
    await newStory.save();

    res.status(201).json({ message: "Story created successfully", story: newStory });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all stories for self + friends
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId).populate("friends", "_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    const allowedUsers = [userId, ...user.friends.map(f => f._id)];

    const stories = await Story.find({ userId: { $in: allowedUsers }, isStory: true })
      .sort({ createdAt: -1 })
      .populate("userId", "name email profilePic") // include email
      .populate("viewers", "name profilePic")
      .exec();

    // Group stories by user
    const grouped = [];
    const map = new Map();

    stories.forEach(s => {
      const uid = s.userId._id.toString();
      if (!map.has(uid)) {
        map.set(uid, { user: s.userId, stories: [] });
      }
      map.get(uid).stories.push(s);
    });

    res.json(Array.from(map.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch stories" });
  }
});

// Delete a story
router.delete("/:storyId", authMiddleware, async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });
    if (story.userId.toString() !== userId) return res.status(403).json({ message: "Not allowed" });

    await story.remove();
    res.json({ message: "Story deleted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to delete story" });
  }
});


// Mark story as viewed
router.post("/:storyId/view", authMiddleware, async (req, res) => {
  try {
    const { storyId } = req.params;
    const userId = req.user.id;

    const story = await Story.findById(storyId);
    if (!story) return res.status(404).json({ message: "Story not found" });

    if (!story.viewers.includes(userId)) {
      story.viewers.push(userId);
      await story.save();
    }

    res.json({ message: "View recorded" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
