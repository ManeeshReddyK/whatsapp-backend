const jwt = require('jsonwebtoken');
const { logger } = require('../logs/log4js');
const User = require('../model/User.model');
const Message = require('../model/Message.model');

exports.authentication = (token, socket) => {

    logger.info(`authentication method of socket`);

    if (token === process.env.JWT_SECRETKEY) {
        logger.info(`server client socket successfully verified`);
        return true;
    }

    if (!token) {
        logger.error(`socket connection failed due to token not found`)
        return false;
    }
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRETKEY);
    } catch (error) {
        logger.error(`socket connection failed due to invalid token`)
        return false;
    }
    logger.info(`Token has verified successfully for socket`);
    socket.userId = decodedToken.id;
    return true;

}

exports.join = (socket) => {
    logger.info(`socket join method`);
    logger.info(`userId id : ${socket.userId}`);
    socket.join(socket.userId);
}

exports.leave = (socket) => {
    logger.info(`socket leave method`);
    logger.info(`userId id : ${socket.userId}`);
    socket.leave(socket.userId);
}

exports.sendMessage = (socket, receiverId, data) => {
    // let data = {
    //     sender:{
    //         email:"senderEmail"
    //     },
    //     content:"message",
    //     "content_type":"message",
    //     time_created:new Date().getTime().toString(),
    //     conversation_Id:"1213156654894984"
    // }

    logger.info(`socket sendMessage method`);
    logger.info(`senderId : ${socket.userId}`);
    logger.info(`receiverId : ${receiverId}`);

    User.findById(socket.userId)
        .then((sender) => {
            if (sender) {
                User.findById(receiverId)
                    .then((receiver) => {
                        if (receiver) {
                            data.sender = socket.userId;
                            Message.create(data)
                                .then(message => {
                                    User.findOneAndUpdate(
                                        {
                                            _id: socket.userId,
                                            "contacts.userId": receiverId
                                        },
                                        {
                                            $set: { "contacts.$.lastMessage_Id": message._id }
                                        }
                                    )
                                        .then(() => {
                                            User.findOneAndUpdate(
                                                {
                                                    _id: receiverId,
                                                    "contacts.userId": socket.userId
                                                },
                                                {
                                                    $set: { "contacts.$.lastMessage_Id": message._id }
                                                }
                                            )
                                                .then(() => {
                                                    data.sender = {
                                                        email: sender.email
                                                    }
                                                    logger.info(`message updated in respective userContacts`);
                                                    socket.broadcast.to(receiverId).emit('receiveMessage', data)
                                                })
                                                .catch((error) => {
                                                    logger.error(`Error in User.findOneAndUpdate :`, error);
                                                })
                                        })
                                        .catch((error) => {
                                            logger.error(`Error in User.findOneAndUpdate :`, error);
                                        })
                                })
                                .catch((error) => {
                                    logger.error(`Error in Message.Create :`, error);
                                })
                        }
                    })
                    .catch((error) => {
                        logger.error(`Error in User.findById :`, error);
                    })
            }
        })
        .catch((error) => {
            logger.error(`Error in User.findById :`, error);
        })
}

exports.status = (socket, status) => {
    logger.info(`socket status method`);

    User.findById(socket.userId)
        .then((user) => {
            if (user) {
                let lastSeen = new Date();
                User.findByIdAndUpdate({ _id: socket.userId }, { status, lastSeen })
                    .then((user) => {
                        user.contacts.forEach(contact => {
                            if (status)
                                socket.broadcast.to(contact.userId).emit('isOnline', socket.userId);
                            else
                                socket.broadcast.to(contact.userId).emit('isOffline', socket.userId);
                        });
                    })
            }
        })
}

exports.userTyping = (socket, receiverId) => {
    logger.info(`socket userTyping method`);

    socket.broadcast.to(receiverId).emit('userTyping', socket.userId);
}

exports.addUser = (socket, userId, data) => {
    logger.info(`socket addUser method`);

    socket.broadcast.to(userId).emit('addUser', data);
}

exports.deleteUser = (socket, userId, data) => {
    logger.info(`socket deleteUser method`);

    socket.broadcast.to(userId).emit('deleteUser', data);
}
