// --- Importações ---
const { Client, LocalAuth } = require('whatsapp-web.js');
const { OpenAI } = require('openai'); // Importa OpenAI
const userService = require('../users/user.services')

// --- Configuração OpenAI ---
const openai = new OpenAI({
    apiKey: "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",
});
const assistantId = "asst_w7MdrgBxinVyfrmvZIyv5Vg0";

if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_ASSISTANT_ID) {
    console.error("ERRO: Variáveis de ambiente OPENAI_API_KEY ou OPENAI_ASSISTANT_ID não definidas.");
    // Considerar sair do processo ou desabilitar a funcionalidade do bot
    // process.exit(1);
}

// --- Estado do WhatsApp Client ---
let clientInstance = null;
let isInitializing = false;

// --- Mapeamento de Chat WhatsApp para Thread OpenAI ---
// Guarda o ID da Thread OpenAI para cada chat do WhatsApp
// ATENÇÃO: Isso é armazenado em memória. Se o servidor reiniciar, os históricos serão perdidos.
// Para persistência, armazene isso em um banco de dados.
const chatThreadMap = {};

// --- Funções de Ferramenta Locais (Exemplos) ---
// Mapeie os nomes das funções DEFINIDAS NO SEU ASSISTANT para funções JS aqui.
// Estas funções serão chamadas quando o assistente indicar 'requires_action'.
// --- Funções de Ferramenta Locais (Mapeadas para userService) ---
const availableTools = {
    // Mapeia 'find_user_by_whatsapp' (OpenAI) para userService.findUserByWhatsapp
    find_user_by_whatsapp: async ({ whatsapp_number }) => {
        console.log(`>>> [TOOL CALL] Executando: userService.findUserByWhatsapp com número: ${whatsapp_number}`);
        try {
            const user = await userService.findUserByWhatsapp(whatsapp_number);
            if (!user) {
                console.log(`>>> [TOOL RESULT] Usuário não encontrado para ${whatsapp_number}`);
                return JSON.stringify({ message: `Usuário com WhatsApp ${whatsapp_number} não encontrado.` });
            }
            console.log(`>>> [TOOL RESULT] Usuário encontrado: ${user.id}`);
            // Retorna o resultado como uma STRING JSON
            // Remova dados sensíveis se necessário antes de retornar para a IA
            const { password, ...userData } = user.get({ plain: true }); // Exemplo de remoção de senha
            return JSON.stringify(userData);
        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro em find_user_by_whatsapp:", error);
            // Retorna a mensagem de erro específica do service, se houver
            return JSON.stringify({ error: error.message || "Erro interno ao buscar usuário por WhatsApp." });
        }
    },

    // Mapeia 'verifyIdentityAndGetData' (OpenAI) para userService.verifyIdentityAndGetData
    verifyIdentityAndGetData: async ({ whatsappNumber, cpf, dateOfBirth }) => {
        console.log(`>>> [TOOL CALL] Executando: userService.verifyIdentityAndGetData para WhatsApp: ${whatsappNumber}`);
        try {
            // Assegura que a data esteja no formato YYYY-MM-DD
            const formattedDate = dateOfBirth.split('T')[0]; // Pega apenas a parte da data
            const user = await userService.verifyIdentityAndGetData(whatsappNumber, cpf, formattedDate);
            console.log(`>>> [TOOL RESULT] Identidade verificada para usuário: ${user.id}`);
            const { password, ...userData } = user.get({ plain: true });
            return JSON.stringify(userData);
        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro em verifyIdentityAndGetData:", error);
            // Erros como 'Usuário não encontrado' ou 'CPF/Data inválidos' serão retornados aqui
            return JSON.stringify({ error: error.message || "Erro interno durante a verificação de identidade." });
        }
    },

    // Mapeia 'create_user' (OpenAI) para userService.createUser
    create_user: async (userDataFromOpenAI) => {
        // O objeto recebido já deve ter a estrutura correta definida nos parâmetros da OpenAI
        console.log(`>>> [TOOL CALL] Executando: userService.createUser com dados:`, userDataFromOpenAI);
        try {
             // Garante que isBlocked tenha um valor default se não vier
             const creationData = {
                ...userDataFromOpenAI,
                isBlocked: userDataFromOpenAI.isBlocked ?? false,
                dateOfBirth: userDataFromOpenAI.dateOfBirth.split('T')[0] // Garante YYYY-MM-DD
             };

            const newUser = await userService.createUser(creationData);
            console.log(`>>> [TOOL RESULT] Novo usuário criado com ID: ${newUser.id}`);
            const { password, ...userData } = newUser.get({ plain: true });
            return JSON.stringify(userData);
        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro em create_user:", error);
            // Erros como 'CPF já cadastrado', 'WhatsApp já cadastrado', validações, FK, etc.
            return JSON.stringify({ error: error.message || "Erro interno ao criar usuário." });
        }
    },

    // Mapeia 'find_all_users' (OpenAI) para userService.findAllUsers
    find_all_users: async ({ branchId }) => {
        // Nota: O schema OpenAI marcou branchId como string e required, o que pode não ser ideal.
        // O service espera um objeto de opções com branchId numérico opcional.
        console.log(`>>> [TOOL CALL] Executando: userService.findAllUsers com branchId: ${branchId || 'Todos'}`);
        try {
            const options = {};
            if (branchId) {
                const numericBranchId = parseInt(branchId, 10);
                if (!isNaN(numericBranchId)) {
                    options.branchId = numericBranchId;
                } else {
                    console.warn(`<<< [TOOL WARN] branchId inválido recebido (${branchId}), buscando todos os usuários.`);
                    // Poderia retornar um erro se o ID da filial for obrigatório no contexto da IA
                    // return JSON.stringify({ error: `Formato de branchId inválido: ${branchId}` });
                }
            }
            const users = await userService.findAllUsers(options);
            console.log(`>>> [TOOL RESULT] Encontrados ${users.length} usuários.`);
            // O service já exclui alguns campos, mas podemos garantir aqui também
            const safeUsers = users.map(u => {
                const { password, ...userData } = u.get({ plain: true });
                return userData;
            });
            return JSON.stringify(safeUsers);
        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro em find_all_users:", error);
            return JSON.stringify({ error: error.message || "Erro interno ao buscar todos os usuários." });
        }
    },

    // Mapeia 'update_user' (OpenAI) para userService.updateUser
    update_user: async ({ id, userData }) => {
        console.log(`>>> [TOOL CALL] Executando: userService.updateUser para ID: ${id} com dados:`, userData);
        try {
             // O service já impede a atualização de campos como ID, CPF, etc.
             // Podemos validar aqui se o objeto userData não está vazio.
             if (Object.keys(userData).length === 0) {
                 return JSON.stringify({ error: "Nenhum dado fornecido para atualização." });
             }

             // Garante formato de data se houver
             if (userData.dateOfBirth) {
                 userData.dateOfBirth = userData.dateOfBirth.split('T')[0];
             }

            const updatedUser = await userService.updateUser(id, userData);
            if (!updatedUser) {
                 console.log(`>>> [TOOL RESULT] Usuário ${id} não encontrado para atualização.`);
                return JSON.stringify({ message: `Usuário com ID ${id} não encontrado.` });
            }
            console.log(`>>> [TOOL RESULT] Usuário ${id} atualizado.`);
            const { password, ...userResultData } = updatedUser.get({ plain: true });
            return JSON.stringify(userResultData);
        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro em update_user:", error);
            return JSON.stringify({ error: error.message || "Erro interno ao atualizar usuário." });
        }
    },

    // Adicione aqui mapeamentos para outras funções que o assistente possa chamar
    // Exemplo: Se você adicionar a função delete_user ao assistente:
    /*
    delete_user: async ({ id }) => {
        console.log(`>>> [TOOL CALL] Executando: userService.deleteUser para ID: ${id}`);
        try {
            const deleted = await userService.deleteUser(id);
            if (deleted) {
                 console.log(`>>> [TOOL RESULT] Usuário ${id} deletado.`);
                return JSON.stringify({ success: true, message: `Usuário ${id} deletado com sucesso.` });
            } else {
                 console.log(`>>> [TOOL RESULT] Usuário ${id} não encontrado para deleção.`);
                return JSON.stringify({ success: false, message: `Usuário com ID ${id} não encontrado.` });
            }
        } catch (error) {
            console.error(`<<< [TOOL ERROR] Erro em delete_user (${id}):`, error);
             // O service lança o erro original em caso de FK constraint
             if (error.name === 'SequelizeForeignKeyConstraintError') {
                 return JSON.stringify({ error: "Não é possível deletar o usuário pois ele possui registros associados (ex: reservas)." });
             }
            return JSON.stringify({ error: error.message || "Erro interno ao deletar usuário." });
        }
    }
    */
};

