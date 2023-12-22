const { User } = require('../models/users')
const { v4: uuidv4 } = require('uuid')
const crypto = require('crypto')
const { Op, Sequelize } = require('sequelize')
const jwt = require('jsonwebtoken')
const util = require('util')
const { sendApiResponse } = require('../utils/standaradresponse')
const { sendFailureResponse } = require('../utils/standaradresponse')
const { createAccountEmail, verifyAccountEmail, changePasswordEmail } = require('../utils/scheduling')


const createUser = async (req, res) => {
  const { firstName, lastName, email } = req.body;
  const logId = res.getHeader('logId');
  if (!firstName || !lastName || !email) {
    return sendFailureResponse(res, 400, 'Missing required feilds', logId)
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
    const resetUrl = `http://localhost:5173/setPassword/${rememberToken}`;
    const htmlMessage = `
        <h1>Dear ${firstName} ${lastName},</h1>
        <p>Thank you for creating an account with us.</p>
        <p>Please verify your account by clicking the button below:</p>
        <button style="background-color: #4caf50; color: #fff; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">
          <a href="${resetUrl}" style="text-decoration: none; color: inherit;">Verify Account</a>
        </button>
        <p>If you did not sign up for an account, you can ignore this email.</p>
      `;
    const schedulingData = {
      email: newUser.email,
      subject: "Account Verification Email",
      message: htmlMessage,
    }
    createAccountEmail.add(schedulingData)
    const user = {
      "First Name": newUser.firstName,
      "Last Name": newUser.firstName,
      "email": newUser.email,
    }
    return sendApiResponse(res, 'success', 201, 'user created Successfully', user, logId)
  } catch (error) {
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

const setPassword = async (req, res) => {
  const { token, password, confirmPassword } = req.body;
  const logId = res.getHeader('logId');
  if (!token || !password || !confirmPassword) {
    return sendFailureResponse(res, 400, 'Missing required feilds', logId)
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
      return sendFailureResponse(res, 404, 'User not found or token expired', logId)
    }
    if (password !== confirmPassword) {
      return sendFailureResponse(res, 400, 'Password donot match', logId)
    }
    user.password = password;
    user.passwordUpdatedAt = Date.now();
    user.confirmPassword = password;
    user.rememberToken = null;
    user.rememberTokenExpiry = null;
    user.isVerified = true;
    await user.save();
    return sendApiResponse(res, 'success', 200, 'Password set successfully', logId)
  } catch (error) {
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map((err) => ({
        field: err.path,
        message: err.message,
      }));
      return sendFailureResponse(res, 400, validationErrors.message, logId)
    }
    return sendFailureResponse(res, 400, error.message, logId)
  }
};

const login = async (req, res) => {
  const { email, password } = req.body;
  const logId = res.getHeader('logId');
  if (!email || !password) {
    return sendFailureResponse(res, 400, 'Missing required feilds', logId)
  }
  try {
    const user = await User.findOne({
      where: {
        email,
      },
    });
    if (!user || !(await user.comparePassword(password))) {
      return sendFailureResponse(res, 400, 'Please Enter Valid email and password', logId)
    }
    const isPasswordMatch = await user.comparePassword(password)
    if (!isPasswordMatch) {
      return sendFailureResponse(res, 400, 'Please Enter Valid Email and password', logId)
    }
    const token = signToken(user)
    const loginUser = {
      "FirstName": user.firstName,
      "LastName": user.lastName,
      "email": user.email,
      "isAdmin": user.isAdmin
    }
    return sendApiResponse(res, 'success', 200, 'User Login SuccessFully', loginUser, logId, null, token)
  } catch (error) {
    if (error instanceof SyntaxError) {
      return sendFailureResponse(res, 400, "Invalid json data", logId)
    } else {
      return sendFailureResponse(res, 400, error.message, logId)
    }
  }
};

