const { Sequelize, DataTypes } = require('sequelize');
const sequelize = require('../database');
const crypto = require('crypto')
const Joi = require('joi');
const bcrypt = require('bcrypt')

const User = sequelize.define('User', {
  userId: {
    type: DataTypes.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
      is: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  confirmPassword: {
    type: DataTypes.VIRTUAL,
    validate: {
      isConfirmPasswordMatch() {
        if (this.confirmPassword !== this.password) {
          throw new Error('Confirm password must match the password');
        }
      },
    },
  },
   rememberToken: {
    type: DataTypes.STRING,
  },
  isAdmin: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  isVerified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  rememberTokenExpiry: {
    type: DataTypes.DATE,
  },
  passwordUpdatedAt:{
    type: DataTypes.DATE
  }
}, {
    tableName: 'users',
    timestamps: true,
  });
  const userSchema = Joi.object({
      firstName: Joi.string().trim().max(50).required().regex(/^[a-zA-Z][a-zA-Z0-9 ]*$/).message('First Name must be valid'),
      lastName: Joi.string().trim().max(50).required().regex(/^[a-zA-Z][a-zA-Z0-9 ]*$/).message('Last Name must be valid'),
      email: Joi.string().required().regex(/^[a-zA-Z][a-zA-Z0-9._%+-]*@gmail+\.[a-zA-Z]{2,}$/).message('Email must be valid'),
      password: Joi.string().min(8).allow(null), 
  });
  User.addHook('beforeValidate', (user, options) => {
    const { error } = userSchema.validate(
      { 
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        password: user.password !== null ? user.password : undefined,
      },
      { abortEarly: true }
    );
  
    if (error) {
      throw new Error(error.details.map(detail => detail.message).join(', '));
    }
  });
  User.prototype.createRememberToken = function () {
    const buffer = crypto.randomBytes(32);
    const unhashedToken = buffer.toString('hex');  
    this.rememberToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');
    // this.rememberTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    this.rememberTokenExpiry = Date.now() + 5 * 60 * 1000;
    return unhashedToken; 
  };

  User.beforeUpdate(async (user, options) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 12);
      user.confirmPassword = null;
    }
  });

User.prototype.comparePassword = async function (userPassword) {
  try {
      if (!this.password) {
          return false;
      }
      const result = await bcrypt.compare(userPassword, this.password);
      return result;
  } catch (error) {
      console.error("Error comparing passwords:", error);
      throw new Error("Error comparing passwords");
  }
};

User.prototype.isPasswordChanged = function (jwtTimeStamp) {
  if(this.passwordUpdatedAt){
    const pswrdUpdateTimeStamp = Math.floor(this.passwordUpdatedAt.getTime() /1000)
    if(pswrdUpdateTimeStamp > jwtTimeStamp){
      return true
    }else{
      return false
    }
     
  }
  return false
};

  
  
  
   

module.exports = {User};
