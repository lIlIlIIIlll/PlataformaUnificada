// src/features/uploads/upload.routes.js
const express = require('express');
const uploadController = require('../uploads/upload.controller');
const uploadImageMiddleware = require('../../config/middlewares/uploadConfig'); // Importa a config do multer

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Uploads
 *   description: Endpoints para upload de arquivos
 */

/**
 * @swagger
 * /uploads/image:
 *   post:
 *     summary: Faz upload de uma única imagem
 *     tags: [Uploads]
 *     description: Envia um arquivo de imagem. O nome do campo no form-data deve ser 'imageFile'.
 *     consumes:
 *       - multipart/form-data
 *     parameters:
 *       - in: formData
 *         name: imageFile  # Este nome DEVE corresponder ao usado em uploadImageMiddleware.single()
 *         type: file
 *         required: true
 *         description: O arquivo de imagem para upload (tipos permitidos: JPEG, PNG, GIF, WEBP; limite 5MB).
 *     responses:
 *       201:
 *         description: Imagem enviada com sucesso. Retorna informações sobre o arquivo salvo.
 *         schema:
 *           type: object
 *           properties:
 *             message: { type: string, example: "Imagem enviada com sucesso!" }
 *             filePath: { type: string, example: "/uploads/images/imageFile-1678886400000-123456789.jpg" }
 *             fileName: { type: string, example: "imageFile-1678886400000-123456789.jpg" }
 *             originalName: { type: string, example: "minha_foto.jpg" }
 *             mimeType: { type: string, example: "image/jpeg" }
 *             size: { type: integer, example: 102400 }
 *       400:
 *         description: Requisição inválida (nenhum arquivo enviado, tipo inválido, arquivo muito grande).
 *         schema:
 *           type: object
 *           properties:
 *             message: { type: string }
 *       500:
 *         description: Erro interno do servidor durante o upload.
 */
router.post(
    '/image',
    uploadImageMiddleware.single('imageFile'), // Aplica o middleware multer para um único arquivo no campo 'imageFile'
    uploadController.uploadSingleImageHttp // Chama o controller após o upload
);

// Você pode adicionar outras rotas aqui (ex: upload de múltiplos arquivos, etc.)

module.exports = router;