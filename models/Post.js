const mongoose = require('mongoose');


const commentSchema = new mongoose.Schema({
  text: String,
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // must reference User
});


const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  imageUrl: {
    type: String,
    // remove required here to allow posts without images
    // required: true,
  },
  mediaUrl: { type: String },       // URL/path to the image or video file
  mediaType: { type: String },      // "image" or "video",
  description: {
    type: String,
    default: '',
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [
    {
      user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      text: String,
    },
  ],
}, { timestamps: true });


module.exports = mongoose.model('Post', postSchema);


