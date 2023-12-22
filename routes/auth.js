const express = require('express')
const User = require('../controllers/auth')
const auth = require('../middlewares/authorization')
const authrouter = express.Router()


authrouter.post('/create-user',auth.authorizeUser,User.createUser)
authrouter.post('/set-password',User.setPassword)
authrouter.post('/login',User.login)
authrouter.patch('/verify-user/:userId',User.verifyUser)
authrouter.patch('/change-password',User.changePassword)
authrouter.post('/forget-password',User.resetPassword)






module.exports = {authrouter}