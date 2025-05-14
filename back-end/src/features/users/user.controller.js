// src/features/users/user.controller.js
const userService = require('./user.services'); // Corrected import path assuming services is in the same directory

/**
 * Controller para verificar a existência de um usuário pelo número do WhatsApp.
 * Responde à rota GET /users/check-existence?whatsappNumber=...
 */
const checkUserExistence = async (req, res, next) => {
    const { whatsappNumber } = req.query;

    if (!whatsappNumber) {
        return res.status(400).json({ message: 'Número do WhatsApp é obrigatório na query string (whatsappNumber).' });
    }

    try {
        const user = await userService.findUserByWhatsappNumber(whatsappNumber);
        return res.status(200).json({ exists: !!user });
    } catch (error) {
        console.error(`[UserController:checkUserExistence] Erro: ${error.message}`);
        // Pass error to a potential global error handler
        next(error);
        // Or return a generic error
        // return res.status(500).json({ message: 'Erro interno ao verificar existência do usuário.' });
    }
};

/**
 * Controller para criar um novo usuário.
 * Responde à rota POST /users
 */
const createUser = async (req, res, next) => {
    const userData = req.body;

    // Updated required fields to match the model 'photoPath'
    const requiredFields = ['name', 'whatsappNumber', 'cpf', 'dateOfBirth', 'photoPath', 'branchId', 'gender', 'address']; // Added missing fields based on model definition (branchId, gender, address)
    const missingFields = requiredFields.filter(field => !(field in userData) || userData[field] === null || userData[field] === '');

    if (missingFields.length > 0) {
        return res.status(400).json({
            message: `Campos obrigatórios faltando ou vazios no corpo da requisição: ${missingFields.join(', ')}`
        });
    }

    // Add default values or handle optional fields if necessary
    // Example: userData.isBlocked = userData.isBlocked ?? false; // Set default if not provided
    // Example: userData.lastLoginAt needs to be set appropriately elsewhere, likely not during creation.

    try {
        // Consider adding branchId validation if needed (e.g., check if branch exists)
        const newUser = await userService.createUser(userData);
        // Return only necessary fields, avoid sending back sensitive data if any
        const { id, name, whatsappNumber, cpf, dateOfBirth, gender, address, photoPath, isBlocked, registeredAt, branchId } = newUser;
        return res.status(201).json({ id, name, whatsappNumber, cpf, dateOfBirth, gender, address, photoPath, isBlocked, registeredAt, branchId });
    } catch (error) {
        console.error(`[UserController:createUser] Erro: ${error.message}`);
        // Handle specific service errors
        if (error.message.includes('já cadastrado')) { // More robust check
            return res.status(409).json({ message: error.message }); // 409 Conflict
        }
        if (error.name === 'SequelizeValidationError' || error.message.startsWith('Erro de validação')) {
            // Extract validation error messages if possible
            const messages = error.errors ? error.errors.map(e => e.message).join(', ') : error.message;
            return res.status(400).json({ message: `Erro de validação: ${messages}` });
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: `Erro de chave estrangeira: Verifique se o 'branchId' (${userData.branchId}) existe.` });
        }
        // Pass error to a potential global error handler
        next(error);
        // Or return a generic error
        // return res.status(500).json({ message: 'Erro interno ao criar usuário.' });
    }
};

/**
 * Controller para verificar a identidade de um usuário (CPF/DataNasc) dado o WhatsApp.
 * Responde à rota POST /users/verify
 */
