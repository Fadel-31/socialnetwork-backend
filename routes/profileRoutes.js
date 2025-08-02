const express = require("express");
const router = express.Router();
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const bcrypt = require("bcryptjs");
const multer = require("multer");
const path = require("path");

// ================= Multer setup =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/profilePics");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + path.extname(file.originalname)); // unique name
  },
});

const upload = multer({ storage });

// ================= Upload Profile Picture =================
router.post(
  "/upload-profile-pic",
  protect,
  upload.single("profilePic"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const user = await User.findByIdAndUpdate(
        req.user.id,
        { profilePic: `/uploads/profilePics/${req.file.filename}` },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ message: "Profile picture updated", profilePic: user.profilePic });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// ================= Update Name =================
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

// ================= Update Bio =================
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

// ================= Change Password =================
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


router.post(
  "/cover-pic",
  protect,
  upload.single("coverPic"),
  async (req, res) => {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { coverPic: `/uploads/profile-pics/${req.file.filename}` },
      { new: true }
    );
    res.json({ message: "Cover picture updated", coverPic: user.coverPic });
  }
);


module.exports = router;
