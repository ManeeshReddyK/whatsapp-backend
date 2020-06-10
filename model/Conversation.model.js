const mongoose = require('mongoose');

const conservationSchema = new mongoose.Schema({
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    }]
});

module.exports = mongoose.model('Conservation', conservationSchema);