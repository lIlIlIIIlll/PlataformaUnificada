// src/features/administrators/administrator.model.js
const { DataTypes, Model } = require('sequelize');
// IMPORTANT: You'll need bcrypt for password hashing in your service/controller layer
// const bcrypt = require('bcrypt');

module.exports = (sequelize) => {
  class Administrator extends Model {
    // Example method for password validation (implement in service/controller usually)
    // async validPassword(password) {
    //   return bcrypt.compare(password, this.password);
    // }

    static associate(models) {
      // Administrator belongs to many Branches (Many-to-Many)
      Administrator.belongsToMany(models.Branch, {
        through: 'administrator_branch', // Junction table name
        foreignKey: 'id_adm',             // FK in junction table pointing to Administrator
        otherKey: 'id_filial',           // FK in junction table pointing to Branch
        as: 'branches',
        timestamps: false // Junction table likely doesn't have timestamps
      });
    }
  }

  Administrator.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nome do administrador.',
    },
    email: {
        type: DataTypes.STRING(255),
        allowNull: false,
        unique: true, // Match SQL UNIQUE constraint
        validate: { // Optional: Add email format validation
            isEmail: true,
        },
        comment: 'Email único do administrador para login.',
    },
    password: {
      type: DataTypes.STRING(255), // Stores the HASH, not plain text!
      allowNull: false,
      comment: 'Hash da senha do administrador.',
    },
    // createdAt is handled by timestamps: true
  }, {
    sequelize,
    modelName: 'Administrator',
    tableName: 'administrators',
    timestamps: true, // Manages createdAt and updatedAt
    // If SQL *only* has createdAt:
    // timestamps: true,
    // updatedAt: false,
    // createdAt: 'createdAt'
    underscored: true,
    comment: 'Tabela para armazenar dados dos administradores do painel.',
    // hooks: { // Example hook for hashing password BEFORE creation/update
    //   beforeCreate: async (admin) => {
    //     if (admin.password) {
    //       const salt = await bcrypt.genSalt(10);
    //       admin.password = await bcrypt.hash(admin.password, salt);
    //     }
    //   },
    //   beforeUpdate: async (admin) => {
    //     if (admin.changed('password')) { // Only hash if password changed
    //        const salt = await bcrypt.genSalt(10);
    //        admin.password = await bcrypt.hash(admin.password, salt);
    //     }
    //   }
    // }
  });

  return Administrator;
};