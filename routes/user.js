const express = require('express')
const User = require('../controllers/users')
const auth = require('../middlewares/authorization')
const userrouter = express.Router()


userrouter.get('/getuser',auth.authorizeUser,User.getUsers)
userrouter.get('/me',auth.authorizeUser,User.getProfile)
userrouter.get('/userprofile/:userId',auth.authorizeUser,User.userProfile)





module.exports = {userrouter}