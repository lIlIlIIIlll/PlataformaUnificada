// src/features/hikvisions/hikvision.model.js
const { DataTypes, Model } = require('sequelize');

module.exports = (sequelize) => {
  class Hikvision extends Model {
    static associate(models) {
      // Hikvision belongs to one Branch
      Hikvision.belongsTo(models.Branch, {
        foreignKey: 'branchId',
        as: 'branch',
        onDelete: 'CASCADE', // Ou 'RESTRICT'/'SET NULL' dependendo da regra de negócio
        onUpdate: 'CASCADE',
      });

      // Se Hikvision tiver outras relações (ex: logs de acesso), defina-as aqui
      // Hikvision.hasMany(models.AccessLog, { foreignKey: 'hikvisionId', as: 'accessLogs' });
    }
  }

  Hikvision.init({
    id: {
      type: DataTypes.BIGINT.UNSIGNED,
      autoIncrement: true,
      primaryKey: true,
      allowNull: false,
    },
    branchId: {
      type: DataTypes.BIGINT.UNSIGNED,
      allowNull: false,
      field: 'branch_id', // Mapeamento explícito para snake_case se necessário
      references: {
        model: 'branches', // Nome da tabela de filiais
        key: 'id',
      },
      comment: 'ID da filial à qual o dispositivo Hikvision pertence.',
    },
    name: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nome identificador do dispositivo Hikvision (ex: Entrada Principal).',
    },
    ipAddress: {
      type: DataTypes.STRING(45), // Suficiente para IPv4 ou IPv6
      allowNull: false,
      // Considere adicionar 'unique: true' se o IP deve ser único em toda a tabela,
      // ou criar um índice composto com branchId se for único por filial.
      validate: { // Validação opcional de formato de IP
         // isIP: true, // Cuidado: Valida tanto v4 quanto v6. Use isIPv4 ou isIPv6 se específico.
      },
      comment: 'Endereço IP do dispositivo Hikvision.',
    },
    port: {
      type: DataTypes.INTEGER.UNSIGNED, // Porta de rede
      allowNull: false,
      defaultValue: 80, // Ou outra porta padrão comum
      comment: 'Porta de comunicação do dispositivo Hikvision.',
    },
    username: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Nome de usuário para autenticação no dispositivo.',
    },
    password: {
      type: DataTypes.STRING(255), // Armazenar HASH da senha, NUNCA texto plano!
      allowNull: false,
      comment: 'Hash da senha para autenticação no dispositivo. NÃO ARMAZENAR EM TEXTO PLANO.',
      // Adicione getters/setters ou hooks para lidar com hashing se necessário aqui,
      // mas idealmente o hashing ocorre na camada de serviço/controller.
    },
    serialNumber: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true, // Número serial geralmente é único globalmente
      comment: 'Número de série único do dispositivo Hikvision.',
    },
    status: {
      type: DataTypes.ENUM('active', 'inactive', 'maintenance', 'error'),
      allowNull: false,
      defaultValue: 'active',
      comment: 'Status operacional do dispositivo Hikvision.',
    },
    // Adicione outros campos relevantes se necessário (ex: firmware version, model, etc.)
    // firmwareVersion: { type: DataTypes.STRING, allowNull: true },
    // modelName: { type: DataTypes.STRING, allowNull: true },

  }, {
    sequelize,
    modelName: 'Hikvision',
    tableName: 'hikvisions', // Nome da tabela no banco de dados
    timestamps: true, // Gerencia createdAt e updatedAt automaticamente
    underscored: true, // Mapeia camelCase para snake_case no DB (ex: branchId -> branch_id)
    comment: 'Tabela para armazenar informações dos dispositivos Hikvision.',
    // Índices podem ser definidos aqui para otimizar buscas
    // indexes: [
    //   { unique: true, fields: ['branch_id', 'ip_address', 'port'] } // Ex: IP+Porta único por filial
    // ]
  });

  return Hikvision;
};