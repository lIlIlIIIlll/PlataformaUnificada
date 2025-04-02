// src/features/users/user.service.js
const { User, Branch } = require('../../index'); // Import User and potentially Branch if needed
const { Op } = require('sequelize');

/**
 * Busca um usuário pelo número do WhatsApp.
 * @param {string} whatsappNumber - O número do WhatsApp.
 * @returns {Promise<User|null>}
 */
const findUserByWhatsappNumber = async (whatsappNumber) => {
    try {
        const user = await User.findOne({
            where: { whatsappNumber: whatsappNumber },
            // include: [{ model: Branch, as: 'branch' }] // Optionally include associated branch
        });
        return user;
    } catch (error) {
        console.error('Erro ao buscar usuário por WhatsApp:', error);
        throw new Error('Erro ao consultar banco de dados ao buscar por WhatsApp.');
    }
};

/**
 * Verifica a identidade de um usuário existente.
 * @param {string} whatsappNumber
 * @param {string} cpf
 * @param {string} dateOfBirth (YYYY-MM-DD).
 * @returns {Promise<User>}
 * @throws {Error}
 */
const verifyIdentityAndGetData = async (whatsappNumber, cpf, dateOfBirth) => {
    try {
        const user = await User.findOne({
            where: { whatsappNumber: whatsappNumber },
            // include: [{ model: Branch, as: 'branch' }] // Optionally include associated branch
        });

        if (!user) {
            throw new Error('Usuário não encontrado para este número de WhatsApp.');
        }

        // Explicitly compare DATEONLY part if necessary, depending on how DB stores it
        const dbDate = user.dateOfBirth instanceof Date ? user.dateOfBirth.toISOString().split('T')[0] : user.dateOfBirth;
        const inputDate = dateOfBirth; // Assume input is already YYYY-MM-DD string

        if (user.cpf === cpf && dbDate === inputDate) {
            // Update lastLoginAt - This might be better handled in a dedicated login service/middleware
            // user.lastLoginAt = new Date();
            // await user.save();
            return user;
        } else {
            throw new Error('CPF ou Data de Nascimento inválidos.');
        }
    } catch (error) {
        if (error.message === 'Usuário não encontrado para este número de WhatsApp.' || error.message === 'CPF ou Data de Nascimento inválidos.') {
            throw error;
        }
        console.error('Erro ao verificar identidade do usuário:', error);
        throw new Error('Erro durante a verificação de identidade.');
    }
};

/**
 * Cria um novo usuário.
 * @param {object} userData
 * @param {string} userData.name
 * @param {string} userData.whatsappNumber
 * @param {string} userData.cpf
 * @param {string} userData.dateOfBirth (YYYY-MM-DD)
 * @param {string} userData.photoPath - Caminho/URL da foto. Corrected param name.
 * @param {number} userData.branchId - ID da filial.
 * @param {string} userData.gender
 * @param {string} userData.address
 * @param {boolean} [userData.isBlocked=false]
 * @returns {Promise<User>}
 * @throws {Error}
 */
const createUser = async (userData) => {
    // Ensure required fields are present before hitting DB (controller does some, but service can double-check)
    if (!userData.name || !userData.whatsappNumber || !userData.cpf || !userData.dateOfBirth || !userData.photoPath || !userData.branchId || !userData.gender || !userData.address) {
        throw new Error('Erro de validação: Dados essenciais para criação do usuário estão faltando.');
    }

    try {
        // Check for existing CPF or WhatsApp
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

        // Add default values not handled by model/DB defaults if necessary
        const creationData = {
            ...userData,
            isBlocked: userData.isBlocked ?? false,
            // registeredAt: new Date(), // Handled by Sequelize timestamps: true
             // lastLoginAt should be set on actual login, not creation
             lastLoginAt: new Date() // Or set to null/default if appropriate at creation
        };


        const newUser = await User.create(creationData);
        return newUser;

    } catch (error) {
        if (error.message === 'CPF já cadastrado.' || error.message === 'Número de WhatsApp já cadastrado.' || error.message.startsWith('Erro de validação')) {
            throw error;
        }
        // Catch Sequelize validation errors
        if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
             // Make error more specific if possible (e.g., check error.index or error.fields)
             throw new Error(`Erro de chave estrangeira: A filial com ID ${userData.branchId} não foi encontrada.`);
         }
        console.error('Erro ao criar usuário:', error);
        throw new Error('Não foi possível criar o usuário devido a um erro interno.');
    }
};

/**
 * Busca todos os usuários (com filtros opcionais).
 * @param {object} options - Opções de filtro (e.g., { branchId: 1 })
 * @returns {Promise<User[]>}
 */
const findAllUsers = async (options = {}) => {
    try {
        const whereClause = {};
        if (options.branchId) {
            whereClause.branchId = options.branchId;
        }
        // Add other filters as needed

        const users = await User.findAll({
            where: whereClause,
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }], // Include basic branch info
            attributes: { exclude: ['password', 'updatedAt'] } // Example: exclude fields
        });
        return users;
    } catch (error) {
        console.error('Erro ao buscar todos os usuários:', error);
        throw new Error('Erro ao consultar banco de dados para listar usuários.');
    }
};

/**
 * Busca um usuário pelo ID.
 * @param {number} id - ID do usuário.
 * @returns {Promise<User|null>}
 */
const findUserById = async (id) => {
    try {
        const user = await User.findByPk(id, {
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
             // attributes: { exclude: ['password'] } // Exclude sensitive fields if any
        });
        return user;
    } catch (error) {
        console.error(`Erro ao buscar usuário por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar usuário por ID.');
    }
};

/**
 * Atualiza um usuário existente.
 * @param {number} id - ID do usuário a ser atualizado.
 * @param {object} userData - Dados a serem atualizados.
 * @returns {Promise<User|null>} - Retorna o usuário atualizado ou null se não encontrado.
 */
const updateUser = async (id, userData) => {
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return null; // Indicate not found
        }

        // Prevent updating certain fields directly if needed
        delete userData.id;
        delete userData.cpf;
        delete userData.whatsappNumber;
        delete userData.registeredAt;
        delete userData.createdAt;
        delete userData.updatedAt;

        // Update lastLoginAt if provided (e.g., during a login process)
        // if (userData.lastLoginAt) user.lastLoginAt = userData.lastLoginAt;

        // Apply updates
        await user.update(userData);
        return user; // Return the updated instance
    } catch (error) {
         if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
             throw new Error(`Erro de chave estrangeira: A filial com ID ${userData.branchId} não foi encontrada.`);
         }
        console.error(`Erro ao atualizar usuário (${id}):`, error);
        throw new Error('Erro interno ao atualizar usuário.');
    }
};

/**
 * Deleta um usuário pelo ID.
 * @param {number} id - ID do usuário a ser deletado.
 * @returns {Promise<boolean>} - Retorna true se deletado, false se não encontrado.
 */
const deleteUser = async (id) => {
    try {
        const user = await User.findByPk(id);
        if (!user) {
            return false; // Not found
        }
        await user.destroy();
        return true; // Deleted successfully
    } catch (error) {
         if (error.name === 'SequelizeForeignKeyConstraintError') {
            // Let the controller handle the 409 status code based on this error
            throw error;
        }
        console.error(`Erro ao deletar usuário (${id}):`, error);
        throw new Error('Erro interno ao deletar usuário.');
    }
};


module.exports = {
    findUserByWhatsappNumber,
    verifyIdentityAndGetData,
    createUser,
    findAllUsers,
    findUserById,
    updateUser,
    deleteUser,
};