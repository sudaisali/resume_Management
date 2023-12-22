const { Applicant } = require('../models/applicants');
const path = require('path');
const multer = require('multer');
const { sendEmail } = require('../utils/sendemail')
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const { Op, Sequelize } = require('sequelize')
const { sendApiResponse } = require('../utils/standaradresponse')
const { sendFailureResponse } = require('../utils/standaradresponse');
const { DownloadQueue } = require('../utils/download-queue')


const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadFolder = 'uploads/';
    if (!fs.existsSync(uploadFolder)) {
      fs.mkdirSync(uploadFolder);
    }
    cb(null, uploadFolder);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({ storage: storage }).single('cv');
const handleFileUpload = (req, res, next) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ error: 'File upload error' });
    } else if (err) {
      return res.status(500).json({ error: 'Internal server error' });
    }
    next();
  });
};

const submitForm = async (req, res) => {
  const logId = res.getHeader('logId');
  const { userName, email, qualification, cnic, address, phoneNumber, status, age, isDelete } = req.body;
  if (!userName || !email || !qualification || !cnic || !address || !phoneNumber || !age) {
    fs.unlinkSync(req.file.path);
    return sendFailureResponse(res, 400, 'Missing required fields', logId);
  }
  let cvPath = '';
  if (!req.file) {
    return sendFailureResponse(res, 400, 'Please Upload File', logId);
  }
  if (req.file) {
    cvPath = req.file.path;
  }
  try {
    const newApplicant = await Applicant.create({
      applicantId: uuidv4(),
      userName,
      email,
      qualification,
      cnic,
      address,
      phoneNumber,
      cv: cvPath,
      status,
      age,
      isDelete,
    });
    if (Applicant.validationErrors) {
      return sendFailureResponse(res, 400, Applicant.validationErrors.join(', '), logId);
    }
    return sendApiResponse(res, 'success', 201, 'Application Submitted Successfully', newApplicant, logId);
  } catch (error) {
    if (cvPath) {
      fs.unlinkSync(cvPath);
    }
    let errorMessage;
    if (error instanceof Sequelize.ValidationError) {
      errorMessage = error.errors[0].message;
      return sendFailureResponse(res, 400, errorMessage, logId);
    } else {
      errorMessage = error.message;
      return sendFailureResponse(res, 400, errorMessage, logId);
    }
  }
};

const getAllapplicants = async (req, res) => {
  const logId = res.getHeader('logId');
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const status = req.query.status || '';
    const offset = (page - 1) * limit;
    const whereClause = {
      [Op.and]: [
        {
          [Op.or]: [
            { username: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        },
        { status: { [Op.like]: `%${status}%` } },
        { isDelete: { [Op.ne]: true } },
      ],
    };
    const applicants = await Applicant.findAndCountAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });

    if (!applicants) {
      return sendFailureResponse(res, 400, 'Applicants Not Exists', logId)
    }
    const totalPages = Math.ceil(applicants.count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const nextLink = hasNextPage ? `/api/applicant/get-applicants?page=${page + 1}&limit=${limit}&search=${search}&status=${status}` : null;
    const prevLink = hasPrevPage ? `/api/applicant/get-applicants?page=${page - 1}&limit=${limit}&search=${search}&status=${status}` : null;
    const pagination = {
      totalApplicants: applicants.count,
      page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      nextLink,
      prevLink,
    }
    return sendApiResponse(res, 'success', 200, "Applicants List Shown", applicants, logId, pagination)
  } catch (error) {
    return sendFailureResponse(res, 400, error.message, logId)
  }
};

const updateApplicantStatus = async (req, res) => {
  const logId = res.getHeader('logId');
  const { id } = req.params;
  const { status } = req.body;
  try {
    const applicant = await Applicant.findOne({
      where: {
        applicantId: id,
      },
    });
    if (!applicant) {
      return sendFailureResponse(res, 404, 'Application Not Found', logId)
    }
    applicant.status = status;
    await applicant.save();
    const rejectionMessage = `
  <h1>Dear ${applicant.userName},</h1>
  <p>We regret to inform you that your application has been rejected.</p>
  <p>Thank you for taking the time to apply. Unfortunately, after careful consideration, we have decided not to proceed with your application at this time.</p>
  <p>If you have any questions or would like feedback on your application, feel free to reach out to our support team.</p>
  <p>We appreciate your interest and wish you the best in your future endeavors.</p>
`;
    if (status == 'rejected') {
      try {
        await sendEmail({
          email: applicant.email,
          subject: "Application Status",
          message: rejectionMessage,
        });
        return sendApiResponse(res, 'success', 200, " Application rejected", applicant, logId, null)
      } catch (error) {
        return sendFailureResponse(res, 400, error.message, logId)
      }
    }
    return sendApiResponse(res, 'success', 200, "Applicants accepted", applicant, logId, null)
  } catch (error) {
    console.error('Error:', error);
    return sendFailureResponse(res, 500, 'Internal server Error', logId)
  }
};

const downloadCv = async (req, res) => {
  const { id } = req.params;
  const logId = res.getHeader('logId');
  try {
    const applicant = await Applicant.findOne({
      where: {
        applicantId: id,
      },
    });
    if (!applicant) {
      return sendFailureResponse(res, 404, 'Application Not Found', logId)
    }
    const cvFilePath = applicant.cv
    const userName = applicant.userName
    DownloadQueue.add({ cvFilePath, userName })
    if (fs.existsSync(cvFilePath)) {
      const fileExtension = path.extname(applicant.cv);
      res.setHeader('Content-Disposition', `attachment; filename="${applicant.userName}_CV${fileExtension}"`);
      res.setHeader('Content-Type', 'application/pdf');
      const fileStream = fs.createReadStream(cvFilePath);
      fileStream.pipe(res);
    } else {
      return sendFailureResponse(res, 404, 'Cv File Not Found', logId)
    }
  } catch (error) {
    return sendFailureResponse(res, 500, error.message, logId)
  }
};

const applicantProfile = async (req, res) => {
  const { applicantId } = req.params;
  const logId = res.getHeader('logId');
  if (!applicantId) {
    return sendFailureResponse(res, 400, 'Sorry user Does Not Exist', logId)
  }
  try {
    const user = await Applicant.findOne({
      attributes: ['applicantId', 'userName', 'email', 'qualification', 'age', 'cnic', 'phoneNumber', 'address'],
      where: {
        applicantId,
      },
    });
    if (!user) {
      return sendFailureResponse(res, 404, 'Sorry user Not Found', logId)
    }
    return sendApiResponse(res, 'success', 200, "Applicant Profile shown", user, logId, null)
  } catch (error) {
    return sendFailureResponse(res, 500, 'Internal server error', logId)
  }
}


module.exports = { submitForm, handleFileUpload, getAllapplicants, updateApplicantStatus, downloadCv, applicantProfile };
