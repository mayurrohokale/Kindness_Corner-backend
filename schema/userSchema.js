const mongoose = require("mongoose");

const userSchema = mongoose.Schema({
  name: { type: String, unique: false },
  email: { type: String, unique: true },
  password: String,
  role: { type: String, default: "user" },
  created_at: { type: Date, default: Date.utcnow },
  phone: {type: String},
  address: {type:String, unique: false},
  state: {type:String},
  city: {type:String},
  pincode: {type:Number},
  is_volunteer: {type: Boolean, default:false},
  status: {type: String, default: true},
});

const User = mongoose.model('User', userSchema);

module.exports = User;