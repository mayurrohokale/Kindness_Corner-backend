const mongoose = require('mongoose');


const WorksSchema = new mongoose.Schema({
    
        title: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
            
        },
        image: {
            type: String,
            required: true
        },
    
});

const Works = mongoose.model('Works', WorksSchema);

module.exports = Works;