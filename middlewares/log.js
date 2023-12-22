const util = require('util');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Log } = require('../models/logs');
require('dotenv').config()

const logRequestDetails = async (req, res, next) => {
    const userAgent = req.headers['user-agent'];
    const SeceretKey = process.env.SECERET_STRING
    let logEntry = {
        logId: uuidv4(),
        method: req.method,
        userAgent: userAgent,
        host: req.headers.host,
        url: req.originalUrl,
        statusCode: null,
        header: req.headers,
        payload: req.body,
        timestamp: new Date(),
        name: 'user',
        email: 'user@gmail.com',
    };
    const token = req.headers.authorization;
    console.log(token)
    if (token && token.startsWith('Bearer')) {
        const tokenValue = token.split(' ')[1];
        try {
            const decodeToken = await util.promisify(jwt.verify)(tokenValue, SeceretKey);
            console.log("Seceret String:" + SeceretKey)
            logEntry.name = decodeToken.name || 'user';
            logEntry.email = decodeToken.email || 'user@gmail.com';
        } catch (error) {
            console.error('Error verifying JWT:', error);
        }
    }
    res.setHeader('logId', logEntry.logId);
    const responseBodyChunks = [];
    const originalJson = res.json;
    res.json = function (body) {
        responseBodyChunks.push(Buffer.from(JSON.stringify(body)));
        originalJson.call(res, body);
    };
    const route = req.url
    const activity = route.split('/');

    res.on('finish', async () => {
        logEntry.statusCode = res.statusCode;
        try {
            const responseBody = Buffer.concat(responseBodyChunks).toString("utf-8");
            const responseMessage = JSON.parse(responseBody)
            logEntry.activity = `${logEntry.name} perform activity to ${activity[3]} and ${responseMessage.message}`
            await Log.create(logEntry);
        } catch (error) {
            console.error('Error saving log entry to the database:', error);
        }
        console.log(JSON.stringify(logEntry, null, 2));
    });
    next();
};

module.exports = { logRequestDetails };
