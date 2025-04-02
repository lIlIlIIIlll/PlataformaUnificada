// src/features/lockers/locker.model.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Locker extends Model {
    static associate(models) {
      // Locker belongs to one Branch
      Locker.belongsTo(models.Branch, {
        foreignKey: 'branchId', // Corresponds to branch_id
        as: 'branch',
        onDelete: 'CASCADE', // Match SQL
        onUpdate: 'CASCADE'  // Match SQL
      });

      // Locker belongs to many LockerReservations (Many-to-Many)
      Locker.belongsToMany(models.LockerReservation, {
          through: 'reservations_lockers', // Junction table
          foreignKey: 'locker_id',        // FK in junction pointing to Locker
          otherKey: 'reservation_id',   // FK in junction pointing to Reservation
          as: 'reservations',
          timestamps: false
      });
    }
  }

  Locker.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    branchId: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
        field: 'branch_id', // Explicit mapping
        references: { model: 'branches', key: 'id' },
        comment: 'ID da filial onde o armário está localizado.',
    },
    lockerIdentifier: {
      type: DataTypes.TEXT, // Match SQL (or STRING if fixed format)
      allowNull: false,
      comment: 'Identificador único do armário dentro da filial (ex: A01).',
    },
    deviceId: {
      type: DataTypes.BIGINT, // Match SQL
      allowNull: false,
      comment: 'ID do dispositivo físico associado (eWeLink, etc.).',
    },
    status: {
      type: DataTypes.ENUM(
        'available',
        'occupied',
        'maintenance',
        'reserved' // Added from SQL
      ),
      allowNull: false,
      defaultValue: 'available', // Match SQL default
      comment: 'Status atual do armário.',
    },
    // createdAt and updatedAt are handled by timestamps: true and match SQL
  }, {
    sequelize,
    modelName: 'Locker',
    tableName: 'lockers',
    timestamps: true, // Matches SQL createdAt and updatedAt
    underscored: true,
    comment: 'Tabela para armazenar informações dos armários.',
  });

  return Locker;
};