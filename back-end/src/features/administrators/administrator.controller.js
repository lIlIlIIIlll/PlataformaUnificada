// src/features/administrators/administrator.controller.js
const administratorService = require('./administrator.service');

const createAdministrator = async (req, res, next) => {
    try {
        const newAdmin = await administratorService.createAdministrator(req.body);
        res.status(201).json(newAdmin); // Password already excluded by service
    } catch (error) {
         if (error.message === 'Email já cadastrado.') {
            return res.status(409).json({ message: error.message });
        }
         if (error.message.includes('obrigatórios') || error.message.includes('Erro de validação')) {
             return res.status(400).json({ message: error.message });
         }
        next(error); // Pass to global error handler
    }
};

const getAllAdministrators = async (req, res, next) => {
    try {
         // Pass query params for potential filtering/including associations
        const admins = await administratorService.findAllAdministrators(req.query);
        res.status(200).json(admins); // Passwords already excluded by service
    } catch (error) {
        next(error);
    }
};

const getAdministratorById = async (req, res, next) => {
    try {
        const { id } = req.params;
         // Pass query params for potential filtering/including associations
        const admin = await administratorService.findAdministratorById(id, req.query);
        if (!admin) {
            return res.status(404).json({ message: 'Administrador não encontrado.' });
        }
        res.status(200).json(admin); // Password already excluded by service
    } catch (error) {
        next(error);
    }
};

const updateAdministrator = async (req, res, next) => {
    try {
        const { id } = req.params;
        const updatedAdmin = await administratorService.updateAdministrator(id, req.body);
        if (!updatedAdmin) {
            return res.status(404).json({ message: 'Administrador não encontrado para atualização.' });
        }
        res.status(200).json(updatedAdmin); // Password already excluded by service
    } catch (error) {
        if (error.message.includes('Email já cadastrado')) {
            return res.status(409).json({ message: error.message });
        }
         if (error.message.includes('Senha não pode') || error.message.includes('Erro de validação')) {
             return res.status(400).json({ message: error.message });
         }
        next(error);
    }
};

const deleteAdministrator = async (req, res, next) => {
    try {
        const { id } = req.params;

        // Optional: Prevent self-deletion?
        // if (req.user && req.user.id === parseInt(id, 10)) {
        //    return res.status(403).json({ message: 'Você não pode excluir sua própria conta.' });
        // }

        const deleted = await administratorService.deleteAdministrator(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Administrador não encontrado para exclusão.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        // Handle specific errors from service if needed (e.g., cannot delete if associated)
         if (error.name === 'SequelizeForeignKeyConstraintError' || error.message.includes('Não é possível excluir')) {
            return res.status(409).json({ message: error.message || 'Não é possível excluir administrador com associações.' });
        }
        next(error);
    }
};


module.exports = {
    createAdministrator,
    getAllAdministrators,
    getAdministratorById,
    updateAdministrator,
    deleteAdministrator,
};