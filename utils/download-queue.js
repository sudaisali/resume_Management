const fs = require('fs/promises');
const path = require('path');
const Queue = require('bull');

const DownloadQueue = new Queue('downloadpdfFiles');

async function downloadFile(userName, fileName) {
  const fileUrl = fileName
  console.log(userName)
  console.log("Myfile url", fileUrl)
  const downloadFolderPath = path.join(require('os').homedir(), 'Downloads');
  let localFilePath = path.join(downloadFolderPath, userName + '.pdf');
  try {
    await fs.access(fileUrl, fs.constants.F_OK);
    console.log(fileUrl)
  } catch (err) {
    console.error(`File ${fileName} does not exist in the upload folder.`);
    return;
  }

  try {
    await fs.copyFile(fileUrl, localFilePath);
    console.log(`File ${fileName} has been successfully downloaded to the download folder.`);

    console.log('File deleted successfully');
  } catch (err) {
    console.error('Error copying or deleting the file:', err);
  }
}

DownloadQueue.process(async (job) => {
  try {
    await downloadFile(job.data.userName, job.data.cvFilePath);
  } catch (err) {
    console.error(`Error processing download for file ${job.data.fileName}:`, err);
  }
});

DownloadQueue.on('failed', async (job, err) => {
  console.error(`Job ${job.id} failed with error: ${err.message}`);
  await job.remove()
})
  .on('completed', async function (job, result) {
    await job.remove();
    console.log(`Job removed from both Bull`);
  })
  
module.exports = { DownloadQueue };
