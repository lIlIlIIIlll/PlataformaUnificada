// src/features/branches/branch.service.js
const { Branch, User, Locker, Administrator } = require('../../index'); // Import necessary models

const createBranch = async (branchData) => {
    try {
        const newBranch = await Branch.create(branchData);
        return newBranch;
    } catch (error) {
        console.error('Erro ao criar filial:', error);
         if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error('Não foi possível criar a filial.');
    }
};

const findAllBranches = async (options = {}) => {
    try {
        // Add options for including associations if needed
        const include = [];
        if (options.include === 'users') include.push({ model: User, as: 'users', attributes: ['id', 'name'] });
        if (options.include === 'lockers') include.push({ model: Locker, as: 'lockers', attributes: ['id', 'lockerIdentifier', 'status'] });
        if (options.include === 'administrators') include.push({ model: Administrator, as: 'administrators', attributes: ['id', 'name', 'email'], through: { attributes: [] } }); // Exclude junction table attributes


        const branches = await Branch.findAll({ include });
        return branches;
    } catch (error) {
        console.error('Erro ao buscar todas as filiais:', error);
        throw new Error('Erro ao consultar banco de dados para listar filiais.');
    }
};

const findBranchById = async (id, options = {}) => {
    try {
         const include = [];
        if (options.include === 'users') include.push({ model: User, as: 'users', attributes: ['id', 'name'] });
        if (options.include === 'lockers') include.push({ model: Locker, as: 'lockers', attributes: ['id', 'lockerIdentifier', 'status'] });
        if (options.include === 'administrators') include.push({ model: Administrator, as: 'administrators', attributes: ['id', 'name', 'email'], through: { attributes: [] } });

        const branch = await Branch.findByPk(id, { include });
        return branch;
    } catch (error) {
        console.error(`Erro ao buscar filial por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar filial por ID.');
    }
};

const updateBranch = async (id, branchData) => {
    try {
        const branch = await Branch.findByPk(id);
        if (!branch) {
            return null; // Not found
        }
        await branch.update(branchData);
        return branch;
    } catch (error) {
        console.error(`Erro ao atualizar filial (${id}):`, error);
         if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
        throw new Error('Erro interno ao atualizar filial.');
    }
};

const deleteBranch = async (id) => {
    try {
        const branch = await Branch.findByPk(id);
        if (!branch) {
            return false; // Not found
        }
        // Add checks here if needed (e.g., cannot delete branch with active lockers/reservations)
        // Example:
        // const activeLockers = await Locker.count({ where: { branchId: id, status: 'occupied' } });
        // if (activeLockers > 0) {
        //    throw new Error('Não é possível excluir filial com armários ocupados.');
        // }
        await branch.destroy();
        return true;
    } catch (error) {
         if (error.name === 'SequelizeForeignKeyConstraintError') {
            // Usually means related records exist (users, lockers, etc.)
             throw error; // Let controller handle 409
        }
        console.error(`Erro ao deletar filial (${id}):`, error);
        throw new Error('Erro interno ao deletar filial.');
    }
};

// --- Service for managing Administrator associations ---
const addAdministratorToBranch = async (branchId, administratorId) => {
    try {
        const branch = await Branch.findByPk(branchId);
        const administrator = await Administrator.findByPk(administratorId);
        if (!branch || !administrator) {
            throw new Error('Filial ou Administrador não encontrado.');
        }
        await branch.addAdministrator(administrator); // Uses the 'as: administrators' association method
        return true;
    } catch (error) {
         if (error.name === 'SequelizeUniqueConstraintError') {
             throw new Error('Administrador já associado a esta filial.');
         }
        console.error(`Erro ao associar Admin (${administratorId}) à Filial (${branchId}):`, error);
        throw new Error('Erro ao associar administrador à filial.');
    }
};

const removeAdministratorFromBranch = async (branchId, administratorId) => {
    try {
        const branch = await Branch.findByPk(branchId);
        const administrator = await Administrator.findByPk(administratorId);
        if (!branch || !administrator) {
            throw new Error('Filial ou Administrador não encontrado.');
        }
        const removed = await branch.removeAdministrator(administrator); // Uses association method
        if (removed === 0) {
            throw new Error('Associação entre Administrador e Filial não encontrada para remoção.');
        }
        return true;
    } catch (error) {
        console.error(`Erro ao remover Admin (${administratorId}) da Filial (${branchId}):`, error);
        throw new Error('Erro ao remover associação de administrador da filial.');
    }
};


module.exports = {
    createBranch,
    findAllBranches,
    findBranchById,
    updateBranch,
    deleteBranch,
    addAdministratorToBranch,
    removeAdministratorFromBranch,
};