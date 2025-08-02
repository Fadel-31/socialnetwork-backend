const express = require("express");
const router = express.Router();
const authMiddleware = require("../middleware/authMiddleware"); // your auth middleware
const Post = require("../models/Post");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");
const upload = require('../middleware/upload');
const { io } = require('../index');

// GET all posts (with user info)
router.get("/all", authMiddleware, async (req, res) => {
  try {
    const posts = await Post.find()
      .populate("author", "name email")  // populate author with username and email
      .populate("comments.user", "name profilePic") // populate each comment's user with username
      .sort({ createdAt: -1 });



    // Add this debug line below to see exactly what is populated:
    console.log(JSON.stringify(posts, null, 2));



    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET posts by logged-in user
// Already in your code, but make sure it's like this:
router.get("/mine", protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const posts = await Post.find({ author: userId })
      .populate("author", "name email")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


// GET posts by any user ID with populated author & comments
router.get("/user/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = req.params.userId;

    const posts = await Post.find({ author: userId })
      .populate("author", "name email")
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    res.json(posts);
  } catch (error) {
    console.error("Failed to get posts by user:", error);
    res.status(500).json({ message: "Server error" });
  }
});


// Create post with image upload
router.post('/create', protect, upload.single('image'), async (req, res) => {
  try {
    const description = req.body.description || '';
    const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const newPost = new Post({
      author: req.user.id,
      imageUrl,
      description,
    });

    await newPost.save();
    res.status(201).json(newPost);
  } catch (error) {
    console.error('[POST CREATE ERROR]', error);
    res.status(500).json({ message: 'Server error' });
  }
});





// Like/unlike post
// Like/unlike post
router.post('/:postId/like', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const userId = req.user.id;
    const index = post.likes.findIndex(id => id.toString() === userId);

    if (index === -1) post.likes.push(userId);
    else post.likes.splice(index, 1);

    const updatedPost = await post.save();
    await updatedPost.populate('author', 'name email');
    await updatedPost.populate("comments.user", "name profilePic");

    // Get io instance from req.app
    const io = req.app.get('io');
    if (io) {
      io.emit('postUpdated', updatedPost);
    }

    res.status(200).json({ likesCount: updatedPost.likes.length });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Add comment
router.post('/:postId/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ message: 'Comment required' });

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ user: req.user.id, text });
    const updatedPost = await post.save();
    await updatedPost.populate('author', 'name email');
    await updatedPost.populate("comments.user", "name profilePic");

    const io = req.app.get('io');
    if (io) {
      io.emit('postUpdated', updatedPost);
    }

    res.status(201).json(updatedPost.comments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
});





router.get('/feed', protect, async (req, res) => {
  try {
    const userId = req.user.id;

    const FriendRequest = require('../models/FriendRequest');

    // Get accepted friend requests where current user is involved
    const acceptedRequests = await FriendRequest.find({
      status: 'accepted',
      $or: [{ from: userId }, { to: userId }]
    });

    // Build friendIds list
    const friendIds = new Set([userId]); // include own posts

    acceptedRequests.forEach(req => {
      const friendId = req.from.toString() === userId ? req.to.toString() : req.from.toString();
      friendIds.add(friendId);
    });

    console.log('Friend IDs:', Array.from(friendIds));

    // Fetch posts by user and their friends
    const posts = await Post.find({ author: { $in: Array.from(friendIds) } })
      .populate('author', 'name profilePic bio')
      // for the post author
      .populate("comments.user", "name profilePic")
      .sort({ createdAt: -1 });

    res.status(200).json(posts);

  } catch (error) {
    console.error('[FEED ERROR]', error);
    res.status(500).json({ message: 'Server error' });
  }
});




// DELETE post by ID
router.delete('/:id', protect, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    // Optional: Check if the user is the author of the post
    if (post.author.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this post" });
    }

    await post.deleteOne();

    res.status(200).json({ message: "Post deleted successfully" });
  } catch (error) {
    console.error("[DELETE POST ERROR]", error);
    res.status(500).json({ message: "Server error" });
  }
});











module.exports = router;
