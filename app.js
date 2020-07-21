if (!process.env.NODE_ENV) {
    require('dotenv').config();
}
const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const { logger, requestLogger, log4js } = require('./logs/log4js');
const authRoutes = require('./router/auth.routes');
const serviceRoutes = require('./router/services.routes');
const serverSocketController = require('./socket-controllers/serversocket.controller');

mongoose.set('useCreateIndex', true);
mongoose.set('useFindAndModify', false);


const app = express();
const server = http.createServer(app);

app.use(cors())

app.use(log4js.connectLogger(requestLogger));

app.use(express.static('frontend'));

app.use(express.json());

app.use('/auth', authRoutes);

app.use('/api', serviceRoutes);

app.use('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
})

app.use((error, req, res, next) => {
    return res.json({
        status: error.status || 500,
        success: false,
        message: error.message
    })
});

const io = require('socket.io')(server);

io.use((socket, next) => {
    let token = socket.handshake.query.token;
    if (serverSocketController.authentication(token, socket))
        return next();
    else
        return next(new Error(`Authentication Error`));
});

io.on("connection", (socket) => {

    socket.on("join", () => serverSocketController.join(socket));

    socket.on("leave", () => serverSocketController.leave(socket));

    socket.on("status", (...args) => serverSocketController.status(socket, ...args));

    socket.on("userTyping", (...args) => serverSocketController.userTyping(socket, ...args));

    socket.on("sendMessage", (...args) => serverSocketController.sendMessage(socket, ...args));

    socket.on("disconnect", () => serverSocketController.status(socket, false));

    socket.on("addUser", (...args) => serverSocketController.addUser(socket, ...args));

    socket.on("deleteUser", (...args) => serverSocketController.deleteUser(socket, ...args));
});

mongoose.connect(`${process.env.MONGODB_URI}/${process.env.MONGODB_DBNAME}`, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
})
    .then(() => {
        logger.info('mongodb connection established');
        server.listen(process.env.PORT);
    })
    .catch((error) => {
        logger.error('mongodb connection failed');
        logger.error('error :', error);
    });