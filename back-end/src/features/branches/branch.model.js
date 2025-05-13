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
    // --- Campos para Gerenciamento do WhatsApp da Filial ---
    whatsappSessionId: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
      field: 'whatsapp_session_id', // Mapeia para snake_case no banco
      comment: 'ID da sessão do WhatsApp para esta filial (usado como clientId no whatsapp-web.js).',
    },
    whatsappStatus: {
      type: DataTypes.ENUM('disconnected', 'connecting', 'qr_pending', 'connected', 'auth_failure', 'error', 'initializing', 'destroying'),
      defaultValue: 'disconnected',
      allowNull: false,
      field: 'whatsapp_status',
      comment: 'Status atual da conexão do WhatsApp da filial.',
    },
    whatsappLastError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'whatsapp_last_error',
      comment: 'Última mensagem de erro relacionada à conexão do WhatsApp.',
    },
    whatsappQrCode: {
      type: DataTypes.TEXT, // Armazena o QR code em base64
      allowNull: true,
      field: 'whatsapp_qr_code',
      comment: 'QR code (base64) para escanear, quando o status é qr_pending.',
    },
    whatsappNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'whatsapp_number',
      comment: 'Número de WhatsApp conectado à filial após autenticação bem-sucedida.',
    },
    openaiAssistantIdOverride: {
        type: DataTypes.STRING,
        allowNull: true,
        field: 'openai_assistant_id_override',
        comment: 'ID do Assistente OpenAI específico para esta filial (sobrescreve o global, se definido).',
    },
    // --- Fim dos Campos WhatsApp ---
    // createdAt is handled by timestamps: true
    // The SQL specifies `createdAt DATETIME NOT NULL`. If you don't want `updatedAt`, set `timestamps: true, updatedAt: false`
  }, {
    sequelize,
    modelName: 'Branch',
 નાના: 'branches',
    timestamps: true, // Manages createdAt and updatedAt
    underscored: true, // Mapeia camelCase para snake_case (ex: whatsappSessionId -> whatsapp_session_id no DB)
    comment: 'Tabela para armazenar informações das filiais, incluindo configurações de WhatsApp.',
  });

  return Branch;
};