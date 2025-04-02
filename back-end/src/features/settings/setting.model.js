// src/features/settings/setting.model.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Setting extends Model {
    static associate(models) {
      // No associations defined in the provided SQL
    }
  }

  Setting.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true, // Match SQL UNIQUE constraint
      comment: 'Nome único da configuração (chave).',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true, // SQL allows NULL
      comment: 'Descrição opcional da configuração.',
    },
    value: {
      type: DataTypes.TEXT, // Match SQL
      allowNull: false, // SQL requires it
      comment: 'Valor da configuração.',
      // Consider getters/setters if value needs parsing (e.g., JSON)
      // get() {
      //    try { return JSON.parse(this.getDataValue('value')); } catch (e) { return this.getDataValue('value'); }
      // },
      // set(value) {
      //    this.setDataValue('value', typeof value === 'string' ? value : JSON.stringify(value));
      // }
    },
    // createdAt and updatedAt match SQL defaults/updates via timestamps: true
  }, {
    sequelize,
    modelName: 'Setting',
    tableName: 'settings',
    timestamps: true, // Matches SQL createdAt and updatedAt defaults/updates
    underscored: true,
    comment: 'Tabela para configurações gerais do sistema.',
  });

  return Setting;
};