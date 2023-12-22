const { DataTypes } = require('sequelize');
const sequelize = require('../database')

const ChatMessage = sequelize.define('ChatMessage', {
  messageId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
},
    message: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('user', 'bot'),
        allowNull: false,
    },
},{
  tableName: 'chatMessages',
  timestamps: true, 
});

sequelize.sync();

module.exports = {ChatMessage}