// src/features/users/user.model.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      // User belongs to one Branch
      User.belongsTo(models.Branch, {
        foreignKey: 'branchId', // Corresponds to id_filial in SQL
        as: 'branch',
        // Consider onDelete behavior based on SQL: ON DELETE SET NULL or RESTRICT might be needed
        // onDelete: 'SET NULL', // Example if users shouldn't be deleted with branch
        // onUpdate: 'CASCADE' // Usually safe
      });

      // User has many LockerReservations
      User.hasMany(models.LockerReservation, {
        foreignKey: 'userId', // Corresponds to user_id in SQL
        as: 'reservations',
        // Consider onDelete behavior: RESTRICT if users with active reservations can't be deleted
        // onDelete: 'RESTRICT', // Example
        // onUpdate: 'CASCADE'
      });
    }
  }

  User.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED, // Match SQL
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    // Foreign Key for Branch
    branchId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'id_filial', // Explicitly map to the SQL column name
        references: { // Optional: Define reference here too
            model: 'branches', // table name
            key: 'id'
        },
        comment: 'ID da filial à qual o usuário pertence.',
    },
    // --- Hikvision Employee Number ---
    employeeNo: {
      type: DataTypes.STRING, // Hikvision expects a string identifier
      allowNull: true,       // Permitir nulo se o usuário ainda não foi sincronizado ou se o ID não é mandatório inicialmente
      unique: true,          // Deve ser único se usado como identificador no sistema Hikvision
      comment: 'ID único do usuário no sistema Hikvision (Person ID / EmployeeNo). Pode ser CPF, UUID, ID interno, etc.',
    },
    // --- User Details ---
    name: {
      type: DataTypes.TEXT, // Match SQL
      allowNull: false,
      comment: 'Nome completo do usuário.',
    },
    whatsappNumber: {
      type: DataTypes.TEXT, // Match SQL (Consider STRING if format is fixed)
      allowNull: false,
      unique: true, // Keep unique constraint if needed (SQL doesn't specify but likely desired)
      comment: 'Número do WhatsApp do usuário.',
    },
    cpf: {
      type: DataTypes.STRING(11),
      allowNull: false,
      unique: true, // Keep unique constraint if needed (SQL doesn't specify but likely desired)
      comment: 'CPF do usuário.',
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY, // Match SQL DATE
      allowNull: false,
      comment: 'Data de nascimento do usuário.',
    },
    gender: {
      type: DataTypes.STRING, // Match SQL VARCHAR(255)
      allowNull: false, // SQL specifies NOT NULL
      comment: 'Gênero do usuário.',
       // Consider ENUM if you prefer stricter validation:
       // type: DataTypes.ENUM('Masculino', 'Feminino', 'Outro', 'Prefiro não informar'),
    },
    address: {
      type: DataTypes.STRING, // Match SQL VARCHAR(255)
      allowNull: false, // SQL specifies NOT NULL
      comment: 'Endereço do usuário.',
    },
    isBlocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false, // Match SQL default
        comment: 'Indica se o usuário está bloqueado.',
    },
    photoPath: {
        type: DataTypes.TEXT, // Match SQL
        allowNull: false, // SQL specifies NOT NULL
        comment: 'Caminho ou identificador da foto obrigatória do usuário.',
    },
    registeredAt: {
        type: DataTypes.DATE, // Match SQL DATETIME
        allowNull: false,
        defaultValue: DataTypes.NOW, // Set default in Sequelize if needed
        comment: 'Data e hora do cadastro inicial.',
    },
    lastLoginAt: {
        type: DataTypes.DATE, // Match SQL DATETIME
        allowNull: false, // SQL requires it, might need manual update on login
        comment: 'Data e hora do último login.',
    }
    // createdAt and updatedAt are handled by timestamps: true
    // hikvisionPersonId removed as it's not in the new SQL schema

  }, {
    sequelize,
    modelName: 'User',
    tableName: 'users',
    timestamps: true, // Assumes createdAt and updatedAt columns exist or should be managed by Sequelize
    underscored: true, // Maps camelCase to snake_case (e.g., branchId -> branch_id in DB queries if not explicitly mapped by `field`)
    // createdAt: 'registeredAt', // Use specific column name if timestamps: true is used and names differ. Requires updatedAt too.
    // updatedAt: false, // Or specify the column name if it exists
    comment: 'Tabela para armazenar informações dos usuários finais.',
  });

  return User;
};