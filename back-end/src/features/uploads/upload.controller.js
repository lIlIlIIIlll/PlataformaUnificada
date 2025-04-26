// src/features/uploads/upload.controller.js
// Não precisamos mais importar o service aqui para esta função específica

/**
 * Controller para lidar com o upload de uma imagem via HTTP.
 * O middleware Multer (configurado em uploadConfig.js e usado na rota)
 * já salvou o arquivo no disco antes desta função ser chamada.
 * Esta função apenas formata a resposta de sucesso.
 * Responde à rota POST /uploads/image
 */
const uploadSingleImageHttp = (req, res, next) => {
    // Se chegamos aqui, o middleware multer não encontrou erros (tipo, tamanho)
    // e o arquivo foi salvo. req.file contém as informações.

    if (!req.file) {
        // Segurança extra, embora o multer deva ter tratado isso
        return res.status(400).json({ message: 'Nenhum arquivo foi processado. Verifique o nome do campo e o tipo do arquivo.' });
    }

    try {
        // Log que o arquivo foi recebido pela requisição HTTP
        console.log('Arquivo recebido via HTTP e salvo pelo Multer:', req.file);

        // Construir o caminho relativo para retornar ao cliente
        const relativePath = `/uploads/images/${req.file.filename}`;

        // Formatar a resposta de sucesso com os dados de req.file
        res.status(201).json({
            message: 'Imagem enviada com sucesso via HTTP!',
            filePath: relativePath,
            fileName: req.file.filename, // Nome do arquivo salvo pelo multer
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
        });

    } catch (error) {
        // Captura qualquer erro inesperado *nesta* função (improvável aqui)
        console.error("Erro no controller de upload APÓS o salvamento pelo multer:", error);
        next(error); // Passa para o handler global
    }
};

module.exports = {
    uploadSingleImageHttp, // Renomeado para clareza
};