const { request } = require('http')
const { User } = require('../models/users')
const jwt = require('jsonwebtoken')
const util = require('util')
const { sendFailureResponse } = require('../utils/standaradresponse')


const authorizeUser = async (req, res, next) => {
    const token = req.headers.authorization
    const logId = res.getHeader('logId');
    let tokenValue
    if (token && token.startsWith('Bearer')) {
        tokenValue = token.split(' ')[1]
    }
    if (!token) {
        return sendFailureResponse(res, 404, 'Sorry You are not login', logId)
    }
    try {
        const decodeToken = await util.promisify(jwt.verify)(tokenValue, process.env.SECERET_STRING)
        console.log(decodeToken)
        const loginUser = await User.findOne({
            where: { userId: decodeToken.id },
        });
        if (!loginUser) {
            return sendFailureResponse(res, 404, 'No user Found', logId)
        }
        if (loginUser.isPasswordChanged(decodeToken.iat)) {
            return sendFailureResponse(res, 401, 'You are not Login', logId)
        }
        req.user = loginUser
    } catch (error) {
        return sendFailureResponse(res, 404, error.message, logId)
    }
    next()
}

const checkrole = () => {
    return (req, res, next) => {
        const logId = res.getHeader('logId');
        if (req.user.isAdmin === false) {
            return sendFailureResponse(res, 403, 'You are unauthorize', logId)
        }
        next();
    };
};

module.exports = { authorizeUser, checkrole }