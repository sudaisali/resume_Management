const Sequelize = require('sequelize')

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USERNAME, '', {
    host: 'localhost',
    dialect: 'mysql',
    // logging:false
});


module.exports = sequelize