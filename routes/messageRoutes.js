const express = require("express");
const router = express.Router();
const Message = require("../models/Message");
const authMiddleware = require("../middleware/authMiddleware");

// Send a message
router.post("/", authMiddleware, async (req, res) => {
  const { receiverId, text } = req.body;

  console.log("📨 New message incoming:", req.body);

  try {
    const message = new Message({
      sender: req.user.id, // Make sure authMiddleware sets req.user.id
      receiver: receiverId,
      text,
    });

    await message.save();

    // Populate sender info for frontend usage
    await message.populate("sender", "name profilePic");

    // Emit new message to both sender and receiver rooms
    const io = req.app.get("io");
    io.to(req.user.id).emit("newMessage", message);
    io.to(receiverId).emit("newMessage", message);


    res.status(201).json(message);
  } catch (err) {
    console.error("❌ Message creation failed:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

// Get messages between two users
router.get("/:friendId", authMiddleware, async (req, res) => {
  try {
    const messages = await Message.find({
      $or: [
        { sender: req.user.id, receiver: req.params.friendId },
        { sender: req.params.friendId, receiver: req.user.id },
      ],
    })
      .sort("createdAt")
      .populate("sender", "name profilePic"); // populate sender info for display

    res.json(messages);
  } catch (err) {
    console.error("❌ Failed to fetch messages:", err);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
});

// DELETE a message by ID
router.delete("/:messageId", authMiddleware, async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);

    if (!message) return res.status(404).json({ error: "Message not found" });

    // Only the sender can delete the message
    if (message.sender.toString() !== req.user.id)
      return res.status(403).json({ error: "Unauthorized" });

    await message.deleteOne();

    // Emit deletion to both users
    const io = req.app.get("io");
    io.to(message.sender.toString()).emit("messageDeleted", message._id);
    io.to(message.receiver.toString()).emit("messageDeleted", message._id);

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete message" });
  }
});


module.exports = router;