const verifyUser = async (req, res) => {
  const { userId } = req.params;
  const logId = res.getHeader('logId');
  if (!userId) {
    return sendFailureResponse(res, 400, 'Missing required feilds', logId)
  }
  try {
    const user = await User.findOne({ where: { userId } });
    if (!user) {
      return sendFailureResponse(res, 404, 'User not found or token expired', logId)
    }
    if (user.isVerified) {
      return sendFailureResponse(res, 400, 'User is already verified', logId)
    }
    const rememberToken = await user.createRememberToken();
    try {
      await user.save({ validate: false });
    } catch (validationError) {
      if (validationError.name === 'SequelizeValidationError') {
        const errorMessage = validationError.errors.map((error) => error.message).join(', ');
        return sendFailureResponse(res, 400, errorMessage, logId)
      }
      console.error(validationError);
      return sendFailureResponse(res, 500, validationError.message, logId)
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
    const verifyAccountEmailData = {
      email: user.email,
      subject: 'Account Verification Email',
      message: htmlMessage,
    }
    verifyAccountEmail.add(verifyAccountEmailData)
    return sendApiResponse(res, 'success', 201, 'Email Sent to user', null, logId)
  } catch (error) {
    console.error(error);
    return sendFailureResponse(res, 500, 'Internal Server error', logId)
  }
};

const changePassword = async (req, res) => {
  const token = req.headers.authorization;
  const logId = res.getHeader('logId');
  const { oldPassword, newPassword, confirmPassword } = req.body;
  if (!oldPassword || !newPassword || !confirmPassword) {
    return sendFailureResponse(res, 400, 'Missing required feilds', logId)
  }
  try {
    let id = '';
    if (token && token.startsWith('Bearer')) {
      const tokenValue = token.split(' ')[1];
      try {
        const decodeToken = await util.promisify(jwt.verify)(
          tokenValue,
          process.env.SECERET_STRING
        );
        id = decodeToken.id;
      } catch (error) {
        return sendFailureResponse(res, 401, 'Unauthorize User', logId)
      }
    }
    if (!id) {
      return sendFailureResponse(res, 400, 'Sorry User Does Not Exist', logId)
    }
    const user = await User.findOne({
      where: {
        userId: id,
      },
    });
    const isPasswordMatch = await user.comparePassword(oldPassword)
    if (!isPasswordMatch) {
      return sendFailureResponse(res, 400, 'MPassword Does Not match', logId)
    }
    user.password = newPassword;
    user.confirmPassword = confirmPassword;
    user.passwordUpdatedAt = Date.now();
    await user.save();
    if (!user) {
      return sendFailureResponse(res, 400, 'Sorry user Not Found', logId)
    }
    return sendApiResponse(res, 'success', 201, 'Password Changed SuccessFully', null, logId)
  } catch (error) {
    console.error('Error in getProfile:', error);
    return sendFailureResponse(res, 400, 'Internal Server Error', logId)
  }
}

const resetPassword = async (req, res) => {
  const { email} = req.body;
  const logId = res.getHeader('logId');
  try {
    if (!email) {
      return sendFailureResponse(res, 400, 'Missing required feilds', logId)
    }
    const user = await User.findOne({
      where: {
        email,
      },
    });

    if (!user) {
      return sendFailureResponse(res, 400, 'User Not Found', logId)
    }
    const rememberToken = await user.createRememberToken();
    console.log(rememberToken)
    await user.save();
    const resetUrl = `http://localhost:8080/set-password/${rememberToken}`;
    const htmlMessage = `
    <h1>Dear ${user.firstName} ${user.lastName},</h1>
    <p>We received a request to reset your account password.</p>
    <p>Please reset your password by clicking the button below:</p>
    <button style="background-color: #4caf50; color: #fff; padding: 10px; border: none; border-radius: 5px; cursor: pointer;">
      <a href="${resetUrl}" style="text-decoration: none; color: inherit;">Reset Password</a>
    </button>
    <p>If you did not request a password reset, you can ignore this email.</p>
  `;
    const changePasswordEmailData = {
      email: user.email,
      subject: 'Reset You password',
      message: htmlMessage,
    }
    changePasswordEmail.add(changePasswordEmailData)
    return sendApiResponse(res, 'success', 201, 'Password Changed Link sent successfully', null, logId)
  } catch (error) {
    console.error(error);
    return sendFailureResponse(res, 400, 'Internal server error', logId)
  }
}

function signToken(newUser) {
  return jwt.sign({
    id: newUser.userId,
    email: newUser.email,
    name: newUser.firstName
  }, process.env.SECERET_STRING, {
    expiresIn: process.env.JWT_EXPIRY
  })
}


module.exports = { createUser, setPassword, login, verifyUser, changePassword, resetPassword };
