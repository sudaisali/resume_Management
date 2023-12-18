const bcrypt = require('bcrypt')

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('test123456', 12); 
    await queryInterface.bulkInsert('Users', [
      {
        userId: 'bb3e6352-171e-44db-ab41-3237f027f5a2',
        firstName: 'John',
        lastName: 'Doe',
        email: 'test@gmail.com',
        password: hashedPassword, 
        isAdmin: true,
        isVerified: true,
         createdAt: new Date(),
         updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {});
  },
};
