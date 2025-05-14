// src/utils/hikvisionApiHelper.js
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');
const fs = require('fs').promises;
const path = require('path');
// FormData não é mais necessário para uploadFaceImageToHikvision se usarmos curl
// const FormData = require('form-data');
const { exec } = require('child_process'); // Adicionado para usar curl

const HIK_BASE_URL = process.env.HIKVISION_API_URL || "http://2tokaps.dyndns.org:1024";
const HIK_USERNAME = process.env.HIKVISION_API_USERNAME || "admin";
const HIK_PASSWORD = process.env.HIKVISION_API_PASSWORD || "Solint2TOK!!";

if (!HIK_BASE_URL || !HIK_USERNAME || !HIK_PASSWORD) {
    console.error("ERRO FATAL: Credenciais ou URL da API Hikvision não definidas no .env!");
    // Considerar lançar um erro aqui ou sair do processo se for crítico
}

let hikClientInstance = null;

const getHikClient = async () => {
    if (!hikClientInstance) {
        try {
            const digestFetchModule = await import('digest-fetch');
            const DigestFetch = digestFetchModule.default || digestFetchModule;
            if (!HIK_USERNAME || !HIK_PASSWORD) {
                 console.error("[Hikvision API Helper] ERRO FATAL: Credenciais Hikvision não encontradas.");
                 throw new Error("Credenciais Hikvision não configuradas.");
            }
            console.log("[Hikvision API Helper] Inicializando cliente DigestFetch...");
            hikClientInstance = new DigestFetch(HIK_USERNAME, HIK_PASSWORD, { basic: false });
            console.log("[Hikvision API Helper] Cliente DigestFetch inicializado com sucesso.");
        } catch (err) {
            console.error("[Hikvision API Helper] ERRO FATAL: Falha ao importar ou inicializar DigestFetch:", err);
            throw new Error("Falha ao carregar o módulo de autenticação Digest.");
        }
    }
    return hikClientInstance;
};

const mapGenderToHikvision = (gender) => {
    const lowerGender = gender?.toLowerCase();
    if (lowerGender === 'masculino') return 'male';
    if (lowerGender === 'feminino') return 'female';
    return 'unknown';
};

const createUserInHikvision = async (user) => {
    const hikClient = await getHikClient();
    if (!HIK_BASE_URL) {
        throw new Error("Configuração da API Hikvision incompleta (URL base).");
    }
    if (!user || !user.employeeNo || !user.name) {
        throw new Error("Dados insuficientes do usuário para criar no Hikvision (employeeNo, name obrigatórios).");
    }
    const url = `${HIK_BASE_URL}/ISAPI/AccessControl/UserInfo/Record?format=json`;
    const payload = {
        UserInfo: {
            employeeNo: String(user.employeeNo),
            name: user.name,
            userType: "normal",
            Valid: {
                enable: true,
                beginTime: dayjs().format("YYYY-MM-DDTHH:mm:ss"),
                endTime: dayjs().add(10, 'year').format("YYYY-MM-DDTHH:mm:ss"),
                timeType: "local"
            },
            doorRight: "1",
            RightPlan: [{ doorNo: 1, planTemplateNo: "1" }],
            gender: mapGenderToHikvision(user.gender),
            localUIRight: false,
        }
    };
    console.log(`[Hikvision API] Tentando CRIAR usuário: ${user.employeeNo} (${user.name})`);
    console.log(`[Hikvision API] Payload UserInfo: ${JSON.stringify(payload)}`);
    try {
        const response = await hikClient.fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const responseData = await response.json();
        console.log(`[Hikvision API] Resposta CRIAR UserInfo (${response.status} ${response.statusText}):`, responseData);
        if (!response.ok || responseData.statusCode !== 1) {
             const errorMessage = `Falha ao criar usuário no Hikvision (${response.status} ${response.statusText}): ${responseData.statusString || responseData.subStatusCode || 'Erro desconhecido'}`;
            console.error(`[Hikvision API] ${errorMessage}`);
            console.error(`[Hikvision API] Detalhes: ${JSON.stringify(responseData)}`);
             throw new Error(errorMessage);
        }
        console.log(`[Hikvision API] Usuário ${user.employeeNo} (UserInfo) criado com sucesso.`);
        return responseData;
    } catch (error) {
        console.error(`[Hikvision API] Erro CRÍTICO na chamada de CRIAR usuário ${user.employeeNo} (UserInfo):`, error);
        throw new Error(`Erro na comunicação com Hikvision (Criação UserInfo): ${error.message || error}`);
    }
};