// --- Funções Auxiliares OpenAI ---

// Função para obter ou criar uma Thread OpenAI para um chat WhatsApp
const getOrCreateThread = async (chatId) => {
    if (chatThreadMap[chatId]) {
        console.log(`Thread existente encontrada para ${chatId}: ${chatThreadMap[chatId]}`);
        return chatThreadMap[chatId];
    } else {
        console.log(`Nenhuma thread encontrada para ${chatId}. Criando nova...`);
        try {
            const thread = await openai.beta.threads.create();
            chatThreadMap[chatId] = thread.id;
            console.log(`Nova thread criada para ${chatId}: ${thread.id}`);
            return thread.id;
        } catch (error) {
            console.error(`Erro ao criar thread para ${chatId}:`, error);
            throw new Error("Não foi possível iniciar uma conversa."); // Lança erro para ser pego no handler da msg
        }
    }
};

// Função para processar a execução (run) do assistente e esperar o resultado
const processRun = async (threadId, runId, chatId) => {
    try {
        let run = await openai.beta.threads.runs.retrieve(threadId, runId);

        // Polling para esperar a conclusão ou ação requerida
        while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Espera 1.5 segundos
            console.log(`[${chatId}] Run status: ${run.status}`);
            run = await openai.beta.threads.runs.retrieve(threadId, runId);
        }

        console.log(`[${chatId}] Run final status: ${run.status}`);

        // --- CASO 1: Ação Requerida (Chamada de Função) ---
        if (run.status === 'requires_action') {
            console.log(`[${chatId}] Run requer ação (chamada de função).`);
            const toolOutputs = [];
            const requiredActions = run.required_action.submit_tool_outputs.tool_calls;

            for (const action of requiredActions) {
                const functionName = action.function.name;
                const functionArgs = JSON.parse(action.function.arguments || '{}');
                const toolCallId = action.id;

                console.log(`[${chatId}] -> Tentando executar ferramenta: ${functionName} com args:`, functionArgs);

                if (availableTools[functionName]) {
                    try {
                        // Chama a função local correspondente
                        const output = await availableTools[functionName](functionArgs);
                        console.log(`[${chatId}] -> Resultado da ferramenta ${functionName}:`, output);
                        toolOutputs.push({
                            tool_call_id: toolCallId,
                            output: output, // O output DEVE ser uma string
                        });
                    } catch (toolError) {
                        console.error(`[${chatId}] Erro ao executar ferramenta ${functionName}:`, toolError);
                        // Informa erro para o assistente (opcional)
                        toolOutputs.push({
                            tool_call_id: toolCallId,
                            output: JSON.stringify({ error: `Erro interno ao executar ${functionName}: ${toolError.message}` })
                        });
                    }
                } else {
                    console.warn(`[${chatId}] Ferramenta ${functionName} não encontrada localmente.`);
                    // Informa que a função não existe
                    toolOutputs.push({
                        tool_call_id: toolCallId,
                        output: JSON.stringify({ error: `Função ${functionName} não disponível.` })
                    });
                }
            }

            // Submete os resultados das ferramentas de volta para a OpenAI
            if (toolOutputs.length > 0) {
                 console.log(`[${chatId}] Submetendo ${toolOutputs.length} resultados de ferramentas...`);
                 await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
                     tool_outputs: toolOutputs,
                 });
                 // Chama recursivamente para continuar o processamento após submeter
                 return processRun(threadId, run.id, chatId);
            } else {
                 console.warn(`[${chatId}] Nenhuma ferramenta pôde ser executada ou encontrada.`);
                 // Você pode querer cancelar o run ou enviar uma mensagem de erro aqui
                 await openai.beta.threads.runs.cancel(threadId, run.id);
                 throw new Error("Nenhuma ferramenta necessária pôde ser executada.");
            }

        // --- CASO 2: Run Concluído ---
        } else if (run.status === 'completed') {
            console.log(`[${chatId}] Run concluído. Buscando mensagens...`);
            const messages = await openai.beta.threads.messages.list(threadId, { limit: 1 }); // Pega só a última
            const lastMessage = messages.data[0];

            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content[0]?.type === 'text') {
                 const assistantResponse = lastMessage.content[0].text.value;
                 console.log(`[${chatId}] Resposta do Assistente: ${assistantResponse}`);
                 return assistantResponse; // Retorna a resposta final
            } else {
                 console.warn(`[${chatId}] Run completo, mas sem resposta válida do assistente encontrada.`);
                 throw new Error("O assistente concluiu mas não forneceu uma resposta.");
            }

        // --- CASO 3: Run Falhou ou Expirou ---
        } else {
            console.error(`[${chatId}] Run falhou ou status inesperado: ${run.status}`);
            console.error('Detalhes do Run:', run); // Loga todo o objeto run para debug
            throw new Error(`A conversa com o assistente falhou (Status: ${run.status}). Último erro: ${run.last_error?.message || 'N/A'}`);
        }

    } catch (error) {
        console.error(`[${chatId}] Erro durante processamento do Run ${runId}:`, error);
        throw error; // Re-lança o erro para ser pego no handler da mensagem
    }
};


