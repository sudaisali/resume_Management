const express = require('express')
const User = require('../controllers/users')
const auth = require('../middlewares/authorization')
const userrouter = express.Router()


userrouter.get('/get-user',auth.authorizeUser,User.getUsers)
userrouter.get('/me',auth.authorizeUser,User.getProfile)
userrouter.get('/user-profile/:userId',auth.authorizeUser,User.userProfile)





module.exports = {userrouter}