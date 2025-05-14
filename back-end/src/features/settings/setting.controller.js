// src/features/settings/setting.controller.js
const settingService = require('./setting.service');

const createSetting = async (req, res, next) => {
    try {
        const newSetting = await settingService.createSetting(req.body);
        res.status(201).json(newSetting);
    } catch (error) {
        // Handle specific errors from service
        if (error.message.includes('obrigatórios')) {
            return res.status(400).json({ message: error.message });
        }
        if (error.message.includes('já existe')) {
            return res.status(409).json({ message: error.message }); // Conflict
        }
         if (error.message.includes('Erro de validação')) {
             return res.status(400).json({ message: error.message });
         }
        next(error); // Pass other errors to global handler
    }
};

const getAllSettings = async (req, res, next) => {
    try {
        // Pass query params if filtering is added later
        const settings = await settingService.findAllSettings(req.query);
        res.status(200).json(settings);
    } catch (error) {
        next(error);
    }
};

const getSettingByName = async (req, res, next) => {
    try {
        const { name } = req.params; // Get name from URL path parameter
        const setting = await settingService.findSettingByName(name);
        if (!setting) {
            return res.status(404).json({ message: `Configuração com nome '${name}' não encontrada.` });
        }
        res.status(200).json(setting);
    } catch (error) {
        next(error);
    }
};

const updateSettingByName = async (req, res, next) => {
    try {
        const { name } = req.params;
        // Extract only value and description for update
        const { value, description } = req.body;
        const updateData = { value, description };

        // Remove keys if they are undefined to avoid accidentally setting null
         Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);


        const updatedSetting = await settingService.updateSettingByName(name, updateData);
        if (!updatedSetting) {
            return res.status(404).json({ message: `Configuração com nome '${name}' não encontrada para atualização.` });
        }
        res.status(200).json(updatedSetting);
    } catch (error) {
        if (error.message.includes('Nenhum dado fornecido') || error.message.includes('Erro de validação')) {
            return res.status(400).json({ message: error.message });
        }
         if (error.message.includes('obrigatório')) { // From service check
             return res.status(400).json({ message: error.message });
         }
        next(error);
    }
};

const deleteSettingByName = async (req, res, next) => {
    try {
        const { name } = req.params;
        const deleted = await settingService.deleteSettingByName(name);
        if (!deleted) {
            return res.status(404).json({ message: `Configuração com nome '${name}' não encontrada para exclusão.` });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        next(error);
    }
};


module.exports = {
    createSetting,
    getAllSettings,
    getSettingByName,
    updateSettingByName,
    deleteSettingByName,
};