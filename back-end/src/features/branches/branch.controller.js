// src/features/branches/branch.controller.js
const branchService = require('./branch.service');

const createBranch = async (req, res, next) => {
    try {
        const newBranch = await branchService.createBranch(req.body);
        res.status(201).json(newBranch);
    } catch (error) {
        next(error); // Pass to global error handler
    }
};

const getAllBranches = async (req, res, next) => {
    try {
         // Pass query params for potential filtering/including associations
        const branches = await branchService.findAllBranches(req.query);
        res.status(200).json(branches);
    } catch (error) {
        next(error);
    }
};

const getBranchById = async (req, res, next) => {
    try {
        const { id } = req.params;
         // Pass query params for potential filtering/including associations
        const branch = await branchService.findBranchById(id, req.query);
        if (!branch) {
            return res.status(404).json({ message: 'Filial não encontrada.' });
        }
        res.status(200).json(branch);
    } catch (error) {
        next(error);
    }
};

const updateBranch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedBranch = await branchService.updateBranch(id, req.body);
        if (!updatedBranch) {
            return res.status(404).json({ message: 'Filial não encontrada para atualização.' });
        }
        res.status(200).json(updatedBranch);
    } catch (error) {
        next(error);
    }
};

const deleteBranch = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await branchService.deleteBranch(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Filial não encontrada para exclusão.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        // Specific handling for foreign key constraint from service
         if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(409).json({ message: 'Não é possível excluir a filial pois ela possui registros associados (usuários, armários, etc.).' });
        }
        next(error); // Pass other errors to global handler
    }
};

// --- Controllers for managing Administrator associations ---

const addAdministratorToBranch = async (req, res, next) => {
    try {
        const { branchId, administratorId } = req.params; // Or get administratorId from body
        await branchService.addAdministratorToBranch(branchId, administratorId);
        res.status(200).json({ message: 'Administrador associado à filial com sucesso.' });
    } catch (error) {
         if (error.message.includes('não encontrado')) {
             return res.status(404).json({ message: error.message });
         }
          if (error.message.includes('já associado')) {
             return res.status(409).json({ message: error.message });
         }
        next(error);
    }
};

const removeAdministratorFromBranch = async (req, res, next) => {
    try {
        const { branchId, administratorId } = req.params;
        await branchService.removeAdministratorFromBranch(branchId, administratorId);
        res.status(200).json({ message: 'Associação do administrador removida da filial com sucesso.' }); // Or 204 No Content
    } catch (error) {
         if (error.message.includes('não encontrado')) {
             return res.status(404).json({ message: error.message });
         }
        next(error);
    }
};


module.exports = {
    createBranch,
    getAllBranches,
    getBranchById,
    updateBranch,
    deleteBranch,
    addAdministratorToBranch,
    removeAdministratorFromBranch,
};