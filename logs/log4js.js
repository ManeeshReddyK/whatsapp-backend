const log4js = require('log4js');
const log4js_extend = require('log4js-extend');

log4js.configure({
    appenders: {
        console: {
            type: 'console'
        },
        logs: {
            type: 'file',
            filename: 'logs/logs.log'
        },
        requests: {
            type: 'file',
            filename: 'logs/requests.log'
        }
    },
    categories: {
        LOGS: {
            appenders: ['logs'],
            level: 'debug'
        },
        REQUESTS: {
            appenders: ['requests'],
            level: 'debug'
        },
        default: {
            appenders: ['console'],
            level: 'debug'
        }
    }
});

log4js_extend(log4js, {
    path: __dirname,
    format: "-----> at @name (@file:@line:@column)"
});

const logger = log4js.getLogger('LOGS');
const requestLogger = log4js.getLogger('REQUESTS');

module.exports = { logger, requestLogger, log4js }