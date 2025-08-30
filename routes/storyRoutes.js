const express = require("express");
const router = express.Router();
const Story = require("../models/story");
const authMiddleware = require("../middleware/authMiddleware");
const multer = require("multer");
const path = require("path");
const User = require("../models/User"); // <--- Add this

// Set up multer storage for media files
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "./uploads/stories/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + ext);
  },
});
const upload = multer({ storage });

router.post(
  "/create",
  authMiddleware,
  upload.single("media"),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "Media file required" });

      const userId = req.user.id; // not destructuring as userId from req.user

      const mediaUrl = `/uploads/stories/${req.file.filename}`;
      const mediaType = req.file.mimetype.startsWith("image/") ? "image" : "video";

      const newStory = new Story({
        userId,
        mediaUrl,
        mediaType,
        isStory: true,
      });

      await newStory.save();
      res.status(201).json({ message: "Story created successfully" });
    } catch (error) {
      res.status(500).json({ message: error.message });
    }
  }
);
// GET /api/stories - fetch all active stories (non-expired)
// GET /api/stories - fetch all active stories (non-expired)

router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Fetch current user and their friends
    const user = await User.findById(userId).populate("friends", "_id");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Allowed user IDs = self + friends
    const allowedUsers = [userId, ...user.friends.map(f => f._id)];

    // Fetch stories only from allowed users
    const stories = await Story.find({ 
        userId: { $in: allowedUsers },
        isStory: true
      })
      .sort({ createdAt: -1 })
      .populate("userId", "name profilePic")
      .populate("viewers", "name profilePic")
      .exec();

    res.json(stories);
  } catch (error) {
    console.error("Failed to fetch stories:", error);
    res.status(500).json({ message: "Failed to fetch stories" });
  }
});


// POST /api/stories/:storyId/view - mark story as viewed
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
  } catch (error) {
    console.error("Failed to record view:", error);
    res.status(500).json({ message: "Server error" });
  }
});



module.exports = router;
