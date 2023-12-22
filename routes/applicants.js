const express = require('express');
const { submitForm } = require('../controllers/applicants'); 
const { handleFileUpload } = require('../controllers/applicants'); 
const { getAllapplicants } = require('../controllers/applicants'); 
const { updateApplicantStatus } = require('../controllers/applicants'); 
const { downloadCv } = require('../controllers/applicants'); 
const { applicantProfile } = require('../controllers/applicants'); 
const auth = require('../middlewares/authorization')
const formrouter = express.Router()



formrouter.post('/submit-form',handleFileUpload,submitForm);
formrouter.get('/get-applicants',auth.authorizeUser,getAllapplicants);
formrouter.patch('/update-applicants/:id',auth.authorizeUser,updateApplicantStatus);
formrouter.get('/download-cv/:id',auth.authorizeUser,downloadCv);
formrouter.get('/applicant-profile/:applicantId',auth.authorizeUser,applicantProfile);


module.exports = {formrouter}