const bcryptjs = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { logger } = require('../logs/log4js');
const User = require('../model/User.model');

exports.register = (req, res, next) => {

    logger.info('register method');

    let userEmail = req.body.email;
    let password = req.body.password;

    User.findOne({ email: userEmail })
        .then(user => {
            if (user) {
                const error = new Error('user already existed');
                error.status = 400;
                logger.error(error.message)
                return next(error)
            }
            else {
                bcryptjs.hash(password, 12)
                    .then((hashedPassword) => {
                        let body = {
                            email: userEmail,
                            password: hashedPassword
                        }
                        User.create(body)
                            .then((user) => {
                                logger.info('user created successfully')
                                return res.json({
                                    status: 200,
                                    success: true,
                                    message: 'user created successfully'
                                })
                            })
                            .catch((error) => {
                                logger.error('user creation failed due to User.create');
                                return next(error)
                            })
                    })
                    .catch((error) => {
                        logger.error('user creation failed due to bcryptjs.hash');
                        return next(error)
                    })
            }
        })
        .catch((error) => {
            logger.error('user creation failed due to User.findOne');
            return next(error)
        })

}

exports.login = (req, res, next) => {

    logger.info('login method');

    User.findOne({ email: req.body.email })
        .then((user) => {
            if (!user) {
                const error = new Error('user does not exist');
                error.status = 400;
                logger.error(error.message);
                return next(error);
            }
            else {
                bcryptjs.compare(req.body.password, user.password)
                    .then((flag) => {
                        if (!flag) {
                            const error = new Error('password is incorrect');
                            error.status = 400;
                            logger.error(error.message);
                            return next(error);
                        }
                        else {
                            logger.info('user successfully loggedIn');
                            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRETKEY, { expiresIn: '1h' });
                            return res.json({
                                status: 200,
                                success: true,
                                token,
                                message: 'user successfully loggedIn'
                            })
                        }
                    })
                    .catch((error) => {
                        logger.error('error due to bcryptjs.compare');
                        return next(error);
                    })
            }
        })
        .catch((error) => {
            logger.error('error due to User.findOne');
            return next(error);
        })
}