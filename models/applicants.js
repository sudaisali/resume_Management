const { DataTypes } = require('sequelize');
const sequelize = require('../database');
const Joi = require('joi');

const Applicant = sequelize.define('Applicant', {
    applicantId: {
        type: DataTypes.UUID,
        allowNull: false,
        primaryKey: true,
    },
    userName: {
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
    qualification: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    cnic: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    address: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    phoneNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isNumeric: false,
        },
    },
    status: {
        type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
        allowNull: false,
        defaultValue: 'pending'
    },
    cv: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    isDelete: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
    }
}, {
    tableName: 'applicants',
    timestamps: true,
});

const applicantSchema = Joi.object({
    userName: Joi.string().trim().max(50).required().regex(/^[a-zA-Z]+$/).message('user name must be valid'),
    email: Joi.string().required().regex(/^[a-zA-Z][a-zA-Z0-9._%+-]*@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/).message('Email Must be valid'),
    qualification: Joi.string().required(),
    cnic: Joi.string().required().length(13).pattern(/^\d+$/).message('CNIC must contain only numbers and be of length 13'),
    address: Joi.string().required(),
    phoneNumber: Joi.string().length(13).required().pattern(/^\+[0-9]+$/).message('Phone number must start with "+" and contain only digits after that'),
    status: Joi.valid('pending', 'accepted', 'rejected').required(),
    cv: Joi.string().required(),
    age: Joi.number().integer().required().min(0).max(120),
}).options({ stripUnknown: true });;

Applicant.beforeValidate(async (applicant, options) => {
    try {
        await applicantSchema.validateAsync(applicant);
    } catch (error) {
        throw new Error(error.details.map(detail => detail.message).join(', '));

    }
});


Applicant.sync();

module.exports = { Applicant };
