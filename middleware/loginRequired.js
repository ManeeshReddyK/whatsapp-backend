const jwt = require('jsonwebtoken');
const { logger } = require('../logs/log4js');

module.exports = (req, res, next) => {
    logger.info(`loginRequired method`);
    let authorization = req.get('Authorization');
    if (!authorization) {
        let error = new Error('Authorization header value not found');
        error.status = 401;
        return next(error);
    }
    let token = authorization.split(' ')[1];
    let decodedToken;
    try {
        decodedToken = jwt.verify(token, process.env.JWT_SECRETKEY);
    } catch (error) {
        logger.error(`invalid token`)
        logger.error(error);
        error.status = 401;
        error.message = `Unauthorised`;
        return next(error);
    }
    logger.info(`Token has verified successfully`);
    req.userId = decodedToken.id;
    next();
}