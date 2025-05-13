// src/features/whatsapp/whatsappInstanceManager.js
const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs').promises;
const path = require('path');
const messageHandler = require('./messageHandler'); // <<< IMPORTADO AQUI

// Mapa para manter as instâncias ativas dos clientes WhatsApp
// Chave: branchId, Valor: { client: ClientInstance, status: string, qrCode: string | null, isInitializing: boolean, retryCount: number }
const activeClients = new Map();
const MAX_RETRIES = 3; 

// Diretório base para as sessões do whatsapp-web.js
const SESSIONS_DIR = path.join(process.cwd(), '.wwebjs_auth');


const updateBranchWhatsAppStatus = async (branchService, branchId, status, qrCode = null, errorMsg = null, connectedNumber = null) => {
    try {
        // console.log(`[InstanceManager] Atualizando DB para Branch ${branchId}: Status=${status}, QR=${!!qrCode}, Err=${errorMsg}, Num=${connectedNumber}`);
        await branchService.updateBranchWhatsAppInfo(branchId, {
            whatsappStatus: status,
            whatsappQrCode: qrCode,
            whatsappLastError: errorMsg,
            whatsappNumber: connectedNumber,
        });
    } catch (dbError) {
        console.error(`[InstanceManager] ERRO CRÍTICO ao atualizar status do WhatsApp no DB para Branch ${branchId}:`, dbError);
    }
};


