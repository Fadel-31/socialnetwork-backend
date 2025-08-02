const express = require("express");
const router = express.Router();
const User = require("../models/User");
const protect = require("../middleware/authMiddleware"); // adjust path

// Update name
router.put("/update-name", protect, async (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ message: "Name is required" });

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { name },
      { new: true, runValidators: true }
    );
    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Name updated", name: updatedUser.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Update bio/status (assuming you added a 'bio' field in User schema)
router.put("/update-bio", protect, async (req, res) => {
  const { bio } = req.body;

  try {
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { bio: bio || "" },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Bio updated", bio: updatedUser.bio });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


// Change password
const bcrypt = require("bcryptjs");

router.put("/change-password", protect, async (req, res) => {
  const { password } = req.body;
  if (!password || password.length < 6)
    return res.status(400).json({ message: "Password must be 6+ characters" });

  try {
    // Hash password first
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update only the password field
    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      { password: hashedPassword },
      { new: true, runValidators: true }
    );

    if (!updatedUser) return res.status(404).json({ message: "User not found" });

    res.json({ message: "Password changed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;
