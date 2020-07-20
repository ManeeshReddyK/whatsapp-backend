const { logger } = require('../logs/log4js');
const Message = require('../model/Message.model');
const User = require('../model/User.model');
const Conversation = require('../model/Conversation.model');
const { triggerEventToServerSocket } = require('../socket-controllers/clientsocket.controller');
const s3 = require('../config/aws.config');

exports.getUserContacts = (req, res, next) => {

    logger.info(`getUserContacts method`)

    User.findById(req.userId)
        .populate("contacts.userId", "email status lastSeen profileImage")
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
        .select("email status profileImage")
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
                                        lastSeen: loggedUser.lastSeen,
                                        profileImage: loggedUser.profileImage
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
                                        lastSeen: user.lastSeen,
                                        profileImage: user.profileImage
                                    },
                                    conversation_Id
                                }

                                return res.json({

                                    success: true,
                                    status: 200,
                                    message: `${userToBeAdded} added successfully`,
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
            message: `contact deleted successfully`
        })
    } catch (error) {
        logger.error(`delete method`, error);
        return next(error);
    }

}

exports.deactivateAccount = async (req, res, next) => {
    logger.info(`deactivateAccount method`);

    try {
        let loggedUserId = req.userId;
        let user = await User.findById(loggedUserId);
        for (let contact of user.contacts) {
            await Message.deleteMany({ conversation_Id: contact.conversation_Id });
            await Conversation.deleteOne({ _id: contact.conversation_Id });
            await User.findOneAndUpdate({ _id: loggedUserId, "contacts.userId": contact.userId }, { $pull: { contacts: { userId: contact.userId } } });
            await User.findOneAndUpdate({ _id: contact.userId, "contacts.userId": loggedUserId }, { $pull: { contacts: { userId: loggedUserId } } });
            triggerEventToServerSocket('deleteUser', [contact.userId, loggedUserId]);
        }
        await user.deleteOne()
        logger.info(`Account deactivated successfully for ${user.email}`);
        return res.json({
            success: true,
            status: 200,
            message: `Account has been Deactivated`
        })
    } catch (error) {
        logger.error(`deactivateAccount method`, error);
        return next(error);
    }
}

exports.urlForUserProfile = (req, res, next) => {

    logger.info(`urlForUserProfile method`);

    let key = `${req.userId}/${Date.now()}.${req.query.type}`;
    s3.getSignedUrl("putObject", {
        Bucket: process.env.BUCKET_NAME,
        ContentType: `image/${req.query.type}`,
        Key: key
    }, (err, url) => {
        if (err) {
            logger.error(`getSignedUrl error`);
            logger.error(err);
            let error = new Error("Error in uploading profile image");
            return next(error);
        }
        res.send({
            url,
            key,
            status: 200,
            success: true,
        })
    })
}

exports.uploadUserProfile = async (req, res, next) => {

    logger.info(`uploadUserProfile method`);

    let key = req.body.key;
    let userId = req.userId;

    try {
        let user = await User.findById(userId);
        let previousKey = user.profileImage.split(process.env.AWS_BASE_URL)[1];

        if (user.profileImage !== "https://material.angular.io/assets/img/examples/shiba1.jpg") {
            s3.deleteObject({
                Bucket: process.env.BUCKET_NAME,
                Key: previousKey
            }, async function (err, data) {
                if (!err) {
                    logger.info(`previous image has been deleted`);
                } else {
                    logger.error(`previous  image deleting failed`);
                }
                user.profileImage = `${process.env.AWS_BASE_URL}${key}`;
                try {
                    await user.save();
                    res.send({
                        success: true,
                        status: 200,
                        message: 'Profile image updated successfully',
                        data: user.profileImage
                    })
                } catch (error) {
                    logger.error(`error due to user.save`);
                    logger.error(error);
                    error.message = 'Profile image updation failed';
                    next(error);
                }
            })
        }
        else {
            user.profileImage = `${process.env.AWS_BASE_URL}${key}`;
            try {
                await user.save();
                res.send({
                    success: true,
                    status: 200,
                    message: 'Profile image updated successfully',
                    data: user.profileImage
                })
            } catch (error) {
                logger.error(`error due to user.save`);
                logger.error(error);
                error.message = 'Profile image updation failed';
                next(error);
            }
        }
    } catch (error) {
        logger.error(`error due to user.findById`);
        logger.error(error);
        error.message = 'Profile image updation failed';
        next(error);
    }
}

