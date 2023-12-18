const {User} = require('../models/users')
const {Op} = require('sequelize')
const util = require('util');
const jwt = require('jsonwebtoken');

const getUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page, 10) || 1;
        const limit = parseInt(req.query.limit, 10) || 10;
        const search = req.query.search || '';
        const offset = (page - 1) * limit;
        const whereClause = {
            [Op.or]: [
                { firstName: { [Op.like]: `%${search}%` } },
                { lastName: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } },
            ],
        };
        const users = await User.findAndCountAll({
            attributes: ['userId', 'firstName', 'lastName', 'email', 'isAdmin', 'isVerified'],
            where: whereClause,
            offset,
            limit,
        });

        if (!users) {
            return res.status(400).json({
                status: "failed",
            });
        }
        const totalPages = Math.ceil(users.count / limit);
        const hasNextPage = page < totalPages;
        const hasPrevPage = page > 1;
        const nextLink = hasNextPage ? `api/getuser?page=${page + 1}&limit=${limit}&search=${search}` : null;
        const prevLink = hasPrevPage ? `api/getuser?page=${page - 1}&limit=${limit}&search=${search}` : null;

        res.status(200).json({
            status: "success",
            data: users.rows,
            pagination: {
                totalUsers: users.count,
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

const getProfile = async (req, res) => {
    
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
          console.log(decodeToken);
        } catch (error) {
          console.error('Error verifying JWT:', error);
          return res.status(401).json({ message: 'Unauthorized' });
        }
      }
  
      if (!id) {
        return res.status(400).json({ message: 'Sorry, User Does Not Exist' });
      }
  
      const user = await User.findOne({
        attributes:['userId','firstName','lastName','email','isAdmin','isVerified'],
        where: {
          userId: id,
        },
      });
  
      if (!user) {
        return res.status(404).json({ message: 'Sorry, User Not Found' });
      }
  
      return res.status(200).json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error('Error in getProfile:', error);
      return res.status(500).json({ message: 'Internal Server Error' });
    }
  };

const userProfile = async(req , res)=>{
    const {userId} = req.params;
    try {

    if (!userId) {
      return res.status(400).json({ message: 'Sorry, User Does Not Exist' });
    }

    const user = await User.findOne({
      attributes:['userId','firstName','lastName','email','isAdmin','isVerified'],
      where: {
        userId,
      },
    });

    if (!user) {
      return res.status(404).json({ message: 'Sorry, User Not Found' });
    }

    return res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error('Error in getProfile:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
}

module.exports = {getUsers , getProfile , userProfile}