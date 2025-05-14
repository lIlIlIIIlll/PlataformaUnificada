// src/features/hikvisions/hikvision.controller.js
const hikvisionService = require('./hikvision.service');

const createHikvision = async (req, res, next) => {
    try {
        // ATENÇÃO: A senha vem em req.body.password e deve ser hasheada no service!
        const newHikvision = await hikvisionService.createHikvision(req.body);
        res.status(201).json(newHikvision); // Senha já foi excluída pelo service
    } catch (error) {
        // Mapeamento de erros específicos do service para status HTTP
        if (error.message.includes('obrigatórios faltando') || error.message.includes('não encontrada') || error.message.includes('Erro de validação')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('já cadastrado')) {
            return res.status(409).json({ message: error.message }); // Conflict
        }
        next(error); // Passa para o handler global de erros
    }
};

const getAllHikvisions = async (req, res, next) => {
    try {
        // Passa query params (ex: req.query.branchId, req.query.status) para o service
        const hikvisions = await hikvisionService.findAllHikvisions(req.query);
        res.status(200).json(hikvisions); // Senhas já excluídas pelo service
    } catch (error) {
        next(error);
    }
};

const getHikvisionById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const hikvision = await hikvisionService.findHikvisionById(id);
        if (!hikvision) {
            return res.status(404).json({ message: 'Dispositivo Hikvision não encontrado.' });
        }
        res.status(200).json(hikvision); // Senha já excluída pelo service
    } catch (error) {
        next(error);
    }
};

const updateHikvision = async (req, res, next) => {
    try {
        const { id } = req.params;
        // ATENÇÃO: Se req.body.password existir, o service deve hashear!
        const updatedHikvision = await hikvisionService.updateHikvision(id, req.body);
        if (!updatedHikvision) {
            return res.status(404).json({ message: 'Dispositivo Hikvision não encontrado para atualização.' });
        }
        res.status(200).json(updatedHikvision); // Senha já excluída pelo service
    } catch (error) {
         // Mapeamento de erros específicos do service
         if (error.message.includes('não encontrada') || error.message.includes('Status inválido') || error.message.includes('Erro de validação')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('já cadastrado')) {
            return res.status(409).json({ message: error.message }); // Conflict
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
              return res.status(400).json({ message: `Erro de chave estrangeira: Verifique se a filial fornecida existe.` });
         }
        next(error);
    }
};

const deleteHikvision = async (req, res, next) => {
    try {
        const { id } = req.params;
        const deleted = await hikvisionService.deleteHikvision(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Dispositivo Hikvision não encontrado para exclusão.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        // Trata erro específico de dependência vindo do service
        if (error.message.includes('Não é possível excluir') || error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(409).json({ message: error.message || 'Não é possível excluir o dispositivo Hikvision devido a dependências.' });
        }
        next(error);
    }
};

module.exports = {
    createHikvision,
    getAllHikvisions,
    getHikvisionById,
    updateHikvision,
    deleteHikvision,
};