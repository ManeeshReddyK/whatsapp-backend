const mongoose = require('mongoose');

const Schema = mongoose.Schema;

let contactSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    conversation_Id: {
        type: Schema.Types.ObjectId,
        ref: "Conversation",
        required: true
    },
    lastMessage_Id: {
        type: Schema.Types.ObjectId,
        ref: "Message",
    }
})

let userSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true,
    },
    status: {
        type: Boolean,
        default: false,
        required: true
    },
    lastSeen: {
        type: Date,
        default: new Date(),
        required: true
    },
    contacts: [contactSchema]
});

module.exports = mongoose.model('User', userSchema);