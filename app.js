if (!process.env.NODE_ENV) {
    require('dotenv').config();
}
const express = require('express');

const { logger, requestLogger, log4js } = require('./logs/log4js');
const mongoose = require('mongoose');
const authRoutes = require('./router/auth.routes');
const serviceRoutes = require('./router/services.routes');

const app = express();

app.use(log4js.connectLogger(requestLogger));

app.use(express.json());

app.use('/auth', authRoutes);

app.use('/api', serviceRoutes);

app.use((error, req, res, next) => {
    return res.json({
        status: error.status || 500,
        success: false,
        message: error.message
    })
})

mongoose.connect(`${process.env.MONGODB_URI}/${process.env.MONGODB_DBNAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        logger.info('mongodb connection established');
        app.listen(process.env.PORT);
    })
    .catch((error) => {
        logger.error('mongodb connection failed');
        logger.error('error :', error);
    })