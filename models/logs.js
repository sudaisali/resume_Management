const { DataTypes } = require('sequelize');
const sequelize = require('../database');

const Log = sequelize.define('Log', {
    logId: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    logNumber: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
    method: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    url: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    statusCode: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
    userAgent: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    host: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    header: {
        type: DataTypes.JSON, 
        allowNull: true,
    },
    payload: {
        type: DataTypes.JSON, 
        allowNull: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
            isEmail: true,
        },
    },
    activity: {
        type: DataTypes.STRING,
        allowNull: true,
       
    },
    
}, {
    tableName: 'logs',
    timestamps: true, 
});

Log.sync();

module.exports = { Log };
