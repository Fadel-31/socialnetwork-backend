const express = require("express");
const router = express.Router();
const auth = require("../middleware/authMiddleware");
const FriendRequest = require("../models/FriendRequest");
const User = require("../models/User");
const Message = require("../models/Message");
console.log("✅ friendsRoutes.js loaded");

// Send a friend request
router.post("/add/:userId", auth, async (req, res) => {
  try {

    console.log("Friend add request from:", req.user.id, "to:", req.params.userId);

    if (req.user.id === req.params.userId) {
      return res.status(400).json({ message: "Cannot add yourself as friend" });
    }

    const existing = await FriendRequest.findOne({
      $or: [
        { from: req.user.id, to: req.params.userId },
        { from: req.params.userId, to: req.user.id },
      ],
      status: { $in: ["pending", "accepted"] },
    });
    if (existing) {
      return res.status(400).json({ message: "Friend request already exists" });
    }

    const request = new FriendRequest({ from: req.user.id, to: req.params.userId });
    await request.save();
    res.json({ message: "Friend request sent" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// Accept a friend request
router.post("/accept/:requestId", auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request || request.to.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (request.to.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    request.status = "accepted";
    await request.save();
    res.json({ message: "Friend request accepted" });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get all accepted friends
router.get("/list", auth, async (req, res) => {
  try {
    const friends = await FriendRequest.find({
      $or: [{ from: req.user.id }, { to: req.user.id }],
      status: "accepted",
    }).populate("from to", "name email profilePic");
    
    const friendList = friends.map((f) =>
      f.from._id.toString() === req.user.id ? f.to : f.from
    );

    res.json(friendList);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/requests", auth, async (req, res) => {
  try {
    const requests = await FriendRequest.find({
      to: req.user.id,
      status: "pending",
    }).populate("from", "name email");
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/sent", auth, async (req, res) => {
  try {
    const sent = await FriendRequest.find({
      from: req.user.id,
      status: "pending",
    }).populate("to", "name email");
    res.json(sent);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.post("/reject/:requestId", auth, async (req, res) => {
  try {
    const request = await FriendRequest.findById(req.params.requestId);
    if (!request) {
      return res.status(404).json({ message: "Friend request not found" });
    }
    if (
      request.to.toString() !== req.user.id &&
      request.from.toString() !== req.user.id
    ) {
      return res.status(403).json({ message: "Not authorized" });
    }
    request.status = "rejected";
    await request.save();
    res.json({ message: "Friend request rejected" });
  } catch (err) {
    console.error("Reject friend request error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// /api/friends/list
router.get("/list", auth, async (req, res) => {
  console.log("HIT: /api/friends/list"); // ← Add this
  const friends = await FriendRequest.find({
    $or: [{ from: req.user.id }, { to: req.user.id }],
    status: "accepted",
  }).populate("from to", "name email profilePic")


    // ✅ Log the populated result
    console.log("Populated Friends List:", friends);

  const friendList = friends.map((f) =>
    f.from._id.toString() === req.user.id ? f.to : f.from
  );

  res.json(friendList);
});

// GET /api/user/:id
router.get("/:id", auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/posts/user/:userId
router.get("/user/:userId", auth, async (req, res) => {
  try {
    const posts = await Post.find({ author: req.params.userId }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Unfriend a user
router.post("/remove/:userId", auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const request = await FriendRequest.findOneAndDelete({
      $or: [
        { from: currentUserId, to: userId, status: "accepted" },
        { from: userId, to: currentUserId, status: "accepted" },
      ],
    });

    if (!request) {
      return res.status(404).json({ message: "Friend not found" });
    }

    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error("Error removing friend:", err);
    res.status(500).json({ message: "Server error" });
  }
});









module.exports = router;
