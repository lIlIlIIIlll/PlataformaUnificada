// src/features/branches/branch.service.js
const { Branch, User, Locker, Administrator } = require('../../index'); // Import necessary models
const { Op } = require('sequelize'); // Necessário para a nova função

const createBranch = async (branchData) => {
    try {
        // Garante que os campos de WhatsApp tenham valores padrão ao criar uma nova filial
        const defaultWhatsAppData = {
            whatsappStatus: 'disconnected',
            whatsappSessionId: null,
            whatsappQrCode: null,
            whatsappLastError: null,
            whatsappNumber: null,
            openaiAssistantIdOverride: null,
            ...branchData // Permite que branchData sobrescreva se necessário (embora não deva para esses campos na criação)
        };
        const newBranch = await Branch.create(defaultWhatsAppData);
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
        const include = [];
        if (options.include === 'users') include.push({ model: User, as: 'users', attributes: ['id', 'name'] });
        if (options.include === 'lockers') include.push({ model: Locker, as: 'lockers', attributes: ['id', 'lockerIdentifier', 'status'] });
        if (options.include === 'administrators') include.push({ model: Administrator, as: 'administrators', attributes: ['id', 'name', 'email'], through: { attributes: [] } });

        // Por padrão, não vamos incluir todos os dados do WhatsApp na listagem geral,
        // a menos que seja explicitamente solicitado ou em uma rota específica.
        // Mas os campos básicos como whatsappStatus e whatsappNumber podem ser úteis.
        const attributes = options.includeWhatsAppDetails ? 
            undefined : // undefined para pegar todos os atributos
            { exclude: ['whatsappQrCode', 'whatsappLastError', 'whatsappSessionId'] }; // Exclui os mais sensíveis/grandes

        const branches = await Branch.findAll({ include, attributes });
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

        // Ao buscar por ID, geralmente queremos todos os detalhes, incluindo os do WhatsApp.
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
        // Evitar que campos de controle do WhatsApp sejam alterados diretamente por esta rota genérica
        // Eles devem ser gerenciados por funções específicas (como updateBranchWhatsAppInfo)
        delete branchData.whatsappSessionId;
        delete branchData.whatsappStatus;
        delete branchData.whatsappQrCode;
        delete branchData.whatsappLastError;
        // whatsappNumber pode ser atualizável se o admin quiser corrigir, mas com cuidado.
        // openaiAssistantIdOverride PODE ser atualizável por aqui.

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
    // IMPORTANTE: Antes de deletar uma filial, precisamos garantir que a sessão do WhatsApp
    // associada a ela seja limpa (arquivos e instância do cliente).
    // Esta lógica pode ser chamada aqui ou no controller antes de chamar este service.
    // Por simplicidade, vamos assumir que o controller chamará o whatsappInstanceManager.clearSessionForBranch ANTES.
    try {
        const branch = await Branch.findByPk(id);
        if (!branch) {
            return false; // Not found
        }
        await branch.destroy();
        return true;
    } catch (error) {
         if (error.name === 'SequelizeForeignKeyConstraintError') {
             throw error; 
        }
        console.error(`Erro ao deletar filial (${id}):`, error);
        throw new Error('Erro interno ao deletar filial.');
    }
};

// --- Funções específicas para gerenciamento do WhatsApp da Filial ---

/**
 * Atualiza os campos relacionados ao WhatsApp de uma filial específica.
 * Usado pelo whatsappInstanceManager.
 * @param {number} branchId - ID da filial.
 * @param {object} whatsappData - Dados a serem atualizados (whatsappStatus, whatsappQrCode, etc.).
 * @returns {Promise<Branch|null>}
 */
const updateBranchWhatsAppInfo = async (branchId, whatsappData) => {
    try {
        const branch = await Branch.findByPk(branchId);
        if (!branch) {
            console.error(`[BranchService] Filial ${branchId} não encontrada para atualizar informações do WhatsApp.`);
            return null;
        }

        // Campos permitidos para atualização por esta função
        const allowedFields = [
            'whatsappSessionId', 
            'whatsappStatus', 
            'whatsappQrCode', 
            'whatsappLastError', 
            'whatsappNumber',
            // 'openaiAssistantIdOverride' // Poderia ser atualizado aqui também se desejado
        ];
        
        const dataToUpdate = {};
        for (const field of allowedFields) {
            if (whatsappData.hasOwnProperty(field)) {
                dataToUpdate[field] = whatsappData[field];
            }
        }
        // Caso especial: se o status for 'connected', limpa o QR code e o lastError
        if (dataToUpdate.whatsappStatus === 'connected') {
            dataToUpdate.whatsappQrCode = null;
            // dataToUpdate.whatsappLastError = null; // Pode ser útil manter o último erro até uma nova conexão bem-sucedida
        }
        // Caso especial: se o status for 'disconnected' ou 'auth_failure' ou 'error', limpa o QR e o número conectado
        if (['disconnected', 'auth_failure', 'error'].includes(dataToUpdate.whatsappStatus)) {
            dataToUpdate.whatsappQrCode = null;
            dataToUpdate.whatsappNumber = null; // Se desconectou, não há número ativo
        }


        if (Object.keys(dataToUpdate).length > 0) {
            await branch.update(dataToUpdate);
            console.log(`[BranchService] Informações do WhatsApp atualizadas para Filial ${branchId}:`, dataToUpdate);
        }
        return branch.reload(); // Retorna a instância atualizada
    } catch (error) {
        console.error(`[BranchService] Erro ao atualizar informações do WhatsApp para Filial ${branchId}:`, error);
        // Não relançar para não quebrar o fluxo do instanceManager, mas o erro é logado.
        // O instanceManager pode ter sua própria lógica de retry ou tratamento de erro.
        throw new Error(`Falha ao atualizar informações do WhatsApp no DB para filial ${branchId}: ${error.message}`);
    }
};

/**
 * Encontra todas as filiais que podem precisar ter suas sessões WhatsApp reconectadas
 * na inicialização do servidor.
 * @returns {Promise<Branch[]>}
 */
const findAllBranchesWithActiveWhatsApp = async () => {
    try {
        // Critérios: tem um whatsappSessionId e o status não é 'disconnected' ou 'error' (ou um novo status 'awaiting_reconnection')
        // Ou, mais simplesmente, qualquer filial que tenha um whatsappSessionId, pois a LocalAuth tentará restaurar.
        // Se a sessão for inválida, o evento 'auth_failure' será acionado pelo instanceManager.
        const branches = await Branch.findAll({
            where: {
                whatsappSessionId: {
                    [Op.ne]: null // Não é nulo
                },
                // Opcional: filtrar por status que indicam uma sessão que deveria estar ativa
                // whatsappStatus: {
                //    [Op.notIn]: ['disconnected', 'error', 'auth_failure']
                // }
            }
        });
        return branches;
    } catch (error) {
        console.error('[BranchService] Erro ao buscar filiais com WhatsApp ativo:', error);
        throw new Error('Erro ao consultar filiais para reconexão do WhatsApp.');
    }
};


// --- Service for managing Administrator associations (sem alterações) ---
const addAdministratorToBranch = async (branchId, administratorId) => {
    try {
        const branch = await Branch.findByPk(branchId);
        const administrator = await Administrator.findByPk(administratorId);
        if (!branch || !administrator) {
            throw new Error('Filial ou Administrador não encontrado.');
        }
        await branch.addAdministrator(administrator); 
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
        const removed = await branch.removeAdministrator(administrator); 
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
    // Novas funções exportadas
    updateBranchWhatsAppInfo,
    findAllBranchesWithActiveWhatsApp,
};