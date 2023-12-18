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
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
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
      { abortEarly: false }
    );
  
    if (error) {
      throw new Error(`Validation error: ${error.message}`);
    }
  });

  
  User.prototype.createRememberToken = function () {
    const buffer = crypto.randomBytes(32);
    const unhashedToken = buffer.toString('hex');  
    this.rememberToken = crypto.createHash('sha256').update(unhashedToken).digest('hex');
    this.rememberTokenExpiry = Date.now() + 24 * 60 * 60 * 1000;
    return unhashedToken; 
  };

  User.beforeUpdate(async (user, options) => {
    if (user.changed('password')) {
      user.password = await bcrypt.hash(user.password, 12);
      user.confirmPassword = null;
    }
  });

  User.prototype.comparePassword = async function (userPassword) {
    return await bcrypt.compare(userPassword, this.password);
  };
  
  
  
   

module.exports = {User};
