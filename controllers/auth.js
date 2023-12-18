const {User} = require('../models/users')
const { v4: uuidv4 } = require('uuid');
const {sendEmail} = require('../utils/sendemail')
const crypto = require('crypto')
const {Op} = require('sequelize')
const jwt = require('jsonwebtoken')


const createUser = async (req, res) => {
    const { firstName, lastName, email } = req.body;

    if (!firstName || !lastName || !email) {
        return sendResponse(res, 400, 'Missing required fields', false);
    }

    try {
        const newUser = await User.create({
            userId: uuidv4(),
            firstName,
            lastName,
            email,
        });

        const rememberToken = await newUser.createRememberToken();
        await newUser.save();

        const resetUrl = `http://localhost:8080/set-password/${rememberToken}`;
        const htmlMessage = `
        <h1>Dear ${firstName} ${lastName},</h1>
        <p>Thank you for creating an account with us.</p>
        <p>Please verify your account by clicking the button below:</p>
        <button style="background-color: #4caf50; color: #fff; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">
          <a href="${resetUrl}" style="text-decoration: none; color: inherit;">Verify Account</a>
        </button>
        <p>If you did not sign up for an account, you can ignore this email.</p>
      `;
      

        await sendEmail({
            email: newUser.email,
            subject: "Account Verification Email",
            message: htmlMessage,
        });

        return sendResponse(res, 201, newUser,true);
    } catch (error) {
        console.error('Error creating user:', error.message);
        let response;

        if (error.name === 'SequelizeValidationError') {
            response = { success: false, error: 'Validation error', details: error.errors };
            return sendResponse(res, 400, response);
        }

        if (error.name === 'SequelizeUniqueConstraintError') {
            response = { success: false, error: 'Email must be unique' };
            return sendResponse(res, 400, response);
        }

        response = { success: false, error: 'Internal Server Error' };
        return sendResponse(res, 500, response);
    }
};
const setPassword = async (req, res) => {
    const { token, password, confirmPassword } = req.body;
  
    if (!token || !password || !confirmPassword) {
      return sendResponse(res, 400, 'Missing required fields', false);
    }
    try {
      const encryptToken = crypto.createHash('sha256').update(token).digest('hex');
      const user = await User.findOne({
        where: {
          rememberToken: encryptToken,
          rememberTokenExpiry: {
            [Op.gt]: new Date(),
          },
        },
      });
  
      if (!user) {
        console.log('User not found or token expired:', encryptToken);
        return sendResponse(res, 404, 'User not found or token expired', false);
      }
      if (password !== confirmPassword) {
        return sendResponse(res, 400, 'Passwords do not match', false);
      }
      user.password = password;
      user.passwordUpdatedAt = Date.now();
      user.confirmPassword = password;
      user.rememberToken = null;
      user.rememberTokenExpiry = null;
      user.isVerified = true;
      await user.save();
      return sendResponse(res, 200, 'Password set successfully', true);
    } catch (error) {
      console.error('Error setting password:', error);
      if (error.name === 'SequelizeValidationError') {
        const validationErrors = error.errors.map((err) => ({
          field: err.path,
          message: err.message,
        }));
  
        return sendResponse(res, 400, 'Validation Error', false, validationErrors);
      }
      return sendResponse(res, 500, 'Internal Server Error', false);
    }
};
const login = async(req,res)=>{
    const {email , password} = req.body;
    if(!email || !password){
        return sendResponse(res, 400, 'Please Enter Email and Password', false);
    }
    const user = await User.findOne({
        where: {
          email,
        },
      });
    if(!user || !(await user.comparePassword(password))){
        return sendResponse(res, 400, 'Please Enter Valid Email and Password', false);
    }
    const isPasswordMatch = await user.comparePassword(password)
    if(!isPasswordMatch){
        return sendResponse(res, 400, 'Please Enter Valid Email and Password', false);
    }
    
    const token = signToken(user)
    const data = {
        message:"You are Login SuccessFully",
        token,
        user,
    }
    return sendResponse(res, 200, data, true);

    
};
const verifyUser = async (req, res) => {
  const { userId } = req.params;
  if(!userId){
    return sendResponse(res, 400, 'User Id Not Exist', false);
  }

  try {
    const user = await User.findOne({ where: { userId } });

    if (!user) {
      return sendResponse(res, 400, 'User Does Not exist', false);
    }

    if (user.isVerified) {
      return sendResponse(res, 400, 'User is Already verified', false);
    }
    const rememberToken = await user.createRememberToken();
    try {
      await user.save({ validate: false });
    } catch (validationError) {
      if (validationError.name === 'SequelizeValidationError') {
        const errorMessage = validationError.errors.map((error) => error.message).join(', ');
        return sendResponse(res, 400, errorMessage, false);
      }
      console.error(validationError);
      return sendResponse(res, 500, 'Internal Server Error', false);
    }

    const resetUrl = `http://localhost:8080/set-password/${rememberToken}`;

    const htmlMessage = `
      <h1>Dear ${user.firstName} ${user.lastName},</h1>
      <p>Thank you for creating an account with us.</p>
      <p>Please verify your account by clicking the button below:</p>
      <button style="background-color: #4caf50; color: #fff; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">
        <a href="${resetUrl}" style="text-decoration: none; color: inherit;">Verify Account</a>
      </button>
      <p>If you did not sign up for an account, you can ignore this email.</p>
    `;

    await sendEmail({
      email: user.email,
      subject: 'Account Verification Email',
      message: htmlMessage,
    });

    return sendResponse(res, 201, 'Email send to user', true);
  } catch (error) {
    console.error(error);
    return sendResponse(res, 500, 'Internal Server Error', false);
  }
};

const sendResponse = (res, statusCode, data, success) => {
    return res.status(statusCode).json({ success, data });
};
function signToken(newUser) {
    return jwt.sign({
        id: newUser.userId,
        email: newUser.email,
        name:newUser.firstName
    }, process.env.SECERET_STRING, {
        expiresIn: process.env.JWT_EXPIRY
    })
}


module.exports = { createUser , setPassword , login , verifyUser};
