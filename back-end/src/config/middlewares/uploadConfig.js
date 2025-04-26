// src/middleware/uploadConfig.js
const multer = require('multer');
const path = require('path');
const fs = require('fs'); // Usar fs síncrono aqui é aceitável, pois é na inicialização

// Diretório onde as imagens serão salvas
const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'images'); // Ajuste o caminho se necessário

// Garante que o diretório de uploads exista (Síncrono para simplicidade na config)
try {
    if (!fs.existsSync(UPLOAD_DIR)) {
        fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        console.log(`Diretório de upload criado (via multer config) em: ${UPLOAD_DIR}`);
    }
} catch (error) {
    console.error(`Erro CRÍTICO ao garantir diretório de upload ${UPLOAD_DIR} na config do multer:`, error);
    process.exit(1); // Parar se não conseguir criar o diretório essencial
}


// Configuração de armazenamento do Multer (continua igual)
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOAD_DIR);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        cb(null, 'http-' + file.fieldname + '-' + uniqueSuffix + extension); // Adicionado prefixo http-
    }
});

// Filtro (continua igual)
const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Tipo de arquivo inválido. Apenas imagens (JPEG, PNG, GIF, WEBP) são permitidas.'), false);
    }
};

// Instância do Multer (continua igual)
const uploadImage = multer({
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 * 5 // 5MB
    },
    fileFilter: fileFilter
});

module.exports = uploadImage; // Exporta o middleware configurado