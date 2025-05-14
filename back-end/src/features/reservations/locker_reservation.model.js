// src/features/reservations/locker_reservation.model.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class LockerReservation extends Model {
    static associate(models) {
      // Reservation belongs to one User
      LockerReservation.belongsTo(models.User, {
        foreignKey: 'userId', // Corresponds to user_id
        as: 'user'
        // onDelete/onUpdate defined in User model's hasMany
      });

      // Reservation belongs to one Branch
      LockerReservation.belongsTo(models.Branch, {
        foreignKey: 'branchId', // Corresponds to branch_id
        as: 'branch'
        // onDelete/onUpdate defined in Branch model's hasMany
      });

      // Reservation has many Payments
      LockerReservation.hasMany(models.Payment, {
        foreignKey: 'reservationId', // Corresponds to reservation_id in payments
        as: 'payments',
        onDelete: 'CASCADE', // Match SQL
        onUpdate: 'CASCADE'  // Match SQL
      });

      // Reservation belongs to many Lockers (Many-to-Many)
      LockerReservation.belongsToMany(models.Locker, {
        through: 'reservations_lockers', // Junction table
        foreignKey: 'reservation_id', // FK in junction pointing to Reservation
        otherKey: 'locker_id',      // FK in junction pointing to Locker
        as: 'lockers',
        timestamps: false
      });
    }
  }

  LockerReservation.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    userId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'user_id', // Explicit mapping
        references: { model: 'users', key: 'id' },
        comment: 'ID do usuário que fez a reserva.',
    },
    branchId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'branch_id', // Explicit mapping
        references: { model: 'branches', key: 'id' },
        comment: 'ID da filial onde a reserva foi feita.',
    },
    retrievalCode: {
      type: DataTypes.BIGINT, // Match SQL (Consider STRING if leading zeros matter)
      allowNull: false,
      // unique: true, // Add if SQL implies/requires it
      comment: 'Código para retirada do objeto.',
    },
    paymentStatus: {
        type: DataTypes.ENUM(
            'pending_payment',
            'active', // Reservation paid and object inside
            'awaiting_retrieval', // Service done, waiting for client
            'completed', // Object retrieved
            'cancelled'
        ),
        allowNull: false,
        defaultValue: 'pending_payment', // Match SQL default
        comment: 'Status do pagamento e ciclo de vida da reserva.',
    },
    depositTime: {
      type: DataTypes.DATE, // Match SQL DATETIME
      allowNull: false, // SQL requires it
      comment: 'Data/hora que o objeto foi depositado (porta fechou).',
    },
    retrievalTime: {
        type: DataTypes.DATE, // Match SQL DATETIME
        allowNull: true, // Can be null until retrieved
        // SQL requires NOT NULL, adjust if logic allows null initially
        comment: 'Data/hora que o objeto foi retirado.',
    },
    initialCost: {
      type: DataTypes.DECIMAL(10, 2), // Match SQL
      allowNull: false,
      comment: 'Custo inicial da reserva.',
    },
    extraFee: {
      type: DataTypes.DECIMAL(10, 2), // Match SQL
      allowNull: false, // SQL requires NOT NULL
      defaultValue: 0.00, // Match SQL default
      comment: 'Taxa extra cobrada por atraso.',
    },
    totalPaid: {
      type: DataTypes.DECIMAL(10, 2), // Match SQL
      allowNull: false, // SQL requires NOT NULL
      defaultValue: 0.00, // Match SQL default
      comment: 'Valor total pago (inicial + taxas extras).',
    },
     dueTime: {
        type: DataTypes.DATE, // Match SQL DATETIME
        allowNull: false, // SQL requires it
        comment: 'Prazo para retirada antes da cobrança de taxa extra.',
     },
    // createdAt is handled by timestamps: true
    // SQL only specifies createdAt, so maybe updatedAt: false
  }, {
    sequelize,
    modelName: 'LockerReservation',
    tableName: 'locker_reservations',
    timestamps: true, // Manages createdAt and updatedAt
    // If SQL *only* has createdAt:
    // timestamps: true,
    // updatedAt: false,
    // createdAt: 'createdAt'
    underscored: true,
    comment: 'Tabela para armazenar informações das reservas de armários.',
  });

  return LockerReservation;
};