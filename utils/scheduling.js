const Queue = require('bull');
const { sendEmail } = require('../utils/sendemail');

const createAccountEmail = new Queue('createAccountEmailJob');
const verifyAccountEmail = new Queue('verifyAccountEmailJob');
const changePasswordEmail = new Queue('changePasswordEmail');


const processEmailJob = async (job) => {
  try {
    await sendEmail(job.data);
    console.log(`process completed`);
  } catch (error) {

  }
};

createAccountEmail.process(async (job) => {
  try {
    await processEmailJob(job);
  } catch (error) {


  }
});

verifyAccountEmail.process(async (job) => {
  try {
    await processEmailJob(job);
  } catch (error) {
    console.error(`Error saving job details   ${error.message}`);
  }
});

changePasswordEmail.process(async (job) => {
  try {
    await processEmailJob(job);
  } catch (error) {
    console.error(`Error saving job details ${error.message}`);
  }
});

createAccountEmail
  .on('completed', async function (job, result) {
    await job.remove();
    console.log(`Job removed from both Bull`);
  })

verifyAccountEmail
  .on('completed', async function (job, result) {
    await job.remove();
    console.log(`Job removed from Bull`);
  })

changePasswordEmail
  .on('completed', async function (job, result) {
    await job.remove();
    console.log(`Job removed from both Bull`);
  })





module.exports = { createAccountEmail, verifyAccountEmail, changePasswordEmail }
