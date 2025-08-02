const mongoose = require("mongoose");

const storySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  mediaUrl: String,
  mediaType: String,
  createdAt: { type: Date, default: Date.now, index: { expires: '24h' } },
  isStory: { type: Boolean, default: true },
  viewers: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  // other fields
});

const Story = mongoose.model("Story", storySchema);
module.exports = Story;
