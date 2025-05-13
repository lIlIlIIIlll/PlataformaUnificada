// src/features/branches/branch.controller.js
const branchService = require('./branch.service');
// Precisaremos do whatsappInstanceManager para chamar suas funções
const whatsappInstanceManager = require('../whatsapp/whatsappInstanceManager');

const createBranch = async (req, res, next) => {
    try {
        const newBranch = await branchService.createBranch(req.body);
        res.status(201).json(newBranch);
    } catch (error) {
        next(error); 
    }
};

const getAllBranches = async (req, res, next) => {
    try {
        const branches = await branchService.findAllBranches(req.query);
        res.status(200).json(branches);
    } catch (error) {
        next(error);
    }
};

const getBranchById = async (req, res, next) => {
    try {
        const { id } = req.params;
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
    } catch (error){
        next(error);
    }
};

const deleteBranch = async (req, res, next) => {
    const { id } = req.params;
    try {
        // Antes de deletar a filial do DB, tenta limpar a sessão do WhatsApp associada
        // Passamos o branchService para o instanceManager poder atualizar o DB se necessário durante a limpeza.
        console.log(`[BranchController] Solicitando limpeza de sessão WhatsApp para filial ${id} ANTES de deletar a filial.`);
        await whatsappInstanceManager.clearSessionForBranch(id, branchService);
        console.log(`[BranchController] Limpeza de sessão WhatsApp para filial ${id} concluída (ou não necessária). Prosseguindo com a deleção da filial.`);

        const deleted = await branchService.deleteBranch(id);
        if (!deleted) {
            // Isso pode acontecer se a filial foi deletada por outro processo entre a limpeza da sessão e aqui,
            // ou se clearSessionForBranch indicou que a filial não existia.
            return res.status(404).json({ message: 'Filial não encontrada para exclusão (possivelmente já removida após limpeza de sessão WhatsApp).' });
        }
        res.status(204).send(); 
    } catch (error) {
         if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(409).json({ message: 'Não é possível excluir a filial pois ela possui registros associados (usuários, armários, etc.). A sessão WhatsApp (se existia) foi limpa.' });
        }
        // Outros erros (incluindo os de clearSessionForBranch se não tratados lá)
        console.error(`[BranchController] Erro ao deletar filial ${id} ou limpar sua sessão WhatsApp:`, error);
        next(error); 
    }
};

// --- Controllers for managing Administrator associations (sem alterações) ---
const addAdministratorToBranch = async (req, res, next) => {
    try {
        const { branchId, administratorId } = req.params; 
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
        res.status(200).json({ message: 'Associação do administrador removida da filial com sucesso.' }); 
    } catch (error) {
         if (error.message.includes('não encontrado')) {
             return res.status(404).json({ message: error.message });
         }
        next(error);
    }
};


// --- NOVOS Controllers para Gerenciamento do WhatsApp da Filial ---

const initiateWhatsAppConnectionController = async (req, res, next) => {
    const { branchId } = req.params;
    try {
        // Passamos branchService para que o instanceManager possa interagir com o DB
        const result = await whatsappInstanceManager.initiateConnectionForBranch(branchId, branchService);
        if (result.success) {
            // O status e QR code (se houver) serão atualizados no DB pelo instanceManager.
            // O frontend pode pollar o status da filial ou usar WebSockets (futuro).
            res.status(202).json({ message: result.message, status: result.status, qrCode: result.qrCode }); // 202 Accepted
        } else {
            res.status(400).json({ message: result.message || "Falha ao iniciar conexão WhatsApp." });
        }
    } catch (error) {
        console.error(`[BranchController] Erro ao iniciar conexão WhatsApp para filial ${branchId}:`, error);
        next(error);
    }
};

const getWhatsAppConnectionStatusController = async (req, res, next) => {
    const { branchId } = req.params;
    try {
        // Primeiro, tenta pegar o status do gerenciador de instâncias ativas (mais rápido)
        let liveStatus = whatsappInstanceManager.getClientStatusForBranch(branchId);

        // Se não estiver no gerenciador ativo (ex: após reinício do servidor antes da reconexão),
        // ou se quisermos sempre o dado mais atualizado do DB, buscamos no DB.
        const branch = await branchService.findBranchById(branchId);
        if (!branch) {
            return res.status(404).json({ message: 'Filial não encontrada.' });
        }

        // Combina ou prioriza. O status do DB é a "fonte da verdade" persistida.
        // O liveStatus pode ter um QR code que ainda não chegou ao DB se for muito rápido.
        const responseStatus = {
            branchId: branch.id,
            status: branch.whatsappStatus,
            qrCode: branch.whatsappQrCode, // O QR do DB é o mais confiável para o frontend buscar
            lastError: branch.whatsappLastError,
            connectedNumber: branch.whatsappNumber,
            sessionId: branch.whatsappSessionId, // Informativo
        };

        // Se o liveStatus tiver um QR e o DB não (ex: QR acabou de ser gerado), usa o do liveStatus.
        if (liveStatus && liveStatus.qrCode && !responseStatus.qrCode) {
            responseStatus.qrCode = liveStatus.qrCode;
            // Poderia também atualizar o status se o live for mais recente e diferente,
            // mas o instanceManager já deve estar atualizando o DB.
        }
        if (liveStatus && liveStatus.status !== 'unknown' && liveStatus.status !== responseStatus.status) {
            // Se o status ao vivo for diferente e não 'unknown', pode ser mais atual.
            // Ex: 'connecting' ao vivo, mas DB ainda 'initializing'.
            // No entanto, o DB é atualizado pelo instanceManager, então deve convergir.
            // Para consistência, podemos preferir o do DB, ou o mais "avançado" na conexão.
            // console.log(`Status divergente: Live=${liveStatus.status}, DB=${responseStatus.status}. Usando DB por padrão.`);
        }


        res.status(200).json(responseStatus);
    } catch (error) {
        console.error(`[BranchController] Erro ao obter status WhatsApp para filial ${branchId}:`, error);
        next(error);
    }
};

const disconnectWhatsAppController = async (req, res, next) => {
    const { branchId } = req.params;
    try {
        const result = await whatsappInstanceManager.disconnectClientForBranch(branchId, branchService);
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            // Mesmo que não houvesse cliente ativo, o status no DB é forçado para disconnected.
            res.status(200).json({ message: result.message || "Nenhum cliente ativo para desconectar, status no DB atualizado." });
        }
    } catch (error) {
        console.error(`[BranchController] Erro ao desconectar WhatsApp para filial ${branchId}:`, error);
        next(error);
    }
};

const clearWhatsAppSessionController = async (req, res, next) => {
    const { branchId } = req.params;
    try {
        const result = await whatsappInstanceManager.clearSessionForBranch(branchId, branchService);
        if (result.success) {
            res.status(200).json({ message: result.message });
        } else {
            res.status(400).json({ message: result.message || "Falha ao limpar sessão WhatsApp." });
        }
    } catch (error) {
        console.error(`[BranchController] Erro ao limpar sessão WhatsApp para filial ${branchId}:`, error);
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
    // Exporta os novos controllers
    initiateWhatsAppConnectionController,
    getWhatsAppConnectionStatusController,
    disconnectWhatsAppController,
    clearWhatsAppSessionController,
};