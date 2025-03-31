// src/features/models/user/user.model.js

const { DataTypes, Model } = require('sequelize');

// Definimos uma função que receberá a instância do sequelize
// e definirá o modelo dentro dela. Isso é útil para centralizar
// a inicialização e associações posteriormente.
module.exports = (sequelize) => {
  class User extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here if needed later
      // Ex: User.hasMany(models.LockerBooking);
    }
  }

  User.init({
    // ID Padrão gerenciado pelo Sequelize (PK, Auto Increment)
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      comment: 'Nome completo do usuário.',
    },
    whatsappNumber: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true, // Garante que cada número de WhatsApp seja único
      comment: 'Número do WhatsApp do usuário (usado como identificador principal). Formato E.164 recomendado (+55119...).',
    },
    cpf: {
      type: DataTypes.STRING,
      allowNull: false, // Será coletado na etapa 3
      unique: true, // Garante que cada CPF seja único
      comment: 'Cadastro de Pessoa Física do usuário.',
      // TODO: Adicionar validação de formato de CPF se necessário
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY, // Armazena apenas a data (YYYY-MM-DD)
      allowNull: false, // Será coletado na etapa 3
      comment: 'Data de nascimento do usuário.',
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true, // Será coletado na etapa 3, pode ser opcional dependendo da regra
      comment: 'Gênero do usuário.',
      // Poderia ser um ENUM: DataTypes.ENUM('Masculino', 'Feminino', 'Outro', 'Prefiro não informar')
    },
    photoUrl: {
        type: DataTypes.STRING, // Ou DataTypes.TEXT
        allowNull: false, // <-- MUDANÇA AQUI: Tornar obrigatório
        comment: 'URL ou identificador da foto de face obrigatória do usuário.', // <-- Atualização no comentário
    },
    address: {
      type: DataTypes.TEXT, // Usar TEXT para endereços potencialmente longos
      allowNull: true, // Será coletado na etapa 4, pode ser opcional para o fluxo principal
      comment: 'Endereço do usuário (coletado na etapa 4 ou fluxo sem foto).',
    },
    isBlocked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Indica se o usuário está bloqueado no sistema (ex: por débitos).',
    },
    // Campos de controle do Sequelize (createdAt, updatedAt) são adicionados automaticamente
    // Se precisar de campos específicos para Hikvision, podem ser adicionados aqui depois:
    // hikvisionPersonId: {
    //   type: DataTypes.STRING,
    //   allowNull: true,
    //   comment: 'ID do usuário no sistema Hikvision (se aplicável).'
    // }
    // isAdmin: { // Se for usar a mesma tabela para admins do painel
    //    type: DataTypes.BOOLEAN,
    //    defaultValue: false
    // }

  }, {
    // Opções do Modelo
    sequelize, // Passa a instância da conexão sequelize
    modelName: 'User', // Nome do modelo em CamelCase (usado no código JS)
    tableName: 'users', // Nome da tabela no banco de dados (geralmente plural e snake_case)
    timestamps: true, // Habilita createdAt e updatedAt automaticamente
    underscored: true, // Mapeia camelCase (whatsappNumber) para snake_case (whatsapp_number) no DB
    comment: 'Tabela para armazenar informações dos usuários finais do sistema.',
    // paranoid: true, // Se quiser usar soft delete (adiciona deletedAt) - opcional
  });

  return User;
};