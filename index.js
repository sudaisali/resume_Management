const express = require('express');
require('dotenv').config()
const { Sequelize } = require('sequelize');
const cors = require('cors');
const cron = require('node-cron');
const sequelize = require('./database');
const { User } = require('./models/users');
const { Applicant } = require('./models/applicants')
const { Log } = require('./models/logs')
const seedData = require('./seeders/user');
const { authrouter } = require('./routes/auth')
const { userrouter } = require('./routes/user')
const { formrouter } = require('./routes/applicants')
const { logrouter } = require('./routes/log')
const { ChatMessage } = require('./models/messages')
const { logRequestDetails } = require('./middlewares/log')
const { cronJobFunction } = require('./utils/cronjob')
const { gptResponse } = require('./utils/gptresponse')
const { v4: uuidv4 } = require('uuid');
const http = require('node:http');



const app = express();
app.use(cors());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', true);
  next();
});
var server = http.createServer(app);
const socketio = require('socket.io')
const io = socketio(server);

io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('chat message', async (msg) => {
    const userChatMessage = await ChatMessage.create({
      message: msg,
      type: 'user',
    });
    const response = await gptResponse(msg)
    io.emit('chat message', {
      message: response,
      user: "bot"
    });
    const botChatMessage = await ChatMessage.create({
      message: response,
      type: 'bot',
    });
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });
});





app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(logRequestDetails)

app.use('/api/auth', authrouter)
app.use('/api/user', userrouter)
app.use('/api/applicant', formrouter)
app.use('/api/log', logrouter)


const startApplication = async () => {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      await seedData.up(sequelize.getQueryInterface(), Sequelize);
      console.log('Seed data added successfully.');
    }
    server.listen(process.env.PORT, () => {
      console.log('Server is running on port 3000');
      cron.schedule('*/20 * * * * *', cronJobFunction);
    });
  } catch (error) {
    console.error('Error initializing application:', error);
  }
};


startApplication();
