// --- Importações ---
const { Client, LocalAuth } = require('whatsapp-web.js');
const { OpenAI } = require('openai'); // Importa OpenAI
const userService = require('../users/user.services');
const uploadService = require('../uploads/upload.service'); // <<< ADICIONADO: Importa o serviço de upload

// --- Configuração OpenAI ---
const openai = new OpenAI({
    apiKey: "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",
});
const assistantId = "asst_w7MdrgBxinVyfrmvZIyv5Vg0";

// <<< MODIFICADO: Removida a verificação de variável de ambiente aqui, pois você passou a chave diretamente
// if (!process.env.OPENAI_API_KEY || !process.env.OPENAI_ASSISTANT_ID) {
//     console.error("ERRO: Variáveis de ambiente OPENAI_API_KEY ou OPENAI_ASSISTANT_ID não definidas.");
//     // Considerar sair do processo ou desabilitar a funcionalidade do bot
//     // process.exit(1);
// }

// --- Estado do WhatsApp Client ---
let clientInstance = null;
let isInitializing = false;

// --- Mapeamento de Chat WhatsApp para Thread OpenAI ---
const chatThreadMap = {};

// --- Funções de Ferramenta Locais (Mapeadas para os Services) ---
const availableTools = {
    // Funções do userService (mantidas como antes)
    find_user_by_whatsapp: async ({ whatsapp_number }) => {
        console.log(`>>> [TOOL CALL] Executando: userService.findUserByWhatsapp com número: ${whatsapp_number}`);
        try {
            const user = await userService.findUserByWhatsapp(whatsapp_number); // <<< CORRIGIDO: nome da função no service é findUserByWhatsapp
            if (!user) {
                console.log(`>>> [TOOL RESULT] Usuário não encontrado para ${whatsapp_number}`);
                return JSON.stringify({ message: `Usuário com WhatsApp ${whatsapp_number} não encontrado.` });
            }
            console.log(`>>> [TOOL RESULT] Usuário encontrado: ${user.id}`);
            const { password, ...userData } = user.get({ plain: true });
            return JSON.stringify(userData);
        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro em find_user_by_whatsapp:", error);
            return JSON.stringify({ error: error.message || "Erro interno ao buscar usuário por WhatsApp." });
        }
    },
    verifyIdentityAndGetData: async ({ whatsapp_number: whatsappNumber, cpf, dateOfBirth }) => { // <<< CORRIGIDO AQUI (Renomeia whatsapp_number)
        // <<< MELHORIA: Log mais completo dos args recebidos >>>
        console.log(`>>> [TOOL CALL] Executando: userService.verifyIdentityAndGetData para WhatsApp: ${whatsappNumber} com CPF: ${cpf} e DataNasc: ${dateOfBirth}`);
        try {
            // <<< ADICIONADO: Validação dos argumentos recebidos >>>
            if (!whatsappNumber || !cpf || !dateOfBirth) {
                 console.error("<<< [TOOL ERROR] Argumentos faltando para verifyIdentityAndGetData:", { whatsappNumber, cpf, dateOfBirth });
                 // Retorna erro informando qual dado faltou (útil para OpenAI)
                 throw new Error("Faltam informações necessárias (WhatsApp, CPF ou Data de Nascimento) para verificar a identidade. Por favor, peça ao usuário.");
            }

            // Assegura que a data esteja no formato YYYY-MM-DD
            // A validação acima garante que dateOfBirth não é undefined aqui
            const formattedDate = dateOfBirth.split('T')[0];
            const user = await userService.verifyIdentityAndGetData(whatsappNumber, cpf, formattedDate);

            console.log(`>>> [TOOL RESULT] Identidade verificada para usuário: ${user.id}`);
            const { password, ...userData } = user.get({ plain: true });
            return JSON.stringify(userData);
        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro em verifyIdentityAndGetData:", error);
            // Retorna a mensagem de erro original, que pode ser a validação acima ou erro do service
            return JSON.stringify({ error: error.message || "Erro interno durante a verificação de identidade." });
        }
    },
    create_user: async (userDataFromOpenAI) => {
        console.log(`>>> [TOOL CALL] Executando: userService.createUser com dados:`, userDataFromOpenAI);
        try {
            const creationData = {
                ...userDataFromOpenAI,
                isBlocked: userDataFromOpenAI.isBlocked ?? false,
                dateOfBirth: userDataFromOpenAI.dateOfBirth.split('T')[0]
            };
            const newUser = await userService.createUser(creationData);
            console.log(`>>> [TOOL RESULT] Novo usuário criado com ID: ${newUser.id}`);
            const { password, ...userData } = newUser.get({ plain: true });
            return JSON.stringify(userData);
        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro em create_user:", error);
            return JSON.stringify({ error: error.message || "Erro interno ao criar usuário." });
        }
    },
     find_all_users: async ({ branchId }) => {
        console.log(`>>> [TOOL CALL] Executando: userService.findAllUsers com branchId: ${branchId || 'Todos'}`);
        try {
            const options = {};
            if (branchId) {
                const numericBranchId = parseInt(branchId, 10);
                if (!isNaN(numericBranchId)) {
                    options.branchId = numericBranchId;
                } else {
                    console.warn(`<<< [TOOL WARN] branchId inválido recebido (${branchId}), buscando todos os usuários.`);
                }
            }
            const users = await userService.findAllUsers(options);
            console.log(`>>> [TOOL RESULT] Encontrados ${users.length} usuários.`);
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
    update_user: async ({ id, userData }) => {
        console.log(`>>> [TOOL CALL] Executando: userService.updateUser para ID: ${id} com dados:`, userData);
        try {
             if (!userData || typeof userData !== 'object' || Object.keys(userData).length === 0) { // Verifica se userData é um objeto válido e não vazio
                 return JSON.stringify({ error: "Nenhum dado válido fornecido para atualização." });
             }

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

    // <<< ADICIONADO: Mapeamento para a função de salvar imagem >>>
    save_image_buffer: async ({ fileBuffer, originalFilename, mimetype }) => {
        console.log(`>>> [TOOL CALL] Executando: uploadService.saveImageBuffer para: ${originalFilename} (Mime: ${mimetype})`);
        try {
            // Validação básica dos argumentos recebidos da OpenAI
            if (!fileBuffer || typeof fileBuffer !== 'string') {
                 throw new Error("Argumento 'fileBuffer' inválido ou faltando (esperado string base64).");
            }
            if (!originalFilename || typeof originalFilename !== 'string') {
                 throw new Error("Argumento 'originalFilename' inválido ou faltando.");
            }
            if (!mimetype || typeof mimetype !== 'string') {
                 throw new Error("Argumento 'mimetype' inválido ou faltando.");
            }

            // Converter a string base64 recebida da OpenAI para um Buffer Node.js
            let imageBuffer;
            try {
                // Tenta remover um possível prefixo data URL (ex: "data:image/jpeg;base64,")
                const base64Data = fileBuffer.split(';base64,').pop();
                imageBuffer = Buffer.from(base64Data, 'base64');
            } catch (bufferError) {
                console.error("<<< [TOOL ERROR] Erro ao decodificar base64:", bufferError);
                throw new Error("O 'fileBuffer' fornecido não é uma string base64 válida.");
            }

            // Chama o serviço de upload com o buffer decodificado
            const savedFileInfo = await uploadService.saveImageBuffer(
                imageBuffer,
                originalFilename,
                mimetype
            );

            console.log(`>>> [TOOL RESULT] Imagem salva via service: ${savedFileInfo.fileName}`);
            // Retorna as informações do arquivo salvo para a OpenAI como string JSON
            return JSON.stringify(savedFileInfo);

        } catch (error) {
            console.error("<<< [TOOL ERROR] Erro durante save_image_buffer:", error);
            // Retorna a mensagem de erro para a OpenAI como string JSON
            return JSON.stringify({ error: error.message || "Erro interno desconhecido ao salvar a imagem." });
        }
    },
};

// --- Funções Auxiliares OpenAI (getOrCreateThread, processRun - Mantidas como antes) ---

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
            throw new Error("Não foi possível iniciar uma conversa.");
        }
    }
};

const processRun = async (threadId, runId, chatId) => {
    try {
        let run = await openai.beta.threads.runs.retrieve(threadId, runId);

        while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
            await new Promise(resolve => setTimeout(resolve, 1500));
            console.log(`[${chatId}] Run status: ${run.status}`);
            run = await openai.beta.threads.runs.retrieve(threadId, runId);
        }

        console.log(`[${chatId}] Run final status: ${run.status}`);

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
                        // Chama a função local correspondente (agora inclui save_image_buffer)
                        const output = await availableTools[functionName](functionArgs);
                        console.log(`[${chatId}] -> Resultado da ferramenta ${functionName} (Output Type: ${typeof output}):`, output);

                        // Garante que o output seja uma string
                        const outputString = typeof output === 'string' ? output : JSON.stringify(output);

                        toolOutputs.push({
                            tool_call_id: toolCallId,
                            output: outputString, // Garante que seja string
                        });
                    } catch (toolError) {
                        console.error(`[${chatId}] Erro ao executar ferramenta ${functionName}:`, toolError);
                        toolOutputs.push({
                            tool_call_id: toolCallId,
                            output: JSON.stringify({ error: `Erro interno ao executar ${functionName}: ${toolError.message}` })
                        });
                    }
                } else {
                    console.warn(`[${chatId}] Ferramenta ${functionName} não encontrada localmente.`);
                    toolOutputs.push({
                        tool_call_id: toolCallId,
                        output: JSON.stringify({ error: `Função ${functionName} não disponível.` })
                    });
                }
            }

            if (toolOutputs.length > 0) {
                 console.log(`[${chatId}] Submetendo ${toolOutputs.length} resultados de ferramentas...`);
                 // Log para verificar o que está sendo enviado
                 console.log('Outputs a serem submetidos:', JSON.stringify(toolOutputs, null, 2));

                 await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, {
                     tool_outputs: toolOutputs,
                 });
                 return processRun(threadId, run.id, chatId);
            } else {
                 console.warn(`[${chatId}] Nenhuma ferramenta pôde ser executada ou encontrada.`);
                 await openai.beta.threads.runs.cancel(threadId, run.id);
                 throw new Error("Nenhuma ferramenta necessária pôde ser executada.");
            }

        } else if (run.status === 'completed') {
            console.log(`[${chatId}] Run concluído. Buscando mensagens...`);
            const messages = await openai.beta.threads.messages.list(threadId, { limit: 1 });
            const lastMessage = messages.data[0];

            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content[0]?.type === 'text') {
                 const assistantResponse = lastMessage.content[0].text.value;
                 console.log(`[${chatId}] Resposta do Assistente: ${assistantResponse}`);
                 return assistantResponse;
            } else {
                 console.warn(`[${chatId}] Run completo, mas sem resposta válida do assistente encontrada.`);
                 throw new Error("O assistente concluiu mas não forneceu uma resposta.");
            }

        } else {
            console.error(`[${chatId}] Run falhou ou status inesperado: ${run.status}`);
            console.error('Detalhes do Run:', run);
            throw new Error(`A conversa com o assistente falhou (Status: ${run.status}). Último erro: ${run.last_error?.message || 'N/A'}`);
        }

    } catch (error) {
        console.error(`[${chatId}] Erro durante processamento do Run ${runId}:`, error);
        throw error;
    }
};

