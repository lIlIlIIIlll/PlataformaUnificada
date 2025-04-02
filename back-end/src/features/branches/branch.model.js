// src/features/branches/branch.model.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Branch extends Model {
    static associate(models) {
      // Branch has many Users
      Branch.hasMany(models.User, {
        foreignKey: 'branchId', // Corresponds to id_filial in users table
        as: 'users'
        // onDelete/onUpdate defined in User model's belongsTo
      });

      // Branch has many Lockers
      Branch.hasMany(models.Locker, {
        foreignKey: 'branchId', // Corresponds to branch_id in lockers table
        as: 'lockers',
        onDelete: 'CASCADE', // Match SQL constraint
        onUpdate: 'CASCADE'  // Match SQL constraint
      });

       // Branch has many LockerReservations
       Branch.hasMany(models.LockerReservation, {
        foreignKey: 'branchId', // Corresponds to branch_id in locker_reservations table
        as: 'reservations'
        // Consider onDelete: 'RESTRICT' if branches with active reservations can't be deleted
      });

      // Branch belongs to many Administrators (Many-to-Many)
      Branch.belongsToMany(models.Administrator, {
        through: 'administrator_branch', // Junction table name
        foreignKey: 'id_filial',        // FK in junction table pointing to Branch
        otherKey: 'id_adm',             // FK in junction table pointing to Administrator
        as: 'administrators',
        timestamps: false // Junction table likely doesn't have timestamps
      });
    }
  }

  Branch.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nome da filial.',
    },
    address: {
      type: DataTypes.TEXT,
      allowNull: true, // SQL allows NULL
      comment: 'Endereço da filial.',
    },
    // createdAt is handled by timestamps: true
    // The SQL specifies `createdAt DATETIME NOT NULL`. If you don't want `updatedAt`, set `timestamps: true, updatedAt: false`
  }, {
    sequelize,
    modelName: 'Branch',
    tableName: 'branches',
    timestamps: true, // Manages createdAt and updatedAt
    // If SQL *only* has createdAt:
    // timestamps: true,
    // updatedAt: false,
    // createdAt: 'createdAt' // Explicit mapping if needed
    underscored: true,
    comment: 'Tabela para armazenar informações das filiais.',
  });

  return Branch;
};