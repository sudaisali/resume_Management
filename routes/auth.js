const express = require('express')
const User = require('../controllers/auth')
const auth = require('../middlewares/authorization')
const authrouter = express.Router()


authrouter.post('/createuser',auth.authorizeUser,User.createUser)
authrouter.post('/setpassword',User.setPassword)
authrouter.post('/login',User.login)
authrouter.patch('/verifyUser/:userId',User.verifyUser)






module.exports = {authrouter}