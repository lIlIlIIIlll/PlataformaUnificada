// src/features/lockers/locker.controller.js
const lockerService = require('./locker.service');

const createLocker = async (req, res, next) => {
    try {
        const newLocker = await lockerService.createLocker(req.body);
        res.status(201).json(newLocker);
    } catch (error) {
        // Handle specific errors from service
        if (error.message.includes('obrigatórios') || error.message.includes('não encontrada') || error.message.includes('Erro de validação')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('já existe')) {
            return res.status(409).json({ message: error.message }); // Conflict
        }
        next(error); // Pass other errors to global handler
    }
};

const getAllLockers = async (req, res, next) => {
    try {
        // Pass query params for filtering (branchId, status)
        const lockers = await lockerService.findAllLockers(req.query);
        res.status(200).json(lockers);
    } catch (error) {
        next(error);
    }
};

const getLockerById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const locker = await lockerService.findLockerById(id);
        if (!locker) {
            return res.status(404).json({ message: 'Armário não encontrado.' });
        }
        res.status(200).json(locker);
    } catch (error) {
        next(error);
    }
};

const updateLocker = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedLocker = await lockerService.updateLocker(id, req.body);
        if (!updatedLocker) {
            return res.status(404).json({ message: 'Armário não encontrado para atualização.' });
        }
        res.status(200).json(updatedLocker);
    } catch (error) {
        // Handle specific errors from service
         if (error.message.includes('não encontrada') || error.message.includes('Status inválido') || error.message.includes('Erro de validação')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('já existe')) {
            return res.status(409).json({ message: error.message }); // Conflict
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
              return res.status(400).json({ message: `Erro de chave estrangeira: Verifique se a filial fornecida existe.` });
         }
        next(error);
    }
};

const deleteLocker = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await lockerService.deleteLocker(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Armário não encontrado para exclusão.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        // Handle specific errors from service
        if (error.message.includes('Não é possível excluir') || error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(409).json({ message: error.message || 'Não é possível excluir o armário devido a dependências (reservas).' });
        }
        next(error);
    }
};


module.exports = {
    createLocker,
    getAllLockers,
    getLockerById,
    updateLocker,
    deleteLocker,
};