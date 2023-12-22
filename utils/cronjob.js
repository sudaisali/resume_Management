const cron = require('node-cron');
const fs = require('fs').promises;
const path = require('path');
const { Applicant } = require('../models/applicants');
const cronJobFunction = async () => {
  try {
    const rejectedJobs = await Applicant.findAll({
      where: {
        status: 'rejected',
        isDelete: false
      },
    });
    for (const job of rejectedJobs) {
      console.log(job)
      try {
        await job.update({ isDelete: true });
        const fileName = job.cv;
        if (fileName) {
          const filePath = fileName
          await fs.unlink(filePath);
          console.log(`Job with id ${job.applicantId} soft-deleted, and files deleted successfully.`);
        } else {
          console.error(`Error deleting files: fileName is undefined for job with id ${job.applicantId}`);
        }
      } catch (updateError) {
        console.error('Error updating record:', updateError);
      }
    }
    console.log('Rejected Files Deleted.');

  } catch (error) {
    console.error('Error executing cron job:', error);
  }
};

module.exports = { cronJobFunction };