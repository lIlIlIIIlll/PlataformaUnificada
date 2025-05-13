// src/features/whatsapp/messageHandler.js
const { OpenAI } = require('openai');
const userService = require('../users/user.services');
const uploadService = require('../uploads/upload.service');
const branchService = require('../branches/branch.service'); // Para buscar o assistantId específico da filial

// --- Configuração OpenAI ---
// A chave da API e o ID do assistente padrão devem vir de variáveis de ambiente
const OPENAI_API_KEY = "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";
const DEFAULT_OPENAI_ASSISTANT_ID = "asst_w7MdrgBxinVyfrmvZIyv5Vg0";

if (!OPENAI_API_KEY || !DEFAULT_OPENAI_ASSISTANT_ID) {
    console.error("ALERTA: Variáveis de ambiente OPENAI_API_KEY ou OPENAI_ASSISTANT_ID não definidas. Funcionalidade do Bot pode ser afetada.");
    // Não vamos parar a aplicação, mas o bot não funcionará corretamente sem isso.
}

const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// --- Mapeamento de Chat WhatsApp para Thread OpenAI ---
// Este mapa agora precisa ser gerenciado de forma mais granular, talvez prefixando com branchId
// ou tendo um mapa de mapas: chatThreadMap[branchId][chatId]
// Por simplicidade inicial, vamos manter um mapa global, mas cientes da necessidade de refinar.
const chatThreadMap = {}; // Formato: { "branchId_chatId": "threadId" }

// --- Funções de Ferramenta Locais (Mapeadas para os Services) ---
// As funções de ferramenta agora precisam aceitar branchId como parâmetro
// e usá-lo ao chamar os respectivos serviços se a operação for escopada por filial.
const availableTools = {
    find_user_by_whatsapp: async ({ whatsapp_number }, branchId) => {
        console.log(`>>> [TOOL CALL][Branch ${branchId}] Executando: userService.findUserByWhatsappNumber com número: ${whatsapp_number}`);
        try {
            // Se a busca deve ser global ou por filial, depende da sua regra de negócio.
            // Assumindo que um whatsapp_number é único globalmente por enquanto.
            // Se precisar filtrar por filial: const user = await userService.findUserByWhatsappNumberAndBranch(whatsapp_number, branchId);
            const user = await userService.findUserByWhatsappNumber(whatsapp_number);
            if (!user) {
                console.log(`>>> [TOOL RESULT][Branch ${branchId}] Usuário não encontrado para ${whatsapp_number}`);
                return JSON.stringify({ message: `Usuário com WhatsApp ${whatsapp_number} não encontrado.` });
            }
            // Verifica se o usuário encontrado pertence à filial do bot, se a regra exigir.
            // if (user.branchId !== branchId) {
            //     console.log(`>>> [TOOL RESULT][Branch ${branchId}] Usuário ${user.id} encontrado, mas pertence a outra filial (${user.branchId}).`);
            //     return JSON.stringify({ message: `Este número de WhatsApp está registrado em outra unidade.` });
            // }
            console.log(`>>> [TOOL RESULT][Branch ${branchId}] Usuário encontrado: ${user.id}`);
            const { ...userData } = user.get({ plain: true }); // Remover campos sensíveis se houver
            return JSON.stringify(userData);
        } catch (error) {
            console.error(`<<< [TOOL ERROR][Branch ${branchId}] Erro em find_user_by_whatsapp:`, error);
            return JSON.stringify({ error: error.message || "Erro interno ao buscar usuário por WhatsApp." });
        }
    },
    verify_identity_and_get_data: async ({ whatsapp_number, cpf, dateOfBirth }, branchId) => {
        console.log(`>>> [TOOL CALL][Branch ${branchId}] Executando: userService.verifyIdentityAndGetData para WhatsApp: ${whatsapp_number} com CPF: ${cpf} e DataNasc: ${dateOfBirth}`);
        try {
            if (!whatsapp_number || !cpf || !dateOfBirth) {
                 throw new Error("Faltam informações (WhatsApp, CPF ou Data de Nascimento).");
            }
            const formattedDate = dateOfBirth.split('T')[0];
            const user = await userService.verifyIdentityAndGetData(whatsapp_number, cpf, formattedDate); // Este service já busca pelo whatsapp_number
            
            // Opcional: Verificar se o usuário pertence à filial do bot, se necessário
            // if (user.branchId !== branchId) {
            //     return JSON.stringify({ error: "Dados de verificação corretos, mas usuário pertence a outra filial." });
            // }
            console.log(`>>> [TOOL RESULT][Branch ${branchId}] Identidade verificada para usuário: ${user.id}`);
            const { ...userData } = user.get({ plain: true });
            return JSON.stringify(userData);
        } catch (error) {
            console.error(`<<< [TOOL ERROR][Branch ${branchId}] Erro em verify_identity_and_get_data:`, error);
            return JSON.stringify({ error: error.message || "Erro interno na verificação de identidade." });
        }
    },
    create_user: async (userDataFromOpenAI, branchId) => {
        console.log(`>>> [TOOL CALL][Branch ${branchId}] Executando: userService.createUser com dados:`, userDataFromOpenAI);
        try {
            // Garante que o branchId da filial do bot seja usado
            const creationData = {
                ...userDataFromOpenAI,
                branchId: branchId, // Sobrescreve ou define o branchId
                isBlocked: userDataFromOpenAI.isBlocked ?? false,
                dateOfBirth: userDataFromOpenAI.dateOfBirth.split('T')[0]
            };
            const newUser = await userService.createUser(creationData);
            console.log(`>>> [TOOL RESULT][Branch ${branchId}] Novo usuário criado com ID: ${newUser.id}`);
            const { ...userData } = newUser.get({ plain: true });
            return JSON.stringify(userData);
        } catch (error) {
            console.error(`<<< [TOOL ERROR][Branch ${branchId}] Erro em create_user:`, error);
            return JSON.stringify({ error: error.message || "Erro interno ao criar usuário." });
        }
    },
    save_image_buffer: async ({ fileBuffer, originalFilename, mimetype }, branchId) => {
        console.log(`>>> [TOOL CALL][Branch ${branchId}] Executando: uploadService.saveImageBuffer para: ${originalFilename}`);
        try {
            if (!fileBuffer || typeof fileBuffer !== 'string' || !originalFilename || !mimetype) {
                 throw new Error("Dados da imagem incompletos (fileBuffer, originalFilename, mimetype).");
            }
            const base64Data = fileBuffer.split(';base64,').pop();
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            const savedFileInfo = await uploadService.saveImageBuffer(imageBuffer, originalFilename, mimetype);
            console.log(`>>> [TOOL RESULT][Branch ${branchId}] Imagem salva: ${savedFileInfo.fileName}`);
            return JSON.stringify(savedFileInfo);
        } catch (error) {
            console.error(`<<< [TOOL ERROR][Branch ${branchId}] Erro em save_image_buffer:`, error);
            return JSON.stringify({ error: error.message || "Erro interno ao salvar imagem." });
        }
    },
    // Adicione outras funções de ferramenta conforme necessário, sempre passando branchId
};

