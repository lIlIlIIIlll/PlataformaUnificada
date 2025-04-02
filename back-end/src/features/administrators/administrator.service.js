// src/features/administrators/administrator.service.js
const { Administrator, Branch } = require('../../index'); // Import necessary models
const bcrypt = require('bcrypt'); // Import bcrypt for password hashing

const SALT_ROUNDS = 10; // Cost factor for hashing

/**
 * Hashes a plain text password.
 * @param {string} password - The plain text password.
 * @returns {Promise<string>} - The hashed password.
 */
const hashPassword = async (password) => {
    if (!password) throw new Error('Password cannot be empty.');
    return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Creates a new administrator with a hashed password.
 * @param {object} adminData - Data for the new administrator.
 * @param {string} adminData.name - Name of the administrator.
 * @param {string} adminData.email - Email (must be unique).
 * @param {string} adminData.password - Plain text password.
 * @returns {Promise<Administrator>} - The created administrator instance (without password).
 * @throws {Error} - If validation fails, email exists, or hashing fails.
 */
const createAdministrator = async (adminData) => {
    if (!adminData.email || !adminData.password || !adminData.name) {
        throw new Error('Nome, Email e Senha são obrigatórios.');
    }

    try {
        // Check if email already exists
        const existingAdmin = await Administrator.findOne({ where: { email: adminData.email } });
        if (existingAdmin) {
            throw new Error('Email já cadastrado.');
        }

        // Hash the password
        const hashedPassword = await hashPassword(adminData.password);

        const newAdmin = await Administrator.create({
            name: adminData.name,
            email: adminData.email,
            password: hashedPassword, // Store the hash
        });

        // Return data without the password hash
        const { password, ...adminWithoutPassword } = newAdmin.get({ plain: true });
        return adminWithoutPassword;

    } catch (error) {
        if (error.message === 'Email já cadastrado.') {
            throw error; // Re-throw specific error
        }
         if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
        console.error('Erro ao criar administrador:', error);
        throw new Error('Não foi possível criar o administrador.');
    }
};

/**
 * Finds all administrators.
 * @param {object} options - Optional query options (e.g., include associations).
 * @returns {Promise<Administrator[]>} - Array of administrators (without passwords).
 */
const findAllAdministrators = async (options = {}) => {
    try {
        const include = [];
         if (options.include === 'branches') {
            include.push({
                model: Branch,
                as: 'branches',
                attributes: ['id', 'name'], // Only include necessary branch info
                through: { attributes: [] } // Don't include junction table attributes
            });
        }

        const admins = await Administrator.findAll({
            attributes: { exclude: ['password'] }, // Exclude password hash
            include: include
        });
        return admins;
    } catch (error) {
        console.error('Erro ao buscar todos os administradores:', error);
        throw new Error('Erro ao consultar banco de dados para listar administradores.');
    }
};

/**
 * Finds an administrator by ID.
 * @param {number} id - The ID of the administrator.
 * @param {object} options - Optional query options (e.g., include associations).
 * @returns {Promise<Administrator|null>} - The administrator instance (without password) or null if not found.
 */
const findAdministratorById = async (id, options = {}) => {
    try {
         const include = [];
         if (options.include === 'branches') {
            include.push({
                model: Branch,
                as: 'branches',
                attributes: ['id', 'name'],
                through: { attributes: [] }
            });
        }
        const admin = await Administrator.findByPk(id, {
            attributes: { exclude: ['password'] },
             include: include
        });
        return admin;
    } catch (error) {
        console.error(`Erro ao buscar administrador por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar administrador por ID.');
    }
};

/**
 * Finds an administrator by email (useful for login).
 * @param {string} email - The email of the administrator.
 * @returns {Promise<Administrator|null>} - The administrator instance (including password hash) or null.
 */
const findAdministratorByEmail = async (email) => {
    try {
        const admin = await Administrator.findOne({
            where: { email: email },
            // Important: Do NOT exclude password here, needed for login verification
        });
        return admin;
    } catch (error) {
        console.error(`Erro ao buscar administrador por email (${email}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar administrador por email.');
    }
};


/**
 * Updates an existing administrator.
 * @param {number} id - The ID of the administrator to update.
 * @param {object} updateData - Data to update.
 * @param {string} [updateData.name] - New name.
 * @param {string} [updateData.email] - New email (must remain unique if changed).
 * @param {string} [updateData.password] - New plain text password (will be hashed).
 * @returns {Promise<Administrator|null>} - The updated administrator (without password) or null if not found.
 */
const updateAdministrator = async (id, updateData) => {
    try {
        const admin = await Administrator.findByPk(id);
        if (!admin) {
            return null; // Not found
        }

        // Prevent updating ID
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // If password is being updated, hash it
        if (updateData.password) {
            if (updateData.password.trim() === '') {
                throw new Error('Senha não pode ser vazia.')
            }
            updateData.password = await hashPassword(updateData.password);
        } else {
            // Don't update password if not provided
            delete updateData.password;
        }

        // If email is being updated, check uniqueness against OTHERS
        if (updateData.email && updateData.email !== admin.email) {
            const existingAdmin = await Administrator.findOne({ where: { email: updateData.email } });
            if (existingAdmin) {
                throw new Error('Email já cadastrado por outro administrador.');
            }
        }

        await admin.update(updateData);

        // Return updated data without password hash
        const { password, ...adminWithoutPassword } = admin.get({ plain: true });
        return adminWithoutPassword;

    } catch (error) {
        if (error.message.includes('Email já cadastrado') || error.message.includes('Senha não pode')) {
            throw error;
        }
         if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
        console.error(`Erro ao atualizar administrador (${id}):`, error);
        throw new Error('Erro interno ao atualizar administrador.');
    }
};

/**
 * Deletes an administrator by ID.
 * @param {number} id - The ID of the administrator to delete.
 * @returns {Promise<boolean>} - True if deleted, false if not found.
 */
const deleteAdministrator = async (id) => {
    try {
        const admin = await Administrator.findByPk(id);
        if (!admin) {
            return false; // Not found
        }
        // Consider if an admin can be deleted if associated with branches
        // const branches = await admin.getBranches();
        // if (branches && branches.length > 0) {
        //    throw new Error('Não é possível excluir administrador associado a filiais.');
        // }
        await admin.destroy();
        return true;
    } catch (error) {
        // if (error.message.includes('Não é possível excluir')) {
        //     throw error; // Let controller handle 409
        // }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
           // This might happen if the junction table has constraints, although unlikely if just deleting admin
            console.warn(`Foreign key constraint issue during admin deletion (${id}), potentially related to administrator_branch.`);
            throw error; // Let controller decide status (maybe 409)
        }
        console.error(`Erro ao deletar administrador (${id}):`, error);
        throw new Error('Erro interno ao deletar administrador.');
    }
};


module.exports = {
    createAdministrator,
    findAllAdministrators,
    findAdministratorById,
    findAdministratorByEmail, // Export for login service
    updateAdministrator,
    deleteAdministrator,
    // Note: Password comparison logic (bcrypt.compare) should live in the AUTH service/controller
};