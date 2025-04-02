// src/index.js

const SQ = require('./config/database'); // Importa a instância da conexão

// Import model initializers
const UserInit = require('./features/users/user.model');
const BranchInit = require('./features/branches/branch.model');
const AdministratorInit = require('./features/administrators/administrator.model'); // Adjust path if needed
const LockerInit = require('./features/lockers/locker.model');
const LockerReservationInit = require('./features/reservations/locker_reservation.model');
const PaymentInit = require('./features/payments/payment.model');
const SettingInit = require('./features/settings/setting.model');

// Initialize models
const db = {};
db.User = UserInit(SQ);
db.Branch = BranchInit(SQ);
db.Administrator = AdministratorInit(SQ);
db.Locker = LockerInit(SQ);
db.LockerReservation = LockerReservationInit(SQ);
db.Payment = PaymentInit(SQ);
db.Setting = SettingInit(SQ);

// IMPORTANT: Setup Associations AFTER all models are initialized
console.log("Running model associations...");
Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    console.log(`- Associating ${modelName}`);
    db[modelName].associate(db);
  }
});
console.log("Model associations complete.");


// Save the sequelize instance and Sequelize library itself if needed elsewhere
db.SQ = SQ;
// const { Sequelize } = require('sequelize'); // If you need Sequelize static methods/types
// db.Sequelize = Sequelize;


// Export the db object containing all models and the connection
module.exports = db;