// --- Controller WhatsApp (Modificado) ---

const destroyClient = async () => {
    if (clientInstance) {
        console.log('Tentando destruir instância anterior do cliente...');
        try {
            await clientInstance.destroy();
            console.log('Instância anterior destruída.');
        } catch (error) {
            console.error('Erro ao destruir instância anterior:', error.message);
        } finally {
            clientInstance = null;
        }
    }
};

const getNewWhatsAppSession = async (req, res, next) => { // Adicionado 'next' para possível error handling
    // if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_ASSISTANT_ID) {
    //    return res.status(500).json({ message: "Erro de configuração do servidor: API OpenAI não configurada." });
    // }
    if (isInitializing) {
        return res.status(429).json({ message: "Já existe uma inicialização em andamento. Tente novamente em breve." });
    }

    isInitializing = true;
    console.log("Recebida requisição para nova sessão WhatsApp...");

    try {
        await destroyClient();

        console.log("Criando nova instância do cliente WhatsApp...");
        clientInstance = new Client({
            authStrategy: new LocalAuth({ clientId: "admin-bot-session" }), // Mudei o ID ligeiramente
            puppeteer: {
                // headless: false,
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                 // Importante: Timeout maior para o Puppeteer iniciar, especialmente em
                 // ambientes com recursos limitados ou primeira execução (download do Chromium)
                timeout: 120000 // 120 segundos
            }
        });

        let qrCodeValue = null;

        const qrPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                console.error('Timeout esperando pelo QR code.');
                reject(new Error('Timeout: QR code não foi gerado em 90 segundos. Verifique a conexão ou tente novamente.'));
            }, 90000); // Aumentei o timeout para 90 segundos

            clientInstance.once('qr', (qr) => {
                clearTimeout(timeoutId);
                console.log('QR Code Recebido!');
                qrCodeValue = qr;
                resolve(qr);
            });

            clientInstance.once('ready', () => {
                clearTimeout(timeoutId);
                console.warn('Cliente ficou pronto ANTES do QR ser capturado (sessão restaurada).');
                // Quando a sessão é restaurada, não há QR. A Promise NÃO deve resolver nem rejeitar neste caso,
                // pois a sessão está OK. O front-end não receberá um QR, o que indica que deve
                // ter conectado automaticamente (ou o admin já escaneou anteriormente).
                // Podemos apenas logar e continuar. O importante é o listener 'ready' abaixo.
                 console.log("Sessão restaurada, não será enviado QR.");
                 // Se você *precisa* de um QR sempre, teria que desconectar/logout aqui e reiniciar.
                 // Mas vamos manter o comportamento de restaurar sessão.
                 // A Promise qrPromise vai eventualmente dar timeout se não for limpa,
                 // então é crucial limpá-la no 'ready' se o QR não veio.
                 // No entanto, vamos deixar o fluxo normal ocorrer: 'ready' será tratado abaixo.
                 // A chamada para `await qrPromise` vai dar timeout se o 'ready' ocorrer sem 'qr'.
                 // Vamos ajustar isso: se 'ready' vier primeiro, consideramos OK, mas sem QR.
                 if (!qrCodeValue) { // Se 'ready' veio antes de 'qr'
                    resolve(null); // Resolve a promise com null para indicar que não tem QR, mas conectou.
                 }
            });

            clientInstance.once('auth_failure', (msg) => {
                clearTimeout(timeoutId);
                console.error('Falha na autenticação durante inicialização:', msg);
                reject(new Error('Falha na autenticação: ' + msg));
            });

            clientInstance.once('disconnected', (reason) => {
                clearTimeout(timeoutId);
                 // Se desconectar *antes* de gerar QR ou ficar pronto, é um erro.
                if (!qrCodeValue && clientInstance?.info == null) { // Verifica se ainda não está pronto
                     console.error('Desconectado durante a espera inicial:', reason);
                    reject(new Error('Cliente desconectado durante a inicialização: ' + reason));
                } else {
                    // Se desconectou depois de pronto/QR, o handler global cuidará disso.
                    console.log('Desconectado (evento capturado durante espera, mas pode ser normal).');
                }
            });
        });

        console.log("Iniciando client.initialize()...");
        // Tratamento de erro inicial, mas o principal é via eventos/promise
        clientInstance.initialize().catch(initializeError => {
            console.error("Erro CRÍTICO no initialize() inicial:", initializeError.message);
            // Tenta rejeitar a promise se ainda não foi resolvida/rejeitada
            // (isso pode acontecer se o puppeteer falhar muito cedo)
            // Não podemos chamar reject diretamente aqui, então sinalizamos o erro.
        });

        console.log("Aguardando QR code ou conexão pronta...");
        const qrCode = await qrPromise; // Espera QR ou null (se conectou direto)

        // --- Listeners Principais (configurados APÓS initialize ser chamado) ---
        // Limpa listeners antigos para garantir que não dupliquem
        clientInstance.removeAllListeners('message');
        clientInstance.removeAllListeners('ready');
        clientInstance.removeAllListeners('disconnected');
        clientInstance.removeAllListeners('auth_failure');

        // Listener quando o cliente está pronto (seja via QR ou sessão restaurada)
        clientInstance.on('ready', () => {
            console.log(`✅ Cliente WhatsApp Conectado! ID: ${clientInstance.info.wid.user}`);
            // Não faz nada na resposta da API aqui, pois ela já pode ter sido enviada (com QR ou null)
        });

        // Listener para mensagens recebidas
        clientInstance.on('message', async (message) => {
            // Ignora mensagens do próprio bot ou de status
            if (message.fromMe || message.isStatus) return;

            const chatId = message.from; // ID do chat do usuário
            const userMessage = message.body;

            console.log(`[${chatId}] Mensagem recebida: "${userMessage}"`);

            // Simplesmente encaminha para o OpenAI Assistant
            try {
                 // 1. Obter/Criar Thread
                const threadId = await getOrCreateThread(chatId);

                // 2. Adicionar mensagem do usuário à Thread
                console.log(`[${chatId}] Adicionando mensagem à thread ${threadId}...`);
                await openai.beta.threads.messages.create(threadId, {
                    role: "user",
                    content: userMessage,
                });

                 // 3. Criar e Processar o Run
                 console.log(`[${chatId}] Criando run com assistente ${assistantId}...`);
                 const run = await openai.beta.threads.runs.create(threadId, {
                     assistant_id: assistantId,
                     // Instruções adicionais podem ser passadas aqui se necessário
                     // instructions: "Seja breve e amigável."
                 });
                 console.log(`[${chatId}] Run criado: ${run.id}. Processando...`);

                 // 4. Esperar o resultado (que pode envolver chamadas de função)
                 const assistantResponse = await processRun(threadId, run.id, chatId);

                 // 5. Enviar resposta de volta via WhatsApp
                 if (assistantResponse) {
                    console.log(`[${chatId}] Enviando resposta via WhatsApp...`);
                    await clientInstance.sendMessage(chatId, assistantResponse);
                    console.log(`[${chatId}] Resposta enviada.`);
                 } else {
                     console.warn(`[${chatId}] ProcessRun concluído sem uma resposta final para enviar.`);
                      // Opcional: Enviar mensagem genérica
                      // await clientInstance.sendMessage(chatId, "Não consegui gerar uma resposta no momento.");
                 }

            } catch (error) {
                console.error(`[${chatId}] Erro ao processar mensagem com OpenAI:`, error);
                try {
                    // Tenta enviar uma mensagem de erro para o usuário
                    await clientInstance.sendMessage(chatId, "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.");
                } catch (sendError) {
                    console.error(`[${chatId}] Falha ao enviar mensagem de erro para o usuário:`, sendError);
                }
            }
        });

         // Listener para desconexão
         clientInstance.on('disconnected', (reason) => {
             console.warn('Cliente foi desconectado!', reason);
             chatThreadMap = {}; // Limpa o mapeamento de threads ao desconectar
             clientInstance = null; // Limpa a referência global
         });

         // Listener para falha de autenticação (pode ocorrer depois de conectar)
         clientInstance.on('auth_failure', msg => {
             console.error('FALHA NA AUTENTICAÇÃO (após conexão inicial):', msg);
             chatThreadMap = {};
             clientInstance = null;
         });
         // --- Fim dos Listeners ---


        // Responder à API
        if (qrCode) {
            console.log("Enviando QR code para o front-end.");
            res.status(200).json({ qr: qrCode, message: "QR Code gerado. Escaneie com o WhatsApp." });
        } else {
             // Se qrCode for null, significa que conectou direto ('ready' veio antes de 'qr')
             console.log("Conexão restaurada/estabelecida sem necessidade de QR code.");
             res.status(200).json({ qr: null, message: "Conectado com sucesso (sessão existente ou conexão rápida)." });
        }

    } catch (error) {
        console.error("Erro GERAL no processo de obter nova sessão:", error);
        await destroyClient(); // Garante limpeza em caso de erro grave
        // Passa o erro para o handler global do Express se 'next' foi passado
        if (next) {
            next(error);
        } else {
            // Resposta padrão se 'next' não estiver disponível
            res.status(500).json({ message: "Erro ao iniciar sessão do WhatsApp.", error: error.message });
        }
    } finally {
        isInitializing = false; // Libera o lock
    }
};

module.exports = {
    getNewWhatsAppSession
    // Exporte outras funções se necessário
};