const getOrCreateThreadForChat = async (branchId, chatId) => {
    const mapKey = `${branchId}_${chatId}`;
    if (chatThreadMap[mapKey]) {
        console.log(`[MessageHandler] Thread existente encontrada para ${mapKey}: ${chatThreadMap[mapKey]}`);
        return chatThreadMap[mapKey];
    } else {
        console.log(`[MessageHandler] Nenhuma thread encontrada para ${mapKey}. Criando nova...`);
        try {
            const thread = await openai.beta.threads.create();
            chatThreadMap[mapKey] = thread.id;
            console.log(`[MessageHandler] Nova thread criada para ${mapKey}: ${thread.id}`);
            return thread.id;
        } catch (error) {
            console.error(`[MessageHandler] Erro ao criar thread para ${mapKey}:`, error);
            throw new Error("Não foi possível iniciar uma conversa com o assistente.");
        }
    }
};

const processOpenAIRun = async (threadId, runId, chatId, branchId, assistantIdToUse) => {
    try {
        let run = await openai.beta.threads.runs.retrieve(threadId, runId);

        while (['queued', 'in_progress', 'cancelling'].includes(run.status)) {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Aguarda um pouco
            console.log(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Run status: ${run.status}`);
            run = await openai.beta.threads.runs.retrieve(threadId, runId);
        }

        console.log(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Run final status: ${run.status}`);

        if (run.status === 'requires_action') {
            console.log(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Run requer ação (chamada de função).`);
            const toolOutputs = [];
            const requiredActions = run.required_action.submit_tool_outputs.tool_calls;

            for (const action of requiredActions) {
                const functionName = action.function.name;
                const functionArgs = JSON.parse(action.function.arguments || '{}');
                const toolCallId = action.id;

                console.log(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] -> Tentando executar ferramenta: ${functionName} com args:`, functionArgs);

                if (availableTools[functionName]) {
                    try {
                        // Passa branchId para a função da ferramenta
                        const output = await availableTools[functionName](functionArgs, branchId);
                        const outputString = typeof output === 'string' ? output : JSON.stringify(output);
                        toolOutputs.push({ tool_call_id: toolCallId, output: outputString });
                    } catch (toolError) {
                        console.error(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Erro ao executar ${functionName}:`, toolError);
                        toolOutputs.push({
                            tool_call_id: toolCallId,
                            output: JSON.stringify({ error: `Erro interno ao executar ${functionName}: ${toolError.message}` })
                        });
                    }
                } else {
                    console.warn(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Ferramenta ${functionName} não encontrada.`);
                    toolOutputs.push({
                        tool_call_id: toolCallId,
                        output: JSON.stringify({ error: `Função ${functionName} não disponível.` })
                    });
                }
            }

            if (toolOutputs.length > 0) {
                 console.log(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Submetendo ${toolOutputs.length} resultados de ferramentas...`);
                 await openai.beta.threads.runs.submitToolOutputs(threadId, run.id, { tool_outputs: toolOutputs });
                 return processOpenAIRun(threadId, run.id, chatId, branchId, assistantIdToUse); // Processa recursivamente
            } else {
                 console.warn(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Nenhuma ferramenta pôde ser executada.`);
                 await openai.beta.threads.runs.cancel(threadId, run.id);
                 throw new Error("Nenhuma ferramenta necessária pôde ser executada.");
            }

        } else if (run.status === 'completed') {
            console.log(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Run concluído. Buscando mensagens...`);
            const messages = await openai.beta.threads.messages.list(threadId, { limit: 1, order: 'desc' }); // Pega a última
            const lastMessage = messages.data[0];

            if (lastMessage && lastMessage.role === 'assistant' && lastMessage.content[0]?.type === 'text') {
                 const assistantResponse = lastMessage.content[0].text.value;
                 console.log(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Resposta do Assistente: ${assistantResponse}`);
                 return assistantResponse;
            } else {
                 console.warn(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Run completo, mas sem resposta válida do assistente.`);
                 throw new Error("O assistente concluiu mas não forneceu uma resposta de texto.");
            }
        } else {
            console.error(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Run falhou ou status inesperado: ${run.status}`);
            console.error('Detalhes do Run:', run);
            throw new Error(`A conversa com o assistente falhou (Status: ${run.status}). Último erro: ${run.last_error?.message || 'N/A'}`);
        }

    } catch (error) {
        console.error(`[MessageHandler][Branch ${branchId}][Chat ${chatId}] Erro durante processamento do Run ${runId}:`, error);
        throw error; // Relança para ser tratado pelo chamador
    }
};


const handleIncomingMessage = async (message, branchId, clientInstance) => {
    // Ignora mensagens do próprio bot (se aplicável, clientInstance.info.wid.user), de status ou não-chat
    if (message.fromMe || message.isStatus || message.type !== 'chat' && message.type !== 'image') return;

    const chatId = message.from; // Número do usuário final
    let userMessageContent = '';

    console.log(`[MessageHandler][Branch ${branchId}] Mensagem recebida de ${chatId}. Tipo: ${message.type}`);

    try {
        // Obter o ID do assistente: específico da filial ou o padrão
        const branch = await branchService.findBranchById(branchId);
        const assistantIdToUse = branch?.openaiAssistantIdOverride || DEFAULT_OPENAI_ASSISTANT_ID;

        if (!assistantIdToUse) {
            console.error(`[MessageHandler][Branch ${branchId}] ID do Assistente OpenAI não configurado (nem específico da filial, nem padrão). Não é possível processar a mensagem.`);
            await clientInstance.sendMessage(chatId, "Desculpe, o serviço de assistente não está configurado corretamente para esta unidade.");
            return;
        }
        
        const threadId = await getOrCreateThreadForChat(branchId, chatId);

        if (message.hasMedia && message.type === 'image') {
            console.log(`[MessageHandler][Branch ${branchId}] Mensagem com IMAGEM de ${chatId}. Baixando...`);
            const mediaData = await message.downloadMedia();

            if (mediaData) {
                console.log(`[MessageHandler][Branch ${branchId}] Mídia baixada. Mimetype: ${mediaData.mimetype}, Size: ${mediaData.data.length} bytes`);
                
                const saveToolArgs = {
                    fileBuffer: mediaData.data, // string base64
                    originalFilename: mediaData.filename || `whatsapp-image-${Date.now()}.${mediaData.mimetype.split('/')[1] || 'jpg'}`,
                    mimetype: mediaData.mimetype
                };
                
                // Chama a função de salvar imagem diretamente (simulando uma chamada de ferramenta pela IA, mas antes)
                const resultOutput = await availableTools.save_image_buffer(saveToolArgs, branchId);
                const result = JSON.parse(resultOutput);

                if (result.error) {
                    console.error(`[MessageHandler][Branch ${branchId}] Erro ao salvar imagem de ${chatId}: ${result.error}`);
                    await clientInstance.sendMessage(chatId, `Desculpe, houve um erro ao processar sua imagem: ${result.error}`);
                    return; // Interrompe o fluxo se o salvamento da imagem falhar
                } else {
                    console.log(`[MessageHandler][Branch ${branchId}] Imagem de ${chatId} salva: ${result.fileName}. Path: ${result.filePath}`);
                    // Informa a IA sobre a imagem salva.
                    // Opcional: Adicionar o corpo da mensagem (caption) se houver.
                    userMessageContent = `O usuário enviou uma imagem que foi salva como '${result.fileName}' (caminho no servidor: '${result.filePath}').`;
                    if (message.body) { // Se a imagem tiver uma legenda
                        userMessageContent += ` A legenda da imagem é: "${message.body}"`;
                    }
                    await message.reply(`Sua imagem foi recebida e salva como ${result.fileName}! Vou analisá-la.`); // Feedback para o usuário
                }
            } else {
                console.warn(`[MessageHandler][Branch ${branchId}] Falha ao baixar mídia de ${chatId}.`);
                await clientInstance.sendMessage(chatId, "Não consegui processar a imagem que você enviou. Tente novamente.");
                return;
            }
        } else if (message.type === 'chat') {
            userMessageContent = message.body;
        } else {
            console.log(`[MessageHandler][Branch ${branchId}] Tipo de mensagem ${message.type} não tratado. Ignorando.`);
            return;
        }

        if (!userMessageContent.trim()) {
            console.log(`[MessageHandler][Branch ${branchId}] Conteúdo da mensagem vazio para ${chatId}. Ignorando.`);
            return;
        }

        console.log(`[MessageHandler][Branch ${branchId}] Adicionando mensagem de ${chatId} à thread ${threadId}: "${userMessageContent.substring(0,100)}..."`);
        await openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: userMessageContent,
        });

        console.log(`[MessageHandler][Branch ${branchId}] Criando run com assistente ${assistantIdToUse} para thread ${threadId}...`);
        const run = await openai.beta.threads.runs.create(threadId, {
            assistant_id: assistantIdToUse,
        });
        console.log(`[MessageHandler][Branch ${branchId}] Run ${run.id} criado. Processando...`);

        const assistantResponse = await processOpenAIRun(threadId, run.id, chatId, branchId, assistantIdToUse);

        if (assistantResponse) {
            console.log(`[MessageHandler][Branch ${branchId}] Enviando resposta para ${chatId} via WhatsApp...`);
            await clientInstance.sendMessage(chatId, assistantResponse);
            console.log(`[MessageHandler][Branch ${branchId}] Resposta enviada para ${chatId}.`);
        } else {
            console.warn(`[MessageHandler][Branch ${branchId}] ProcessRun concluído sem uma resposta final para ${chatId}.`);
            // Talvez enviar uma mensagem padrão de "não entendi" ou "estou processando" se demorar muito.
        }

    } catch (error) {
        console.error(`[MessageHandler][Branch ${branchId}] Erro GERAL ao processar mensagem de ${chatId}:`, error);
        try {
            await clientInstance.sendMessage(chatId, "Desculpe, ocorreu um erro inesperado ao processar sua solicitação. Por favor, tente novamente mais tarde.");
        } catch (sendError) {
            console.error(`[MessageHandler][Branch ${branchId}] Falha CRÍTICA ao enviar mensagem de erro para ${chatId}:`, sendError);
        }
    }
};

module.exports = {
    handleIncomingMessage,
};