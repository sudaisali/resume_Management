const util = require('util');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const { Log } = require('../models/logs'); 
require('dotenv').config()

const logRequestDetails = async (req, res, next) => {
    const userAgent = req.headers['user-agent'];

    let logEntry = {
        logId: uuidv4(),
        method: req.method,
        userAgent:userAgent,
        host:req.headers.host,
        url: req.originalUrl,
        statusCode: null,
        header: req.headers,
        payload: req.body,
        timestamp: new Date(),
        name: null,
        email: null,
    };
    

    const token = req.headers.authorization;
    console.log(token)
    if (token && token.startsWith('Bearer')) {
        const tokenValue = token.split(' ')[1];
        try {
            const decodeToken = await util.promisify(jwt.verify)(tokenValue, 'sdjaiis-dsjkjdaj-ksjdksajsk-sajkkdsjkd-dkjjkadja');
            console.log(decodeToken)
            console.log("Seceret String:"+ process.env.SECRET_STRING)
            logEntry.name = decodeToken.name;
            logEntry.email = decodeToken.email;
        } catch (error) {
            console.error('Error verifying JWT:', error);
           
        }
    }
    console.log(logEntry.name)

    res.on('finish', async () => {
        logEntry.statusCode = res.statusCode;
        try {
            await Log.create(logEntry);
        } catch (error) {
            console.error('Error saving log entry to the database:', error);
        }
        console.log(JSON.stringify(logEntry, null, 2));
    });

    next();
};

module.exports = {logRequestDetails};
