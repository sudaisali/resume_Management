const express = require('express');
require('dotenv').config()
const { Sequelize } = require('sequelize');
const cors = require('cors');
const cron = require('node-cron');
const sequelize = require('./database');
const { User } = require('./models/users'); 
const {Applicant} = require('./models/applicants')
const {Log} = require('./models/logs')
const seedData = require('./seeders/user'); 
const {authrouter} = require('./routes/auth')
const {userrouter} = require('./routes/user')
const {formrouter} = require('./routes/applicants')
const {logrouter} = require('./routes/log')
const {logRequestDetails} = require('./middlewares/log')
const {cronJobFunction} = require('./utils/cronjob')

const app = express();
app.use(cors());
app.use(express.json())
app.use(express.urlencoded({ extended: true }))
app.use(logRequestDetails)

app.use('/api',authrouter)
app.use('/api',userrouter)
app.use('/api',formrouter)
app.use('/api',logrouter)


const startApplication = async () => {
  try {
    const userCount = await User.count();
    if (userCount === 0) {
      await seedData.up(sequelize.getQueryInterface(), Sequelize);
      console.log('Seed data added successfully.');
    }
    app.listen(process.env.PORT, () => {
      console.log('Server is running on port 3000');
      cron.schedule('*/20 * * * * *', cronJobFunction);
    });
  } catch (error) {
    console.error('Error initializing application:', error);
  }
};


startApplication();
