// src/features/administrators/administrator.model.js
const { DataTypes, Model } = require('sequelize');
// const bcrypt = require('bcrypt'); // Mantenha se for usar hooks para hash

module.exports = (sequelize) => {
  class Administrator extends Model {
    // static associate(models) { ... } // Associação permanece a mesma
    static associate(models) {
      // Administrator belongs to many Branches (Many-to-Many)
      // Esta associação é PRIMORDIAL para Administradores de Filial
      Administrator.belongsToMany(models.Branch, {
        through: 'administrator_branch', // Nome da tabela de junção
        foreignKey: 'id_adm',             // FK na tabela de junção apontando para Administrator
        otherKey: 'id_filial',           // FK na tabela de junção apontando para Branch
        as: 'branches',                  // Alias para acessar as filiais associadas
        timestamps: false                // Tabela de junção provavelmente não tem timestamps
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
        unique: true,
        validate: {
            isEmail: true,
        },
        comment: 'Email único do administrador para login.',
    },
    password: {
      type: DataTypes.STRING(255), // Armazena o HASH
      allowNull: false,
      comment: 'Hash da senha do administrador.',
    },
    // --- NOVO CAMPO ROLE ---
    role: {
      type: DataTypes.ENUM('superadmin', 'branch_admin'), // Define os papéis permitidos
      allowNull: false,
      defaultValue: 'branch_admin', // Define 'branch_admin' como padrão ao criar
      comment: 'Define o nível de permissão: superadmin (geral) ou branch_admin (restrito à filial).',
    }
    // createdAt e updatedAt são gerenciados por timestamps: true
  }, {
    sequelize,
    modelName: 'Administrator',
    tableName: 'administrators',
    timestamps: true, // Gerencia createdAt e updatedAt
    underscored: true,
    comment: 'Tabela para armazenar dados dos administradores do painel.',
    // hooks: { ... } // Hooks de hash de senha podem ser adicionados aqui se necessário
  });

  return Administrator;
};