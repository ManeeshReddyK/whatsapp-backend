const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        required: true
    },
    content_type: {
        type: String,
        required: true
    },
    time_created: {
        type: Date,
        required: true
    },
    conversation_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    }
});

module.exports = mongoose.model('Message', messageSchema);