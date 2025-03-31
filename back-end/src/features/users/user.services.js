// src/features/users/user.service.js

// Importa o modelo User (assumindo que ele é inicializado e exportado de ../models/index.js)
// Se sua estrutura for diferente, ajuste o caminho.
const { User } = require('.'); // Ajuste o caminho se necessário
const { Op } = require('sequelize'); // Importa Operadores do Sequelize para queries mais complexas

/**
 * Busca um usuário pelo número do WhatsApp.
 * @param {string} whatsappNumber - O número do WhatsApp a ser buscado (formato E.164 recomendado).
 * @returns {Promise<User|null>} - Retorna a instância do usuário se encontrado, ou null caso contrário.
 * @throws {Error} - Lança erro se ocorrer um problema na consulta ao banco.
 */
const findUserByWhatsappNumber = async (whatsappNumber) => {
  try {
    const user = await User.findOne({
      where: { whatsappNumber: whatsappNumber },
    });
    return user; // Retorna o usuário encontrado ou null
  } catch (error) {
    console.error('Erro ao buscar usuário por WhatsApp:', error);
    throw new Error('Erro ao consultar banco de dados.'); // Lança um erro genérico para a camada superior
  }
};

/**
 * Verifica a identidade de um usuário existente usando WhatsApp, CPF e Data de Nascimento.
 * @param {string} whatsappNumber - Número do WhatsApp do usuário.
 * @param {string} cpf - CPF fornecido para verificação.
 * @param {string} dateOfBirth - Data de nascimento fornecida para verificação (formato YYYY-MM-DD).
 * @returns {Promise<User>} - Retorna a instância completa do usuário se a verificação for bem-sucedida.
 * @throws {Error} - Lança erro se o usuário não for encontrado, se os dados não baterem, ou se ocorrer erro no banco.
 */
const verifyIdentityAndGetData = async (whatsappNumber, cpf, dateOfBirth) => {
  try {
    const user = await User.findOne({
      where: { whatsappNumber: whatsappNumber },
    });

    if (!user) {
      throw new Error('Usuário não encontrado para este número de WhatsApp.');
    }

    // Compara CPF e Data de Nascimento (formato YYYY-MM-DD)
    if (user.cpf === cpf && user.dateOfBirth === dateOfBirth) {
      // TODO: Considerar retornar apenas os dados necessários em vez do objeto completo
      //       se houver informações sensíveis que não devem sempre trafegar.
      return user; // Dados conferem, retorna o usuário
    } else {
      throw new Error('CPF ou Data de Nascimento inválidos.'); // Dados não conferem
    }
  } catch (error) {
    // Se o erro já for um dos que lançamos, repassa. Senão, loga e lança um genérico.
    if (error.message === 'Usuário não encontrado para este número de WhatsApp.' || error.message === 'CPF ou Data de Nascimento inválidos.') {
        throw error;
    }
    console.error('Erro ao verificar identidade do usuário:', error);
    throw new Error('Erro durante a verificação de identidade.');
  }
};

/**
 * Cria um novo usuário no banco de dados.
 * @param {object} userData - Objeto contendo os dados do usuário a ser criado.
 * @param {string} userData.name - Nome completo.
 * @param {string} userData.whatsappNumber - Número do WhatsApp.
 * @param {string} userData.cpf - CPF.
 * @param {string} userData.dateOfBirth - Data de nascimento (YYYY-MM-DD).
 * @param {string} userData.photoUrl - URL da foto (obrigatória). // <-- MUDANÇA AQUI: Removido []
 * @param {string} [userData.gender] - Gênero (opcional).
 * @param {string} [userData.address] - Endereço (opcional).
 * @returns {Promise<User>} - Retorna a instância do usuário recém-criado.
 * @throws {Error} - Lança erro se CPF ou WhatsApp já existirem, ou se ocorrer erro no banco.
 */
const createUser = async (userData) => {
  try {
    // 1. Verificar se CPF ou WhatsApp já existem ANTES de tentar criar
    const existingUser = await User.findOne({
      where: {
        [Op.or]: [
          { cpf: userData.cpf },
          { whatsappNumber: userData.whatsappNumber }
        ]
      }
    });

    if (existingUser) {
      if (existingUser.cpf === userData.cpf) {
        throw new Error('CPF já cadastrado.');
      } else {
        throw new Error('Número de WhatsApp já cadastrado.');
      }
    }

    // 2. Se não existir, criar o usuário
    // Os campos em userData devem corresponder aos definidos no modelo User
    // O Sequelize cuida do mapeamento camelCase para snake_case (se underscored: true)
    const newUser = await User.create(userData);
    return newUser;

  } catch (error) {
     // Se o erro já for um dos que lançamos, repassa. Senão, loga e lança um genérico.
     if (error.message === 'CPF já cadastrado.' || error.message === 'Número de WhatsApp já cadastrado.') {
        throw error;
    }
    console.error('Erro ao criar usuário:', error);
    // Pode ser um erro de validação do Sequelize ou outro erro de banco
    throw new Error('Não foi possível criar o usuário.');
  }
};

// Exporta as funções do serviço
module.exports = {
  findUserByWhatsappNumber,
  verifyIdentityAndGetData,
  createUser,
};