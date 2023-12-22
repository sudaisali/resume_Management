const { User } = require('../models/users')
const { Op } = require('sequelize')
const util = require('util');
const jwt = require('jsonwebtoken');
const { sendApiResponse } = require('../utils/standaradresponse')
const { sendFailureResponse } = require('../utils/standaradresponse')

const getUsers = async (req, res) => {
  const logId = res.getHeader('logId');
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const isVerified = req.query.isVerified;
    const offset = (page - 1) * limit;
    const whereClause = {
      [Op.and]: [
        {
          [Op.or]: [
            { firstName: { [Op.like]: `%${search}%` } },
            { lastName: { [Op.like]: `%${search}%` } },
            { email: { [Op.like]: `%${search}%` } },
          ],
        },
        isVerified !== undefined && (
          isVerified.toLowerCase() === 'true' || isVerified.toLowerCase() === 'false'
            ? { isVerified: isVerified.toLowerCase() === 'true' }
            : {}
        ),
      ].filter(Boolean),
    };
    const users = await User.findAndCountAll({
      attributes: ['userId', 'firstName', 'lastName', 'email', 'isAdmin', 'isVerified'],
      where: whereClause,
      order: [['createdAt', 'DESC']],
      offset,
      limit,
    });
    const countVerifiedUsers = await User.count({
      where: {
        isVerified: true,
        ...whereClause,
      },
    });
    const countUnverifiedUsers = await User.count({
      where: {
        isVerified: false,
        ...whereClause,
      },
    });
    if (!users) {
      return sendFailureResponse(res, 404, 'No user Found', logId)
    }
    const totalPages = Math.ceil(users.count / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;
    const nextLink = hasNextPage ? `api/user/get-user?page=${page + 1}&limit=${limit}&search=${search}` : null;
    const prevLink = hasPrevPage ? `api/user/get-user?page=${page - 1}&limit=${limit}&search=${search}` : null;
    const pagination = {
      totalUsers: users.count,
      page,
      totalPages,
      hasNextPage,
      hasPrevPage,
      countVerifiedUsers,
      countUnverifiedUsers,
      nextLink,
      prevLink,
    }
    return sendApiResponse(res, 'success', 200, "Users List Shown", users, logId, pagination)
  } catch (error) {
    return sendFailureResponse(res, 400, error.message, logId)
  }
};

const getProfile = async (req, res) => {
  const logId = res.getHeader('logId');
  const token = req.headers.authorization;
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
        return sendFailureResponse(res, 401, 'Unauthorized user', logId)
      }
    }
    if (!id) {
      return sendFailureResponse(res, 404, 'Sorry user Does Not Exist', logId)
    }
    const user = await User.findOne({
      attributes: ['userId', 'firstName', 'lastName', 'email', 'isAdmin', 'isVerified'],
      where: {
        userId: id,
      },
    });
    if (!user) {
      return sendFailureResponse(res, 404, 'Sorry user Does Not Found', logId)
    }
    return sendApiResponse(res, 'success', 200, "User show successfully", user, logId)
  } catch (error) {
    return sendFailureResponse(res, 400, error.message, logId)
  }
};

const userProfile = async (req, res) => {
  const logId = res.getHeader('logId');
  const { userId } = req.params;
  try {
    if (!userId) {
      return sendFailureResponse(res, 400, 'User Does Not Exist', logId)
    }
    const user = await User.findOne({
      attributes: ['userId', 'firstName', 'lastName', 'email', 'isAdmin', 'isVerified'],
      where: {
        userId,
      },
    });
    if (!user) {
      return sendFailureResponse(res, 404, 'Sorry user Not Found', logId)
    }
    return sendApiResponse(res, 'success', 200, "User Shown Successfully", user, logId)
  } catch (error) {
    return sendFailureResponse(res, 400, error.message, logId)
  }
}

module.exports = { getUsers, getProfile, userProfile }