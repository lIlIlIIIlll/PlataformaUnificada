// src/features/uploads/upload.service.js
const fs = require('fs').promises; // Usar a versão baseada em Promises do fs
const path = require('path');

// Diretório onde as imagens serão salvas (mesmo definido no multer config)
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'images');

/**
 * Garante que o diretório de uploads exista.
 * É chamado uma vez quando o módulo é carregado.
 */
const ensureUploadDirExists = async () => {
    try {
        await fs.access(UPLOAD_DIR);
        console.log(`Diretório de upload já existe: ${UPLOAD_DIR}`);
    } catch (error) {
        if (error.code === 'ENOENT') {
            try {
                await fs.mkdir(UPLOAD_DIR, { recursive: true });
                console.log(`Diretório de upload criado em: ${UPLOAD_DIR}`);
            } catch (mkdirError) {
                console.error(`Erro crítico ao criar diretório de upload ${UPLOAD_DIR}:`, mkdirError);
                // Em um cenário real, talvez lançar um erro aqui para parar a aplicação
                // se o diretório for essencial e não puder ser criado.
                process.exit(1); // Exemplo: Sair se não conseguir criar
            }
        } else {
            console.error(`Erro ao verificar diretório de upload ${UPLOAD_DIR}:`, error);
             process.exit(1); // Sair em caso de outros erros inesperados de acesso
        }
    }
};

// Chama a função para garantir a existência do diretório quando o serviço é carregado
ensureUploadDirExists();


/**
 * Salva um buffer de imagem no disco de forma persistente.
 * Gera um nome de arquivo único.
 *
 * @param {Buffer} fileBuffer O buffer contendo os dados da imagem.
 * @param {string} originalFilename O nome original do arquivo (para obter a extensão).
 * @param {string} mimetype O mimetype do arquivo (para validação opcional).
 * @returns {Promise<object>} Um objeto com informações do arquivo salvo (filePath, fileName, etc.).
 * @throws {Error} Se ocorrer erro ao salvar ou se a validação falhar.
 */
const saveImageBuffer = async (fileBuffer, originalFilename, mimetype) => {
    // --- Validações Essenciais ---
    if (!Buffer.isBuffer(fileBuffer)) {
        throw new Error('Dados inválidos: fileBuffer deve ser um Buffer.');
    }
    if (!originalFilename || typeof originalFilename !== 'string') {
        throw new Error('Nome original do arquivo é inválido ou não fornecido.');
    }
     if (fileBuffer.length === 0) {
        throw new Error('Dados inválidos: O buffer da imagem não pode estar vazio.');
    }

    // --- Validação Opcional de Mimetype e Tamanho (Exemplo) ---
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
     if (!allowedMimes.includes(mimetype)) {
         console.warn(`Tentativa de salvar tipo de arquivo não suportado diretamente via service: ${mimetype}`);
         // Decida se quer lançar erro ou apenas logar
         // throw new Error(`Tipo de arquivo inválido: ${mimetype}. Apenas ${allowedMimes.join(', ')} são permitidos.`);
     }
     const maxSize = 1024 * 1024 * 5; // 5MB (mesmo limite do multer)
     if (fileBuffer.length > maxSize) {
         throw new Error(`Arquivo muito grande. Limite de ${maxSize / 1024 / 1024}MB.`);
     }
    // --- Fim Validações ---


    try {
        // Gera um nome de arquivo único (mesma lógica do multer config)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(originalFilename);
        const uniqueFilename = `direct-${uniqueSuffix}${extension}`; // Prefixo 'direct-' para diferenciar
        const destinationPath = path.join(UPLOAD_DIR, uniqueFilename);

        // Salva o buffer no arquivo
        await fs.writeFile(destinationPath, fileBuffer);
        console.log(`Imagem salva diretamente via service em: ${destinationPath}`);

        // Calcula o caminho relativo para acesso web
        const relativePath = `/uploads/images/${uniqueFilename}`;

        return {
            message: 'Imagem salva com sucesso via service!',
            filePath: relativePath,
            fileName: uniqueFilename,
            originalName: originalFilename,
            mimeType: mimetype,
            size: fileBuffer.length,
        };
    } catch (error) {
        console.error('Erro ao salvar buffer da imagem no disco:', error);
        throw new Error('Falha ao salvar a imagem no servidor.'); // Erro genérico para o chamador
    }
};

module.exports = {
    saveImageBuffer,
    // Você pode adicionar outras funções de serviço relacionadas a uploads aqui
    // Ex: deleteImage(filename), getImageInfo(filename), etc.
};