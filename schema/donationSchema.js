const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    contact: {
        type: String,
        required: true
    },
    eventFromDate: {
        type: Date,
        required: true
    },
    eventToDate: {
        type: Date,
        required: true
    }
});

module.exports = mongoose.model('Donation', donationSchema);
