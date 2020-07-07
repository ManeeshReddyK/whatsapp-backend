const io = require('socket.io-client');
const { logger } = require('../logs/log4js');

let clientSocket;
let isInitialised = false;

const intialiseSocket = (eventName, args) => {

    logger.info(`initialise client socket method`);

    isInitialised = true;

    let url;

    if (process.env.NODE_ENV) {
        url = process.env.PRODUCTION_URL;
    }
    else {
        url = `${process.env.PROTOCOL}://${process.env.IP}:${process.env.PORT}`;
    }

    clientSocket = io.connect(url, {
        query: {
            token: process.env.JWT_SECRETKEY
        }
    })

    clientSocket.on('connect', () => {
        clientSocket.emit(eventName, ...args);
    })

}

exports.triggerEventToServerSocket = (eventName, args) => {

    logger.info('triggerEventToServerSocket method');
    logger.info(`EventName:${eventName} and args: ${JSON.stringify(args)}`);

    if (!isInitialised) {
        intialiseSocket(eventName, args);
    }
    else {
        clientSocket.emit(eventName, ...args);
    }
}