const uploadFaceImageToHikvision = async (employeeNo, imagePathOnServer) => {
    // getHikClient e FormData não são mais usados aqui.
    if (!HIK_BASE_URL) {
        throw new Error("Configuração da API Hikvision incompleta (URL base).");
    }
    if (!employeeNo) {
        throw new Error("employeeNo (FPID) é obrigatório para enviar dados da face.");
    }
    if (!imagePathOnServer) {
        throw new Error("Caminho da imagem é obrigatório para enviar dados da face.");
    }

    // Validar se a imagem existe antes de tentar usá-la com cURL
    const absoluteImagePathForCheck = path.join(process.cwd(), imagePathOnServer);
    try {
        await fs.access(absoluteImagePathForCheck); // Verifica se o arquivo existe e é acessível
        console.log(`[Hikvision API Face Upload with CURL] Imagem encontrada em: ${absoluteImagePathForCheck}`);
    } catch (err) {
        console.error(`[Hikvision API Face Upload with CURL] Erro ao acessar arquivo de imagem ${absoluteImagePathForCheck}:`, err);
        throw new Error(`Arquivo de imagem não encontrado ou inacessível em: ${absoluteImagePathForCheck}`);
    }
    
    // Para o comando cURL, é melhor usar o caminho absoluto diretamente.
    // Se imagePathOnServer já for absoluto, path.resolve não fará mal.
    // Se for relativo, path.resolve o tornará absoluto a partir do CWD.
    const absoluteImagePathForCurl = absoluteImagePathForCheck;

    const apiUrl = `${HIK_BASE_URL}/ISAPI/Intelligent/FDLib/FaceDataRecord?format=json`;

    const faceDataRecordPayload = {
        faceLibType: "blackFD",
        FDID: "1", // Certifique-se de que este é o FDID correto para sua configuração
        FPID: String(employeeNo)
    };

    // Escapa aspas duplas dentro do JSON para uso seguro no comando shell
    const faceDataRecordStringForCurl = JSON.stringify(faceDataRecordPayload).replace(/"/g, '\\"');

    // Construção do comando cURL
    // Usar aspas simples em volta dos argumentos do --form para permitir aspas duplas dentro do JSON
    // e para proteger caminhos de arquivo com espaços (embora seja melhor evitar espaços em caminhos para cURL se possível)
    // Adicionado --fail para que o cURL retorne um código de erro em caso de erro HTTP (4xx, 5xx)
    const command = `curl --digest --user "${HIK_USERNAME}:${HIK_PASSWORD}" \
--silent --show-error --fail --location "${apiUrl}" \
--form "FaceDataRecord=${faceDataRecordStringForCurl};type=application/json" \
--form "FaceImage=@${absoluteImagePathForCurl}"`; // COMENTÁRIO REMOVIDO DE DENTRO DA STRING

    console.log(`[Hikvision API Face Upload with CURL] Tentando ENVIAR FACE para employeeNo: ${employeeNo}`);
    
    // Log do comando omitindo a senha para segurança - CORRIGIDO para refletir a estrutura de 'command'
    const commandLog = `curl --digest --user "${HIK_USERNAME}:********" \
--silent --show-error --fail --location "${apiUrl}" \
--form "FaceDataRecord=${faceDataRecordStringForCurl};type=application/json" \
--form "FaceImage=@${absoluteImagePathForCurl}"`;
    console.log(`[Hikvision API Face Upload with CURL] Comando sendo executado (senha omitida): ${commandLog}`);

    return new Promise((resolve, reject) => {
        exec(command, { encoding: 'utf8' }, (error, stdout, stderr) => {
            // stderr pode conter informações úteis mesmo em caso de sucesso ou erros específicos do cURL
            if (stderr) {
                console.warn(`[Hikvision API Face Upload with CURL] Stderr para employeeNo ${employeeNo}: ${stderr.trim()}`);
            }

            if (error) {
                // error.message frequentemente inclui o stderr, o que é útil.
                // O código de saída do cURL também pode estar em error.code.
                // Com --fail, erros HTTP (4xx, 5xx) farão o cURL retornar um código de erro (geralmente 22).
                console.error(`[Hikvision API Face Upload with CURL] Erro ao executar cURL para ${employeeNo}. Código: ${error.code}. Mensagem: ${error.message}`);
                return reject(new Error(`Falha ao executar cURL para ${employeeNo} (código: ${error.code}): ${error.message.includes('badJsonFormat') ? 'badJsonFormat (verifique o payload JSON e a formatação da requisição)' : error.message}`));
            }

            // Se não houve erro no 'exec', stdout deve conter a resposta da API
            const trimmedStdout = stdout.trim();
            if (!trimmedStdout) {
                console.error(`[Hikvision API Face Upload with CURL] Resposta (stdout) vazia do cURL para ${employeeNo}.`);
                return reject(new Error(`Resposta vazia do Hikvision (via cURL) ao enviar face para ${employeeNo}. Stderr: ${stderr.trim()}`));
            }

            try {
                const responseData = JSON.parse(trimmedStdout);
                console.log(`[Hikvision API Face Upload with CURL] Resposta (parseada) para ${employeeNo}:`, responseData);

                // Verificar o statusCode da resposta da API Hikvision
                // Algumas APIs Hikvision usam statusCode 0 para sucesso em algumas operações.
                if (responseData && responseData.statusCode !== 1 && responseData.statusCode !== 0) {
                    const errorMessage = `Falha ao enviar face para Hikvision (via cURL) para ${employeeNo} (${responseData.statusString || responseData.subStatusCode || responseData.errorMsg || 'Erro desconhecido do Hikvision'})`;
                    console.error(`[Hikvision API Face Upload with CURL] ${errorMessage}. Detalhes: ${JSON.stringify(responseData)}`);
                    return reject(new Error(errorMessage));
                }

                console.log(`[Hikvision API Face Upload with CURL] Face para employeeNo ${employeeNo} enviada com sucesso.`);
                resolve(responseData);
            } catch (parseError) {
                console.error(`[Hikvision API Face Upload with CURL] Erro ao parsear resposta JSON do cURL para ${employeeNo}: ${parseError.message}`);
                console.error(`[Hikvision API Face Upload with CURL] Resposta bruta (stdout) que falhou no parse: ${trimmedStdout}`);
                reject(new Error(`Resposta não JSON do Hikvision (via cURL) ao enviar face para ${employeeNo}. Resposta: ${trimmedStdout.substring(0, 200)}...`));
            }
        });
    });
};

const deleteFaceFromHikvision = async (employeeNo, fdid = "1", faceLibType = "blackFD") => {
    const hikClient = await getHikClient();
    if (!HIK_BASE_URL) {
        throw new Error("Configuração da API Hikvision incompleta (URL base).");
    }
    if (!employeeNo) {
        throw new Error("employeeNo (FPID) é obrigatório para deletar a face no Hikvision.");
    }

    const url = `${HIK_BASE_URL}/ISAPI/Intelligent/FDLib/FDSearch/Delete?format=json&FDID=${fdid}&faceLibType=${faceLibType}`;
    const payload = {
        FPID: [{ value: String(employeeNo) }]
    };

    console.log(`[Hikvision API] Tentando DELETAR FACE para employeeNo: ${employeeNo} da FDID: ${fdid}, Type: ${faceLibType}`);
    console.log(`[Hikvision API] Payload DELETAR FACE: ${JSON.stringify(payload)}`);

    try {
        const response = await hikClient.fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        // A resposta de deleção pode não ser JSON ou pode variar.
        // É importante verificar o status da resposta.
        let responseDataText = await response.text();
        let responseData;
        try {
            responseData = JSON.parse(responseDataText);
        } catch (e) {
            // Se não for JSON, usamos o texto e o status para determinar o sucesso.
            if (!response.ok) {
                 console.error(`[Hikvision API] Falha ao deletar face (resposta não JSON). Status: ${response.status} ${response.statusText}. Resposta: ${responseDataText.substring(0,500)}`);
                 throw new Error(`Falha ao deletar face no Hikvision (${response.status} ${response.statusText}): ${responseDataText.substring(0,200)}`);
            }
            // Se response.ok e não JSON, pode ser um 200 OK sem corpo, o que é sucesso para algumas APIs de deleção.
            console.log(`[Hikvision API] Resposta DELETAR FACE (${response.status} ${response.statusText}) (resposta não JSON, mas OK): ${responseDataText.substring(0,500)}`);
            // Considerar sucesso se response.ok
             return { statusCode: response.status, statusString: response.statusText, responseText: responseDataText };
        }
        
        console.log(`[Hikvision API] Resposta DELETAR FACE (${response.status} ${response.statusText}):`, responseData);

        // O statusCode 1 geralmente significa sucesso para Hikvision.
        // Algumas APIs podem retornar 200 OK com statusCode diferente ou sem statusCode no JSON.
        if (!response.ok || (responseData.statusCode && responseData.statusCode !== 1)) {
            // Tratar casos onde a face/FPID não existe como "sucesso" para o fluxo de atualização.
            // O subStatusCode "faceDataNotExist" ou similar pode indicar isso.
            // A documentação (p.83) diz: "The device will not report an error if the face picture to be deleted is not added to the device."
            // Isso sugere que um 200 OK com statusCode 1 é esperado mesmo se a face não existir.
            // Se o statusCode for diferente de 1, ou !response.ok, então é um erro real.
            if (responseData.subStatusCode === 'faceDataNotExist' || responseData.subStatusCode === 'FDNotFind') {
                 console.warn(`[Hikvision API] Face para employeeNo ${employeeNo} não encontrada para deletar (já removida ou nunca existiu?). Considerando sucesso para o fluxo de atualização.`);
                 return responseData;
            }
            const errorMessage = `Falha ao deletar face no Hikvision (${response.status} ${response.statusText}): ${responseData.statusString || responseData.subStatusCode || 'Erro desconhecido'}`;
            console.error(`[Hikvision API] ${errorMessage}`);
            console.error(`[Hikvision API] Detalhes: ${JSON.stringify(responseData)}`);
            throw new Error(errorMessage);
        }
        console.log(`[Hikvision API] Face para employeeNo ${employeeNo} deletada com sucesso (ou já não existia).`);
        return responseData;
    } catch (error) {
        console.error(`[Hikvision API] Erro CRÍTICO na chamada de DELETAR FACE para ${employeeNo}:`, error);
        // Não relançar se o erro for porque a face não existe, para permitir que o upload prossiga.
        // Mas se for outro tipo de erro, pode ser necessário relançar.
        if (error.message && (error.message.includes('faceDataNotExist') || error.message.includes('FDNotFind'))) {
            console.warn(`[Hikvision API] Erro ao deletar face (não existente) para ${employeeNo} não interromperá o fluxo.`);
            return { statusString: "Face não existente, continuando."};
        }
        throw new Error(`Erro na comunicação com Hikvision (Deleção de Face): ${error.message || error}`);
    }
};


const deleteUserFromHikvision = async (employeeNo) => {
    const hikClient = await getHikClient();
    if (!HIK_BASE_URL) {
        throw new Error("Configuração da API Hikvision incompleta (URL base).");
    }
    if (!employeeNo) {
        throw new Error("employeeNo é obrigatório para deletar usuário no Hikvision.");
    }
    const url = `${HIK_BASE_URL}/ISAPI/AccessControl/UserInfo/Delete?format=json`;
    const payload = {
        UserInfoDelCond: {
            EmployeeNoList: [{ employeeNo: String(employeeNo) }]
        }
    };
    console.log(`[Hikvision API] Tentando DELETAR usuário: ${employeeNo}`);
    console.log(`[Hikvision API] Payload UserInfoDelete: ${JSON.stringify(payload)}`);
    try {
        const response = await hikClient.fetch(url, {
            method: 'PUT', // Geralmente DELETE, mas a API Hikvision pode usar PUT para esta operação
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const responseData = await response.json();
        console.log(`[Hikvision API] Resposta DELETAR UserInfo (${response.status} ${response.statusText}):`, responseData);
        if (!response.ok || responseData.statusCode !== 1) {
             if (responseData.subStatusCode === 'userNotExist' || (responseData.statusString && responseData.statusString.toLowerCase().includes('not exist'))) {
                 console.warn(`[Hikvision API] Usuário ${employeeNo} não encontrado para deletar (já removido ou nunca existiu?). Considerando sucesso.`);
                 return responseData; // Ou um objeto indicando que não existia
             }
            const errorMessage = `Falha ao deletar usuário no Hikvision (${response.status} ${response.statusText}): ${responseData.statusString || responseData.subStatusCode || 'Erro desconhecido'}`;
            console.error(`[Hikvision API] ${errorMessage}`);
            console.error(`[Hikvision API] Detalhes: ${JSON.stringify(responseData)}`);
            throw new Error(errorMessage);
        }
        console.log(`[Hikvision API] Usuário ${employeeNo} (UserInfo) deletado com sucesso.`);
        return responseData;
    } catch (error) {
        console.error(`[Hikvision API] Erro CRÍTICO na chamada de DELETAR usuário ${employeeNo} (UserInfo):`, error);
        throw new Error(`Erro na comunicação com Hikvision (Deleção UserInfo): ${error.message || error}`);
    }
};

module.exports = {
    createUserInHikvision,
    deleteUserFromHikvision,
    uploadFaceImageToHikvision,
    deleteFaceFromHikvision,
    generateEmployeeNo: () => uuidv4().split('-')[0], // Gera um ID mais curto
};