const initializeWhatsAppClientForBranch = (branchId, sessionId, branchService) => {
    if (activeClients.has(branchId) && activeClients.get(branchId).client && activeClients.get(branchId).status !== 'disconnected' && activeClients.get(branchId).status !== 'error') {
        console.warn(`[InstanceManager] Tentativa de inicializar cliente para Branch ${branchId} que já possui um cliente ativo ou em processo (Status: ${activeClients.get(branchId).status}).`);
        // Se o status for 'connected' ou 'qr_pending' ou 'connecting', não faz nada.
        // Se for 'initializing', também não, pois já está nesse processo.
        return;
    }

    console.log(`[InstanceManager] Iniciando cliente WhatsApp para Branch ${branchId} com SessionId: ${sessionId}`);
    
    const client = new Client({
        authStrategy: new LocalAuth({
            clientId: sessionId,
            dataPath: SESSIONS_DIR 
        }),
        puppeteer: {
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', 
                '--no-zygote', 
            ],
            headless: true, 
            timeout: 120000, 
        },
        qrTimeout: 0, 
        authTimeout: 0 
    });

    activeClients.set(branchId, {
        client,
        status: 'initializing',
        qrCode: null,
        isInitializing: true,
        retryCount: 0
    });

    updateBranchWhatsAppStatus(branchService, branchId, 'initializing');

    client.on('qr', (qr) => {
        console.log(`[InstanceManager] QR Code recebido para Branch ${branchId}`);
        const clientEntry = activeClients.get(branchId);
        if (clientEntry) {
            clientEntry.status = 'qr_pending';
            clientEntry.qrCode = qr;
            activeClients.set(branchId, clientEntry);
        }
        updateBranchWhatsAppStatus(branchService, branchId, 'qr_pending', qr);
    });

    client.on('ready', async () => {
        console.log(`[InstanceManager] Cliente WhatsApp PRONTO para Branch ${branchId}. Número: ${client.info.wid.user}`);
        const clientEntry = activeClients.get(branchId);
        if (clientEntry) {
            clientEntry.status = 'connected';
            clientEntry.qrCode = null;
            clientEntry.isInitializing = false;
            clientEntry.retryCount = 0; 
            activeClients.set(branchId, clientEntry);
        }
        updateBranchWhatsAppStatus(branchService, branchId, 'connected', null, null, client.info.wid.user);

        // --- MODIFICAÇÃO PRINCIPAL AQUI ---
        // Remove qualquer listener de mensagem antigo para evitar duplicação se houver reconexões
        client.removeAllListeners('message'); 
        // Registra o handler de mensagens do messageHandler.js
        client.on('message', async (message) => {
           // Passa a instância do cliente (client) para o messageHandler,
           // pois ele precisará dela para enviar respostas.
           await messageHandler.handleIncomingMessage(message, branchId, client);
        });
        console.log(`[InstanceManager] Listener de mensagens REAL configurado para Branch ${branchId} via messageHandler.`);
        // --- FIM DA MODIFICAÇÃO ---
    });

    client.on('auth_failure', async (msg) => {
        console.error(`[InstanceManager] Falha na AUTENTICAÇÃO para Branch ${branchId}: ${msg}`);
        const clientEntry = activeClients.get(branchId);
        if (clientEntry) {
            clientEntry.status = 'auth_failure';
            clientEntry.isInitializing = false;
            activeClients.set(branchId, clientEntry);
        }
        updateBranchWhatsAppStatus(branchService, branchId, 'auth_failure', null, `Falha na autenticação: ${msg}`);
        await destroyClientInstance(branchId, client, false); 
    });

    client.on('disconnected', async (reason) => {
        console.warn(`[InstanceManager] Cliente WhatsApp DESCONECTADO para Branch ${branchId}. Razão: ${reason}`);
        const clientEntry = activeClients.get(branchId);
        
        if (clientEntry && clientEntry.status !== 'destroying' && clientEntry.status !== 'disconnected') {
            updateBranchWhatsAppStatus(branchService, branchId, 'disconnected', null, `Desconectado: ${reason}`);
            
            if (clientEntry.retryCount < MAX_RETRIES) {
                clientEntry.retryCount++;
                clientEntry.status = 'connecting'; 
                console.log(`[InstanceManager] Tentando reconectar Branch ${branchId} (Tentativa ${clientEntry.retryCount}/${MAX_RETRIES})...`);
                activeClients.set(branchId, clientEntry);
                updateBranchWhatsAppStatus(branchService, branchId, 'connecting', null, `Tentando reconectar (${clientEntry.retryCount})`);
                client.initialize().catch(err => {
                     console.error(`[InstanceManager] Erro na tentativa de reinicializar Branch ${branchId} após desconexão:`, err);
                     updateBranchWhatsAppStatus(branchService, branchId, 'error', null, `Erro ao tentar reconectar: ${err.message}`);
                     destroyClientInstance(branchId, client, true); 
                });
            } else {
                console.error(`[InstanceManager] Máximo de tentativas de reconexão atingido para Branch ${branchId}. Marcando como erro.`);
                updateBranchWhatsAppStatus(branchService, branchId, 'error', null, `Máximo de tentativas de reconexão atingido. Razão original: ${reason}`);
                destroyClientInstance(branchId, client, true); 
            }
        } else if (clientEntry && (clientEntry.status === 'destroying' || clientEntry.status === 'disconnected')) {
            console.log(`[InstanceManager] Cliente para Branch ${branchId} desconectado como parte de um processo de destruição ou já estava desconectado.`);
        }
    });

    client.on('loading_screen', (percent, message) => {
        const clientEntry = activeClients.get(branchId);
        if (clientEntry && clientEntry.status !== 'connected' && clientEntry.status !== 'qr_pending') {
            if (clientEntry.status !== 'connecting') {
                clientEntry.status = 'connecting';
                activeClients.set(branchId, clientEntry);
                updateBranchWhatsAppStatus(branchService, branchId, 'connecting', null, message);
            }
        }
    });

    console.log(`[InstanceManager] Chamando client.initialize() para Branch ${branchId}...`);
    client.initialize().catch(async (err) => {
        console.error(`[InstanceManager] Erro CRÍTICO na inicialização do cliente para Branch ${branchId}:`, err);
        const clientEntry = activeClients.get(branchId);
        if (clientEntry) {
            clientEntry.status = 'error';
            clientEntry.isInitializing = false;
            activeClients.set(branchId, clientEntry);
        }
        updateBranchWhatsAppStatus(branchService, branchId, 'error', null, `Erro na inicialização: ${err.message}`);
        await destroyClientInstance(branchId, client, true); 
    });
};

const destroyClientInstance = async (branchId, client, removeFromActiveMap = true) => {
    console.log(`[InstanceManager] Destruindo instância do cliente para Branch ${branchId}...`);
    const clientEntry = activeClients.get(branchId); // Pega o entry antes de deletar
    
    if (client) {
        try {
            client.removeAllListeners();
            await client.destroy();
            console.log(`[InstanceManager] Cliente para Branch ${branchId} destruído com sucesso.`);
        } catch (destroyError) {
            console.error(`[InstanceManager] Erro ao destruir cliente para Branch ${branchId}:`, destroyError);
        }
    }
    if (removeFromActiveMap) {
        activeClients.delete(branchId);
        console.log(`[InstanceManager] Branch ${branchId} removido do mapa de clientes ativos.`);
    } else if (clientEntry) { // Se não remove do mapa, pelo menos atualiza o status no mapa
        clientEntry.client = null; // Remove a referência ao cliente destruído
        clientEntry.isInitializing = false;
        // O status (ex: 'auth_failure', 'disconnected') já deve ter sido setado antes de chamar destroy com removeFromActiveMap = false
        activeClients.set(branchId, clientEntry);
    }
};

