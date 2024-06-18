// voteSchema.js
const mongoose = require("mongoose");

const voteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  voteFormId: { type: String, required: true },
  vote: { type: String, enum: ['yes', 'no'], required: true }
});

module.exports = mongoose.model('Vote', voteSchema);
