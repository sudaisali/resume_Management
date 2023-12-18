const express = require('express')
const {getAllLogs} = require('../controllers/logs')
const auth = require('../middlewares/authorization')
const logrouter = express.Router()


logrouter.get('/getlogs',auth.authorizeUser,auth.checkrole(),getAllLogs)





module.exports = {logrouter}