const initiateConnectionForBranch = async (branchId, branchService) => {
    console.log(`[InstanceManager] Solicitação para iniciar conexão para Branch ${branchId}`);
    let branch;
    try {
        branch = await branchService.findBranchById(branchId);
        if (!branch) {
            console.error(`[InstanceManager] Filial ${branchId} não encontrada para iniciar conexão WhatsApp.`);
            return { success: false, message: 'Filial não encontrada.' };
        }

        const existingClientEntry = activeClients.get(branchId);
        if (existingClientEntry && existingClientEntry.client && existingClientEntry.status !== 'disconnected' && existingClientEntry.status !== 'error' && existingClientEntry.status !== 'auth_failure') {
            console.warn(`[InstanceManager] Conexão para Branch ${branchId} já está ativa ou em processo (Status: ${existingClientEntry.status}).`);
            return { success: true, message: `Conexão já está ${existingClientEntry.status}.`, status: existingClientEntry.status, qrCode: existingClientEntry.qrCode };
        }
        
        let sessionIdToUse = branch.whatsappSessionId;
        if (!sessionIdToUse) {
            sessionIdToUse = String(branch.id); 
            console.log(`[InstanceManager] Gerando novo SessionID para Branch ${branchId}: ${sessionIdToUse}`);
            // Atualiza o DB com o novo session ID e marca como inicializando
            await branchService.updateBranchWhatsAppInfo(branchId, { whatsappSessionId: sessionIdToUse, whatsappStatus: 'initializing' });
        } else {
            // Se já tem session ID, apenas marca como inicializando para a tentativa de reconexão
             await branchService.updateBranchWhatsAppInfo(branchId, { whatsappStatus: 'initializing' });
        }
        
        initializeWhatsAppClientForBranch(branchId, sessionIdToUse, branchService);
        return { success: true, message: 'Inicialização do WhatsApp em progresso. Aguarde o QR Code ou conexão.' };

    } catch (error) {
        console.error(`[InstanceManager] Erro ao obter dados da filial ${branchId} para iniciar WhatsApp:`, error);
        if (branch) { 
            updateBranchWhatsAppStatus(branchService, branchId, 'error', null, `Erro ao iniciar: ${error.message}`);
        }
        return { success: false, message: `Erro ao iniciar conexão: ${error.message}` };
    }
};

const disconnectClientForBranch = async (branchId, branchService) => {
    console.log(`[InstanceManager] Solicitação para desconectar cliente da Branch ${branchId}`);
    const clientEntry = activeClients.get(branchId);
    if (clientEntry && clientEntry.client) {
        clientEntry.status = 'destroying'; 
        activeClients.set(branchId, clientEntry);
        await destroyClientInstance(branchId, clientEntry.client, true); 
        await updateBranchWhatsAppStatus(branchService, branchId, 'disconnected', null, 'Desconectado pelo administrador.'); // Garante que o DB reflita
        return { success: true, message: 'Cliente desconectado e instância destruída.' };
    } else {
        await updateBranchWhatsAppStatus(branchService, branchId, 'disconnected', null, 'Forçado para desconectado (instância não ativa).');
        console.warn(`[InstanceManager] Nenhum cliente ativo encontrado para Branch ${branchId} ao tentar desconectar.`);
        return { success: false, message: 'Nenhum cliente ativo encontrado para desconectar. Status no DB forçado para desconectado.' };
    }
};

