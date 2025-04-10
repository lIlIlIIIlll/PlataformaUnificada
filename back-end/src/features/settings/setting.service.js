// src/features/settings/setting.service.js
const { Setting } = require('../../index'); // Import necessary model
const { Op } = require('sequelize');

// --- IMPORTAR CONFIGURAÇÕES PERMANENTES ---
// Importa o Set com os nomes das configurações permanentes do arquivo centralizado
const permanentSettingsConfig = require('../../config/permanentSettings.config'); // Ajuste o caminho se necessário
const PERMANENT_SETTINGS_NAMES = permanentSettingsConfig.names;
// --- FIM DA IMPORTAÇÃO ---


/**
 * Creates a new setting.
 * @param {object} settingData - Data for the new setting.
 * @param {string} settingData.name - Unique name (key) for the setting.
 * @param {string} settingData.value - Value of the setting.
 * @param {string} [settingData.description] - Optional description.
 * @returns {Promise<Setting>} - The created setting instance.
 * @throws {Error} - If validation fails or name already exists.
 */
const createSetting = async (settingData) => {
    const { name, value } = settingData;
    if (!name || value === undefined || value === null) { // Allow empty string for value? Adjust if needed.
        throw new Error('Nome (name) e Valor (value) são obrigatórios.');
    }

    try {
        // Check if name already exists
        const existingSetting = await Setting.findOne({ where: { name } });
        if (existingSetting) {
            throw new Error(`Configuração com o nome '${name}' já existe.`);
        }

        // Create the setting
        const newSetting = await Setting.create({
            name,
            value,
            description: settingData.description || null, // Ensure null if not provided
        });
        return newSetting;

    } catch (error) {
        if (error.message.includes('já existe') || error.message.includes('obrigatórios')) {
            throw error; // Re-throw specific validation/constraint errors
        }
        if (error.name === 'SequelizeValidationError') {
             // Catch potential length constraints etc.
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
         if (error.name === 'SequelizeUniqueConstraintError') {
             // Should be caught by the manual check, but as fallback
              throw new Error(`Configuração com o nome '${name}' já existe (Constraint).`);
         }
        console.error('Erro ao criar configuração:', error);
        throw new Error('Não foi possível criar a configuração.');
    }
};

/**
 * Finds all settings.
 * @param {object} options - Filter options (currently none defined, add if needed).
 * @returns {Promise<Setting[]>} - Array of setting instances.
 */
const findAllSettings = async (options = {}) => {
    try {
        // Add filtering if needed, e.g., find settings starting with a prefix
        const whereClause = {};
        // if (options.prefix) {
        //    whereClause.name = { [Op.startsWith]: options.prefix };
        // }

        const settings = await Setting.findAll({
            where: whereClause,
            order: [['name', 'ASC']] // Order alphabetically by name
        });
        return settings;
    } catch (error) {
        console.error('Erro ao buscar todas as configurações:', error);
        throw new Error('Erro ao consultar banco de dados para listar configurações.');
    }
};

/**
 * Finds a setting by its unique name (key).
 * @param {string} name - The unique name (key) of the setting.
 * @returns {Promise<Setting|null>} - The setting instance or null if not found.
 */
const findSettingByName = async (name) => {
    if (!name) return null;
    try {
        const setting = await Setting.findOne({ where: { name } });
        return setting;
    } catch (error) {
        console.error(`Erro ao buscar configuração por nome (${name}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar configuração por nome.');
    }
};

/**
 * Finds a setting by its ID (less common for settings).
 * @param {number} id - The ID of the setting.
 * @returns {Promise<Setting|null>} - The setting instance or null if not found.
 */
const findSettingById = async (id) => {
     if (!id || isNaN(id)) return null;
    try {
        const setting = await Setting.findByPk(id);
        return setting;
    } catch (error) {
        console.error(`Erro ao buscar configuração por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar configuração por ID.');
    }
};


/**
 * Updates an existing setting, identified by its name.
 * Typically only the value and description are updated.
 * @param {string} name - The unique name (key) of the setting to update.
 * @param {object} updateData - Data to update.
 * @param {string} [updateData.value] - The new value.
 * @param {string} [updateData.description] - The new description.
 * @returns {Promise<Setting|null>} - The updated setting or null if not found.
 */
const updateSettingByName = async (name, updateData) => {
     if (!name) {
         throw new Error("Nome da configuração é obrigatório para atualização.");
     }
     // Allow updating value to empty string, but not null/undefined unless intended
     if (updateData.value === undefined && updateData.description === undefined) {
          throw new Error("Nenhum dado fornecido para atualização (value ou description).");
     }

    try {
        const setting = await Setting.findOne({ where: { name } });
        if (!setting) {
            return null; // Not found
        }

        // Only allow updating value and description
        const allowedUpdates = {};
        if (updateData.value !== undefined) {
            allowedUpdates.value = updateData.value;
        }
        if (updateData.description !== undefined) {
            // Handle setting description to null explicitly if an empty string is passed,
            // or keep it as empty string if that's desired. Here, setting to null.
            allowedUpdates.description = updateData.description === '' ? null : updateData.description;
        }

        if (Object.keys(allowedUpdates).length === 0) {
             // Should be caught by initial check, but safety.
             return setting; // Nothing to update
        }

        await setting.update(allowedUpdates);
        return setting; // Return the updated instance

    } catch (error) {
         if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
        console.error(`Erro ao atualizar configuração (${name}):`, error);
        throw new Error('Erro interno ao atualizar configuração.');
    }
};

/**
 * Deletes a setting by its name.
 * Checks if the setting is permanent before deleting by consulting the imported config.
 * @param {string} name - The unique name (key) of the setting to delete.
 * @returns {Promise<boolean>} - True if deleted, false if not found.
 * @throws {Error} - If the setting is permanent and cannot be deleted.
 */
const deleteSettingByName = async (name) => {
    if (!name) return false;

    // --- VERIFICAÇÃO DE CONFIGURAÇÃO PERMANENTE (Usando config centralizada) ---
    if (PERMANENT_SETTINGS_NAMES.has(name)) {
        throw new Error(`Configuração '${name}' é permanente e não pode ser excluída.`);
    }
    // --- FIM DA VERIFICAÇÃO ---

    try {
        const setting = await Setting.findOne({ where: { name } });
        if (!setting) {
            return false; // Not found
        }
        await setting.destroy();
        return true;
    } catch (error) {
        // If the error was thrown by the permanent check, re-throw it
        if (error.message.includes('permanente e não pode ser excluída')) {
            throw error;
        }
        // Foreign key constraints are unlikely for settings table itself
        console.error(`Erro ao deletar configuração (${name}):`, error);
        throw new Error('Erro interno ao deletar configuração.');
    }
};


module.exports = {
    createSetting,
    findAllSettings,
    findSettingByName,
    findSettingById, // Keep if needed, but ByName is more typical
    updateSettingByName,
    deleteSettingByName,
};