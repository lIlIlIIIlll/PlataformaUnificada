// src/features/payments/payment.model.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Payment extends Model {
    static associate(models) {
      // Payment belongs to one LockerReservation
      Payment.belongsTo(models.LockerReservation, {
        foreignKey: 'reservationId', // Corresponds to reservation_id
        as: 'reservation',
        onDelete: 'CASCADE', // Match SQL
        onUpdate: 'CASCADE'  // Match SQL
      });
    }
  }

  Payment.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    reservationId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'reservation_id', // Explicit mapping
        references: { model: 'locker_reservations', key: 'id' },
        comment: 'ID da reserva associada a este pagamento.',
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2), // Match SQL
      allowNull: false,
      comment: 'Valor do pagamento.',
    },
    paymentType: {
      type: DataTypes.ENUM('initial', 'extra_fee'), // Match SQL
      allowNull: false,
      comment: 'Tipo do pagamento (custo inicial ou taxa extra).',
    },
    paymentMethod: {
      type: DataTypes.ENUM('pix', 'credit_card', 'debit_card'), // Match SQL
      allowNull: false,
      comment: 'Método de pagamento utilizado.',
    },
    paymentGatewayId: {
      type: DataTypes.STRING(255), // Match SQL VARCHAR
      allowNull: false, // SQL requires it
      comment: 'ID da transação no gateway de pagamento.',
    },
    status: {
      type: DataTypes.ENUM(
        'pending',
        'completed',
        'failed',
        'refunded'
      ), // Match SQL
      allowNull: false,
      defaultValue: 'pending', // Match SQL default
      comment: 'Status do pagamento no gateway.',
    },
     // createdAt handled by timestamps: true, matches SQL default
     // updatedAt handled by timestamps: true
  }, {
    sequelize,
    modelName: 'Payment',
    tableName: 'payments',
    timestamps: true, // Matches SQL createdAt (with default) and potential updatedAt
    underscored: true,
    comment: 'Tabela para registrar os pagamentos das reservas.',
  });

  return Payment;
};