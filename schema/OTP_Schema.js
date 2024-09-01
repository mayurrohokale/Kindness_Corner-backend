const mongoose = require("mongoose");


const OTPSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
        },
        otp: {
            type: Number,
            required: true
            },
            createdAt: {
                type: Date,
                default: Date.now,
                expires: 60 * 10,
                
            }
});
module.exports = mongoose.model('OTP', OTPSchema);