// --- Controller WhatsApp (Funções de inicialização e listeners - Mantidas como antes) ---

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

const getNewWhatsAppSession = async (req, res, next) => {
    if (isInitializing) {
        return res.status(429).json({ message: "Já existe uma inicialização em andamento. Tente novamente em breve." });
    }

    isInitializing = true;
    console.log("Recebida requisição para nova sessão WhatsApp...");

    try {
        await destroyClient();

        console.log("Criando nova instância do cliente WhatsApp...");
        clientInstance = new Client({
            authStrategy: new LocalAuth({ clientId: "admin-bot-session" }),
            puppeteer: {
                args: ['--no-sandbox', '--disable-setuid-sandbox'],
                timeout: 120000
            }
        });

        let qrCodeValue = null;
        let isReady = false; // Flag para saber se 'ready' já foi emitido

        const qrPromise = new Promise((resolve, reject) => {
            const timeoutId = setTimeout(() => {
                 if (!isReady && !qrCodeValue) { // Só rejeita se nem conectou nem pegou QR
                    console.error('Timeout esperando pelo QR code ou conexão pronta.');
                    reject(new Error('Timeout: QR code não foi gerado ou cliente não conectou em 90 segundos.'));
                 }
            }, 90000);

            clientInstance.once('qr', (qr) => {
                if (isReady) return; // Ignora QR se já estiver pronto
                clearTimeout(timeoutId);
                console.log('QR Code Recebido!');
                qrCodeValue = qr;
                resolve(qr);
            });

            clientInstance.once('ready', () => {
                clearTimeout(timeoutId);
                console.warn('Cliente WhatsApp ficou pronto.');
                isReady = true; // Marca como pronto
                // Se o QR ainda não foi resolvido, resolve com null (conectou direto)
                if (!qrCodeValue) {
                    resolve(null);
                }
            });

            clientInstance.once('auth_failure', (msg) => {
                clearTimeout(timeoutId);
                console.error('Falha na autenticação durante inicialização:', msg);
                reject(new Error('Falha na autenticação: ' + msg));
            });

            clientInstance.once('disconnected', (reason) => {
                 clearTimeout(timeoutId);
                 // Só rejeita se desconectar ANTES de ficar pronto ou ter QR
                 if (!isReady && !qrCodeValue) {
                    console.error('Desconectado durante a espera inicial:', reason);
                    reject(new Error('Cliente desconectado durante a inicialização: ' + reason));
                 }
            });
        });

        console.log("Iniciando client.initialize()...");
        // Captura erro SÍNCRONO do initialize, os assíncronos são pelos eventos
        try {
             await clientInstance.initialize();
        } catch (initializeError) {
             console.error("Erro CRÍTICO no initialize() inicial:", initializeError.message);
             isInitializing = false;
             throw initializeError; // Re-lança para o catch externo principal
        }


        console.log("Aguardando QR code ou conexão pronta...");
        const qrCode = await qrPromise;

        // --- Listeners Principais (configurados APÓS initialize ser chamado) ---
        // Limpa listeners antigos para garantir que não dupliquem ao reiniciar a sessão
        clientInstance.removeAllListeners('message');
        clientInstance.removeAllListeners('ready');
        clientInstance.removeAllListeners('disconnected');
        clientInstance.removeAllListeners('auth_failure');

        // Listener 'ready' (redundante, mas seguro ter)
        clientInstance.on('ready', () => {
             if (clientInstance?.info?.wid?.user) {
                 console.log(`✅ Cliente WhatsApp Conectado/Pronto! ID: ${clientInstance.info.wid.user}`);
             } else {
                 console.log(`✅ Cliente WhatsApp Conectado/Pronto! (Info indisponível no momento)`);
             }
             isReady = true; // Garante que esteja marcado como pronto
        });

        // Listener para mensagens recebidas
        clientInstance.on('message', async (message) => {
             // <<< ADICIONADO: Tratamento para MENSAGENS COM MÍDIA (IMAGENS) >>>
            if (message.hasMedia && ['image'].includes(message.type)) {
                console.log(`[${message.from}] Mensagem com MÍDIA (${message.type}) recebida.`);
                try {
                    console.log(`[${message.from}] Baixando mídia...`);
                    const mediaData = await message.downloadMedia(); // Retorna um objeto MessageMedia

                    if (mediaData) {
                        console.log(`[${message.from}] Mídia baixada. Mimetype: ${mediaData.mimetype}, Size: ${mediaData.data.length} bytes`);

                        // AGORA, chama a função `save_image_buffer` via availableTools
                        const saveToolArgs = {
                            fileBuffer: mediaData.data, // Passa a string base64
                            originalFilename: mediaData.filename || `whatsapp-image-${Date.now()}.${mediaData.mimetype.split('/')[1] || 'jpg'}`, // Usa nome original se houver, senão gera um
                            mimetype: mediaData.mimetype
                        };

                         // Chama diretamente a função mapeada em availableTools
                         // (Simulando o que o processRun faria se a IA pedisse)
                         const resultOutput = await availableTools.save_image_buffer(saveToolArgs);
                         const result = JSON.parse(resultOutput); // Parseia o resultado JSON string

                        if (result.error) {
                             console.error(`[${message.from}] Erro ao salvar imagem via service: ${result.error}`);
                             await message.reply(`Desculpe, houve um erro ao processar sua imagem: ${result.error}`);
                        } else {
                             console.log(`[${message.from}] Imagem salva com sucesso: ${result.fileName}`);
                             // Aqui você pode continuar a conversa com a IA, informando que a imagem foi salva
                             // e passando o caminho (result.filePath) se necessário para a IA.
                             // Exemplo: Enviar uma mensagem de confirmação e talvez iniciar o run da IA
                             await message.reply(`Sua imagem foi recebida e salva com sucesso! (${result.fileName})`);

                             // Opcional: Iniciar um run da IA após salvar a imagem
                             /*
                             const threadId = await getOrCreateThread(message.from);
                             await openai.beta.threads.messages.create(threadId, {
                                 role: "user",
                                 content: `A imagem ${result.fileName} (${result.originalName}) foi salva com sucesso no caminho ${result.filePath}. O que devo fazer agora?`,
                             });
                             const run = await openai.beta.threads.runs.create(threadId, { assistant_id: assistantId });
                             const assistantResponse = await processRun(threadId, run.id, message.from);
                             if (assistantResponse) {
                                 await clientInstance.sendMessage(message.from, assistantResponse);
                             }
                             */
                        }
                    } else {
                        console.warn(`[${message.from}] Falha ao baixar mídia.`);
                        await message.reply("Não consegui processar a imagem que você enviou. Tente novamente.");
                    }
                } catch (mediaError) {
                    console.error(`[${message.from}] Erro ao processar mídia:`, mediaError);
                    await message.reply("Ocorreu um erro ao processar a imagem. Tente novamente.");
                }
                return; // Não processa mais como texto normal se for mídia
            }
            // <<< FIM DO TRATAMENTO DE MÍDIA >>>


            // Ignora mensagens do próprio bot ou de status (mantido)
            if (message.fromMe || message.isStatus || message.type !== 'chat') return;

            const chatId = message.from;
            const userMessage = message.body;

            console.log(`[${chatId}] Mensagem de TEXTO recebida: "${userMessage}"`);

            try {
                const threadId = await getOrCreateThread(chatId);
                console.log(`[${chatId}] Adicionando mensagem à thread ${threadId}...`);
                await openai.beta.threads.messages.create(threadId, {
                    role: "user",
                    content: userMessage,
                });

                 console.log(`[${chatId}] Criando run com assistente ${assistantId}...`);
                 const run = await openai.beta.threads.runs.create(threadId, {
                     assistant_id: assistantId,
                 });
                 console.log(`[${chatId}] Run criado: ${run.id}. Processando...`);

                 const assistantResponse = await processRun(threadId, run.id, chatId);

                 if (assistantResponse) {
                    console.log(`[${chatId}] Enviando resposta via WhatsApp...`);
                    await clientInstance.sendMessage(chatId, assistantResponse);
                    console.log(`[${chatId}] Resposta enviada.`);
                 } else {
                     console.warn(`[${chatId}] ProcessRun concluído sem uma resposta final para enviar.`);
                 }

            } catch (error) {
                console.error(`[${chatId}] Erro ao processar mensagem com OpenAI:`, error);
                try {
                    await clientInstance.sendMessage(chatId, "Desculpe, ocorreu um erro ao processar sua solicitação. Tente novamente mais tarde.");
                } catch (sendError) {
                    console.error(`[${chatId}] Falha ao enviar mensagem de erro para o usuário:`, sendError);
                }
            }
        });

         // Listener para desconexão
         clientInstance.on('disconnected', (reason) => {
             console.warn('Cliente foi desconectado!', reason);
             // Limpar estado ao desconectar
             isReady = false;
             qrCodeValue = null;
             // Limpar o mapa de threads é importante para forçar a criação de novas na reconexão
             Object.keys(chatThreadMap).forEach(key => delete chatThreadMap[key]);
             console.log("Mapeamento de threads limpo.");
             if (clientInstance) {
                 clientInstance.destroy().catch(e => console.error("Erro ao destruir cliente na desconexão:", e));
             }
             clientInstance = null;
             isInitializing = false; // Libera o lock se desconectou
         });

         // Listener para falha de autenticação
         clientInstance.on('auth_failure', msg => {
             console.error('FALHA NA AUTENTICAÇÃO (após conexão inicial):', msg);
             isReady = false;
             qrCodeValue = null;
              Object.keys(chatThreadMap).forEach(key => delete chatThreadMap[key]);
              console.log("Mapeamento de threads limpo devido à falha de autenticação.");
             if (clientInstance) {
                  clientInstance.destroy().catch(e => console.error("Erro ao destruir cliente na falha de auth:", e));
             }
             clientInstance = null;
             isInitializing = false; // Libera o lock
         });
         // --- Fim dos Listeners ---


        // Responder à API
        if (qrCode) {
            console.log("Enviando QR code para o front-end.");
            res.status(200).json({ qr: qrCode, message: "QR Code gerado. Escaneie com o WhatsApp." });
        } else {
             console.log("Conexão restaurada/estabelecida sem necessidade de QR code.");
             res.status(200).json({ qr: null, message: "Conectado com sucesso (sessão existente ou conexão rápida)." });
        }

    } catch (error) {
        console.error("Erro GERAL no processo de obter nova sessão:", error);
        await destroyClient(); // Garante limpeza em caso de erro grave
        if (next) {
            next(error);
        } else {
            res.status(500).json({ message: "Erro ao iniciar sessão do WhatsApp.", error: error.message });
        }
    } finally {
        isInitializing = false; // Libera o lock SEMPRE
    }
};

module.exports = {
    getNewWhatsAppSession
};