const clearSessionForBranch = async (branchId, branchService) => {
    console.log(`[InstanceManager] Solicitação para limpar sessão da Branch ${branchId}`);
    
    // Desconecta e destrói qualquer cliente ativo ANTES de tentar remover arquivos
    await disconnectClientForBranch(branchId, branchService); 

    let branch;
    try {
        // Busca a filial para pegar o whatsappSessionId, mesmo que já tenha sido desconectado
        branch = await branchService.findBranchById(branchId); 
        if (!branch) { // Se a filial não existe mais, não há o que limpar
            console.warn(`[InstanceManager] Filial ${branchId} não encontrada ao tentar limpar sessão.`);
            return { success: true, message: 'Filial não encontrada, nada a limpar.' };
        }

        const sessionId = branch.whatsappSessionId; // Pega o sessionId do DB
        if (sessionId) {
            const sessionPath = path.join(SESSIONS_DIR, `session-${sessionId}`);
            console.log(`[InstanceManager] Tentando remover diretório de sessão: ${sessionPath}`);
            try {
                await fs.rm(sessionPath, { recursive: true, force: true });
                console.log(`[InstanceManager] Diretório de sessão ${sessionPath} removido com sucesso.`);
            } catch (fsError) {
                // Se o diretório não existir, não é um erro crítico para este fluxo
                if (fsError.code === 'ENOENT') {
                    console.warn(`[InstanceManager] Diretório de sessão ${sessionPath} não encontrado para remoção (ENOENT).`);
                } else {
                    throw fsError; // Relança outros erros de FS
                }
            }
        } else {
            console.warn(`[InstanceManager] Filial ${branchId} não possui whatsappSessionId no DB para limpar arquivos.`);
        }

        // Limpa os campos relacionados no banco de dados
        await branchService.updateBranchWhatsAppInfo(branchId, {
            whatsappSessionId: null,
            whatsappStatus: 'disconnected', // Garante que o status final seja disconnected
            whatsappQrCode: null,
            whatsappLastError: 'Sessão limpa com sucesso pelo administrador.',
            whatsappNumber: null,
        });
        return { success: true, message: 'Sessão do WhatsApp limpa com sucesso (arquivos e DB).' };

    } catch (error) {
        console.error(`[InstanceManager] Erro ao limpar sessão para Branch ${branchId}:`, error);
        // Mesmo em erro, tenta garantir que o status no DB seja 'error' ou 'disconnected'
        if (branch) { 
             await updateBranchWhatsAppStatus(branchService, branchId, 'error', null, `Erro ao limpar sessão: ${error.message}`);
        }
        return { success: false, message: `Erro ao limpar sessão: ${error.message}` };
    }
};

const getClientStatusForBranch = (branchId) => {
    const clientEntry = activeClients.get(branchId);
    if (clientEntry) {
        return {
            status: clientEntry.status,
            qrCode: clientEntry.qrCode,
            isInitializing: clientEntry.isInitializing,
        };
    }
    // Se não está no mapa, idealmente o status deveria vir do DB.
    // Mas para uma resposta rápida, podemos retornar um default.
    // O controller que chama isso pode então consultar o DB se necessário.
    return { status: 'unknown', qrCode: null, isInitializing: false }; 
};

const reconnectPersistedSessions = async (branchService) => {
    console.log('[InstanceManager] Verificando sessões persistidas para reconexão...');
    try {
        const branchesToReconnect = await branchService.findAllBranchesWithActiveWhatsApp();
        if (branchesToReconnect && branchesToReconnect.length > 0) {
            console.log(`[InstanceManager] Encontradas ${branchesToReconnect.length} filiais para tentar reconectar.`);
            for (const branch of branchesToReconnect) {
                if (branch.whatsappSessionId) {
                    // Verifica se já não há uma tentativa de conexão em andamento para esta filial
                    const existingClientEntry = activeClients.get(branch.id);
                    if (existingClientEntry && existingClientEntry.status !== 'disconnected' && existingClientEntry.status !== 'error' && existingClientEntry.status !== 'auth_failure') {
                        console.log(`[InstanceManager] Tentativa de reconexão para Branch ${branch.id} já em andamento ou conectada (Status: ${existingClientEntry.status}). Pulando.`);
                        continue;
                    }
                    console.log(`[InstanceManager] Tentando reconectar automaticamente Branch ${branch.id} (Sessão: ${branch.whatsappSessionId})`);
                    await updateBranchWhatsAppStatus(branchService, branch.id, 'connecting', null, 'Tentando reconexão automática na inicialização.');
                    initializeWhatsAppClientForBranch(branch.id, branch.whatsappSessionId, branchService);
                } else {
                    console.warn(`[InstanceManager] Filial ${branch.id} marcada para reconexão mas não possui whatsappSessionId. Pulando.`);
                     await updateBranchWhatsAppStatus(branchService, branch.id, 'error', null, 'Tentativa de reconexão falhou: whatsappSessionId ausente.');
                }
            }
        } else {
            console.log('[InstanceManager] Nenhuma filial encontrada para reconexão automática.');
        }
    } catch (error) {
        console.error('[InstanceManager] Erro ao buscar filiais para reconexão:', error);
    }
};


module.exports = {
    initiateConnectionForBranch,
    disconnectClientForBranch,
    clearSessionForBranch,
    getClientStatusForBranch, 
    reconnectPersistedSessions,
};