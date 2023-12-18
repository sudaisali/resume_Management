const { Applicant } = require('../models/applicants');
const path = require('path');
const multer = require('multer');
const {sendEmail} = require('../utils/sendemail')
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const {Op} = require('sequelize')
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
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
    const { userName, email, qualification, cnic, address, phoneNumber, status, age, isDelete } = req.body;
    let cvPath = '';  
    if (req.file) {
      cvPath = req.file.path;
    }
    try {
      const newApplicant = await Applicant.create({
        applicantId : uuidv4(),
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
  
      return res.status(201).json({ message: 'Applicant created successfully', data: newApplicant });
    } catch (error) {
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const errorMessage = error.errors && error.errors.length > 0 ? error.errors[0].message : 'Validation error';
            return res.status(400).json({ error: errorMessage });
          }
          console.error('Error creating applicant:', error);
          return res.status(500).json({ error: 'Internal server error' });
        }
  };
const getAllapplicants = async (req, res) => {
  try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const search = req.query.search || '';
      const status = req.query.status || '';
      const offset = (page - 1) * limit;
      // const whereClause = {
      //     [Op.or]: [
      //         { username: { [Op.like]: `%${search}%` } },
      //         { email: { [Op.like]: `%${search}%` } },
      //     ],
      //     status: { [Op.like]: `%${status}%` },
          
      // };
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
          offset,
          limit,
      });

      if (!applicants) {
          return res.status(400).json({
              status: "failed",
          });
      }
      const totalPages = Math.ceil(applicants.count / limit);
      const hasNextPage = page < totalPages;
      const hasPrevPage = page > 1;
      const nextLink = hasNextPage ? `/api/get-applicants?page=${page + 1}&limit=${limit}&search=${search}&status=${status}` : null;
      const prevLink = hasPrevPage ? `/api/get-applicants?page=${page - 1}&limit=${limit}&search=${search}&status=${status}` : null;

      res.status(200).json({
          status: "success",
          data: applicants.rows,
          pagination: {
              totalApplicants: applicants.count,
              page,
              totalPages,
              hasNextPage,
              hasPrevPage,
              nextLink,
              prevLink,
          },
      });
  } catch (error) {
      res.status(400).json({
          message: error.message,
      });
  }
};
const updateApplicantStatus = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  try {
    const applicant = await Applicant.findOne({
      where: {
        applicantId: id,
      },
    });
    if (!applicant) {
      return res.status(404).json({ error: 'Applicant not found' });
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
    if(status == 'rejected'){
      try{
        await sendEmail({
          email: applicant.email,
          subject: "Application Status",
          message: rejectionMessage,
      });
      return res.status(200).json({
        status:"Application Rejected",
        data:applicant
      })
      }catch(error){
        res.json({
          message: error.message
        })
      }
     
    }
    res.status(200).json({
      status:"Application Accepted",
      data:applicant
    })

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
const downloadCv = async (req, res) => {
  const { id } = req.params;
  try {
    const applicant = await Applicant.findOne({
      where: {
        applicantId: id,
      },
    });

    if (!applicant) {
      return res.status(404).send('Applicant not found');
    }
    const cvFilePath = applicant.cv
    console.log('CV File Path:', cvFilePath);
    if (fs.existsSync(cvFilePath)) {
      const fileExtension = path.extname(applicant.cv);
      res.setHeader('Content-Disposition', `attachment; filename="${applicant.userName}_CV${fileExtension}"`);
      res.setHeader('Content-Type', 'application/pdf'); 
      const fileStream = fs.createReadStream(cvFilePath);
      fileStream.pipe(res);
    } else {
      res.status(404).send('CV file not found');
    }
  } catch (error) {
    console.error('Error downloading CV:', error);
    res.status(500).send('Internal server error');
  }
};





  
module.exports = { submitForm , handleFileUpload , getAllapplicants , updateApplicantStatus , downloadCv};
