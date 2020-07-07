const { logger } = require('../logs/log4js');
const Message = require('../model/Message.model');
const User = require('../model/User.model');
const Conversation = require('../model/Conversation.model');
const { triggerEventToServerSocket } = require('../socket-controllers/clientsocket.controller');

exports.getUserContacts = (req, res, next) => {

    logger.info(`getUserContacts method`)

    User.findById(req.userId)
        .populate("contacts.userId", "email status lastSeen")
        .populate({
            path: "contacts.lastMessage_Id",
            select: "sender content content_type time_created -_id",
            populate: {
                path: "sender",
                select: "email -_id"
            }
        })
        .then((user) => {
            if (!user) {
                logger.error(`User doesn't exist in db`)
                let error = new Error(`User doesn't exist in db`);
                error.status = 400;
                return next(error);
            }
            logger.info(`User contacts retrived successfully`);
            return res.json({
                success: true,
                status: 200,
                message: `User contacts retrived successfully`,
                data: user.contacts
            })
        })
}

exports.getUserProfile = (req, res, next) => {

    logger.info(`getUserProfile method`);

    User.findById(req.userId)
        .select("email status -_id")
        .then((user) => {
            if (!user) {

                logger.error(`User doesn't exist in db`);

                let error = new Error(`User doesn't exist in db`);
                error.status = 400;
                return next(error);
            }
            return res.json({
                success: true,
                status: 200,
                message: `User profile successfully retrived`,
                data: user
            })
        })
        .catch((error) => {

            logger.error(`error due to User.findById`);
            logger.error(error);

            error.message = `User profile retriving failed`;
            return next(error);
        })
}

exports.getUserMessages = (req, res, next) => {

    logger.info(`getUserMessages method`);

    let conversation_Id = req.header('conversation_Id');
    Message.find({ conversation_Id })
        .populate("sender", "email -_id")
        .then((messages) => {
            return res.json({
                success: true,
                status: 200,
                message: `messages retrived successfully`,
                data: messages
            })
        })
        .catch((error) => {

            logger.error(`messages retriving failed`);
            logger.error(error);

            error.message = `messages retriving failed`;
            return next(error);
        })
}

exports.addUser = (req, res, next) => {

    logger.info(`addUser method`);

    let userToBeAdded = req.params.email;

    User.findById(req.userId)
        .then(loggedUser => {
            if (loggedUser.email === userToBeAdded) {

                logger.error(`Trying to add yourself not possible`);

                let error = new Error(`Trying to add yourself not possible`);
                error.status = 400;
                return next(error);
            }

            User.findOne({ email: userToBeAdded })
                .then(user => {

                    if (!user) {

                        logger.error(`${userToBeAdded} doesn't exists in db`);

                        let error = new Error(`${userToBeAdded} doesn't exists in db`);
                        error.status = 400;
                        return next(error);
                    }

                    let index = loggedUser.contacts.findIndex(contact => {
                        return user._id.toString() === contact.userId.toString();
                    })

                    if (index !== -1) {

                        logger.error(`${userToBeAdded} already existed in contacts`);

                        let error = new Error(`${userToBeAdded} already existed in contacts`);
                        error.status = 400;
                        return next(error);
                    }
                    else {

                        let conversation = new Conversation({
                            participants: [loggedUser._id, user._id]
                        })

                        let conversation_Id;

                        conversation.save()
                            .then((conversation) => {

                                conversation_Id = conversation._id;

                                logger.info(`conversation has been created`);
                                loggedUser.contacts.push({
                                    userId: user._id,
                                    conversation_Id
                                })

                                return loggedUser.save();
                            })
                            .then(() => {

                                logger.info(`loggedUser contacts with ${userToBeAdded} added successfully`);

                                user.contacts.push({
                                    userId: loggedUser._id,
                                    conversation_Id
                                })

                                return user.save();
                            })
                            .then(() => {

                                logger.info(`${userToBeAdded} contacts with loggedUser added successfully`);

                                let receiverAddContact = {
                                    userId: {
                                        email: loggedUser.email,
                                        _id: loggedUser._id,
                                        status: loggedUser.status,
                                        lastSeen: loggedUser.lastSeen
                                    },
                                    conversation_Id
                                }

                                logger.info(`addUser triggered to receiver also`);

                                triggerEventToServerSocket('addUser', [user._id, receiverAddContact]);

                                let addedContact = {
                                    userId: {
                                        email: user.email,
                                        _id: user._id,
                                        status: user.status,
                                        lastSeen: user.lastSeen
                                    },
                                    conversation_Id
                                }

                                return res.json({

                                    success: true,
                                    status: 200,
                                    message: `logged user contacts updated successfully`,
                                    data: addedContact

                                })
                            })
                            .catch((error) => {
                                logger.error(`error in conversation.save`);
                                logger.error(error);

                                error.message = `adding ${userToBeAdded} in contacts has been failed `;
                                return next(error);
                            })

                    }
                }).catch((error) => {
                    logger.error(`error in findOne`);
                    logger.error(error);

                    error.message = `adding ${userToBeAdded} in contacts has been failed `;
                    return next(error);
                })

        }).catch((error) => {
            logger.error(`error in findById`);
            logger.error(error);

            error.message = `adding ${userToBeAdded} in contacts has been failed `;
            return next(error);
        })
}

exports.deleteUser = async (req, res, next) => {

    logger.info(`deleteUser method`);

    let userId = req.params.userId;
    let loggedUserId = req.userId

    try {
        let user = await User.findOne({ _id: loggedUserId, "contacts.userId": userId })
        if (!user) {
            logger.info(`User not found in contacts list of logged user`);
            return res.json({
                success: false,
                status: 404,
                message: `User not found in contacts list`
            })
        }
        let index = user.contacts.findIndex(element => element.userId.toString() === userId);
        let userContact = user.contacts[index];
        await Message.deleteMany({ conversation_Id: userContact.conversation_Id });
        await Conversation.deleteOne({ _id: userContact.conversation_Id });
        await User.findOneAndUpdate({ _id: loggedUserId, "contacts.userId": userId }, { $pull: { contacts: { userId } } });
        await User.findOneAndUpdate({ _id: userId, "contacts.userId": loggedUserId }, { $pull: { contacts: { userId: loggedUserId } } });

        triggerEventToServerSocket('deleteUser', [userId, loggedUserId]);

        return res.json({
            success: true,
            status: 200,
            message: `User deleted successfully`
        })
    } catch (error) {
        logger.error(error);
        return next(error);
    }

}