const verifyUserIdentity = async (req, res, next) => {
    const { whatsappNumber, cpf, dateOfBirth } = req.body;

    if (!whatsappNumber || !cpf || !dateOfBirth) {
        return res.status(400).json({ message: 'Campos whatsappNumber, cpf e dateOfBirth são obrigatórios no corpo da requisição.' });
    }

    try {
        const verifiedUser = await userService.verifyIdentityAndGetData(whatsappNumber, cpf, dateOfBirth);
        // Return only necessary/safe fields
        const { id, name, whatsappNumber: verifiedWhatsapp, cpf: verifiedCpf, dateOfBirth: verifiedDob, gender, address, photoPath, isBlocked, branchId } = verifiedUser;
        return res.status(200).json({ id, name, whatsappNumber: verifiedWhatsapp, cpf: verifiedCpf, dateOfBirth: verifiedDob, gender, address, photoPath, isBlocked, branchId });
    } catch (error) {
        console.error(`[UserController:verifyUserIdentity] Erro: ${error.message}`);
        if (error.message === 'Usuário não encontrado para este número de WhatsApp.') {
            return res.status(404).json({ message: error.message });
        }
        if (error.message === 'CPF ou Data de Nascimento inválidos.') {
            return res.status(401).json({ message: 'Falha na verificação: CPF ou Data de Nascimento não conferem.' });
        }
        // Pass error to a potential global error handler
        next(error);
        // Or return a generic error
        // return res.status(500).json({ message: 'Erro interno durante a verificação de identidade.' });
    }
};

// --- Placeholder for other CRUD operations ---

const getAllUsers = async (req, res, next) => {
    try {
        // Add query parameters for filtering/pagination if needed (e.g., req.query.branchId)
        const users = await userService.findAllUsers(req.query);
         // Consider returning only necessary fields per user
        return res.status(200).json(users);
    } catch (error) {
        console.error(`[UserController:getAllUsers] Erro: ${error.message}`);
        next(error);
    }
};

const getUserById = async (req, res, next) => {
    const { id } = req.params;
    try {
        const user = await userService.findUserById(id);
        if (!user) {
            return res.status(404).json({ message: 'Usuário não encontrado.' });
        }
        // Return only necessary/safe fields
        const { name, whatsappNumber, cpf, dateOfBirth, gender, address, photoPath, isBlocked, registeredAt, lastLoginAt, branchId } = user;
        return res.status(200).json({ id, name, whatsappNumber, cpf, dateOfBirth, gender, address, photoPath, isBlocked, registeredAt, lastLoginAt, branchId });
    } catch (error) {
        console.error(`[UserController:getUserById] Erro: ${error.message}`);
        next(error);
    }
};

const updateUser = async (req, res, next) => {
    const { id } = req.params;
    const userData = req.body;
     // Prevent updating critical fields like id, cpf?, whatsappNumber? maybe?
    delete userData.id;
    delete userData.cpf; // Example: CPF shouldn't be updatable
    delete userData.whatsappNumber; // Example: WhatsApp shouldn't be updatable this way
    delete userData.registeredAt;
    delete userData.createdAt;
    delete userData.updatedAt;

    try {
        const updatedUser = await userService.updateUser(id, userData);
        if (!updatedUser) {
             return res.status(404).json({ message: 'Usuário não encontrado para atualização.' });
        }
        // Return only necessary/safe fields
        const { name, dateOfBirth, gender, address, photoPath, isBlocked, lastLoginAt, branchId } = updatedUser;
        return res.status(200).json({ id: updatedUser.id, name, dateOfBirth, gender, address, photoPath, isBlocked, lastLoginAt, branchId });
    } catch (error) {
        console.error(`[UserController:updateUser] Erro: ${error.message}`);
         if (error.name === 'SequelizeValidationError') {
            const messages = error.errors ? error.errors.map(e => e.message).join(', ') : error.message;
            return res.status(400).json({ message: `Erro de validação: ${messages}` });
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ message: `Erro de chave estrangeira: Verifique se o 'branchId' existe.` });
        }
        next(error);
    }
};

const deleteUser = async (req, res, next) => {
    const { id } = req.params;
    try {
        const deleted = await userService.deleteUser(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Usuário não encontrado para exclusão.' });
        }
        return res.status(204).send(); // No Content
    } catch (error) {
        console.error(`[UserController:deleteUser] Erro: ${error.message}`);
         if (error.name === 'SequelizeForeignKeyConstraintError') {
            // Foreign key constraint error (e.g., user has reservations)
            return res.status(409).json({ message: 'Não é possível excluir o usuário pois ele possui registros associados (ex: reservas).' });
        }
        next(error);
    }
};


module.exports = {
    checkUserExistence,
    createUser,
    verifyUserIdentity,
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
};