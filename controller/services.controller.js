const { logger } = require('../logs/log4js');
const Message = require('../model/Message.model');
const User = require('../model/User.model');

exports.getUserContacts = (req, res, next) => {

    logger.info(`getUserContacts method`)

    User.findById(req.userId)
        .populate("contacts.userId", "email")
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
        .select("email -_id")
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

    let conversation_id = req.header('conversation_id');
    Message.find({ conversation_id })
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

            error.message`messages retriving failed`;
            return next(error);
        })
}
