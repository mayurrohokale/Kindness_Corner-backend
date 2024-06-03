const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: { type: String, unique: false },
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  created_at: { type: Date, default: Date.utcnow },
});

const User = mongoose.model('User', userSchema);

module.exports = User;