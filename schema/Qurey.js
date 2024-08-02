
const mongoose = require('mongoose');

const querySchema = new mongoose.Schema({
 email :{
    type: String,
    required: true,
 },
 subject: {
    type: String,
    required: true,
 },
 description : {
    type: String,
    required: true,
 }
});

const Query = mongoose.model('Query', querySchema);

module.exports = Query;
