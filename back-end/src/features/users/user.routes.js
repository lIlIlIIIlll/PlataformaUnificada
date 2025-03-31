// src/features/users/user.routes.js

const express = require('express');
const userController = require('./user.controller'); // Importa o controller de usuário

// Cria uma instância do Router do Express específica para usuários
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gerenciamento e verificação de usuários
 */

/**
 * @swagger
 * /users/check-existence:
 *   get:
 *     summary: Verifica se um usuário existe pelo número do WhatsApp
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: whatsappNumber
 *         schema:
 *           type: string
 *         required: true
 *         description: Número do WhatsApp do usuário (formato E.164)
 *     responses:
 *       200:
 *         description: Retorna se o usuário existe ou não
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 exists:
 *                   type: boolean
 *                   example: true
 *       400:
 *         description: Número do WhatsApp não fornecido
 *       500:
 *         description: Erro interno do servidor
 */
router.get('/check-existence', userController.checkUserExistence);

/**
 * @swagger
 * /users:
 *   post:
 *     summary: Cria um novo usuário
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - whatsappNumber
 *               - cpf
 *               - dateOfBirth
 *               - photoUrl
 *             properties:
 *               name:
 *                 type: string
 *                 example: "João da Silva"
 *               whatsappNumber:
 *                 type: string
 *                 example: "+5511999998888"
 *               cpf:
 *                 type: string
 *                 example: "12345678900"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-12-31"
 *               photoUrl:
 *                 type: string
 *                 example: "https://example.com/photo.jpg"
 *               gender:
 *                 type: string
 *                 example: "Masculino"
 *               address:
 *                 type: string
 *                 example: "Rua Exemplo, 123, Bairro, Cidade - UF"
 *     responses:
 *       201:
 *         description: Usuário criado com sucesso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User' # Referencia um schema User (precisa ser definido)
 *       400:
 *         description: Dados inválidos ou campos obrigatórios faltando
 *       409:
 *         description: Conflito (CPF ou WhatsApp já cadastrado)
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/', userController.createUser);

/**
 * @swagger
 * /users/verify:
 *   post:
 *     summary: Verifica a identidade de um usuário (CPF/DataNasc) dado o WhatsApp
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - whatsappNumber
 *               - cpf
 *               - dateOfBirth
 *             properties:
 *               whatsappNumber:
 *                 type: string
 *                 example: "+5511999998888"
 *               cpf:
 *                 type: string
 *                 example: "12345678900"
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-12-31"
 *     responses:
 *       200:
 *         description: Identidade verificada, retorna dados do usuário
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User' # Referencia um schema User
 *       400:
 *         description: Campos obrigatórios faltando
 *       401:
 *         description: Falha na verificação (CPF ou Data de Nascimento não conferem)
 *       404:
 *         description: Usuário não encontrado para o número de WhatsApp fornecido
 *       500:
 *         description: Erro interno do servidor
 */
router.post('/verify', userController.verifyUserIdentity);

// Exporta o router configurado
module.exports = router;

// --- Definição do Schema User para Swagger (opcional, mas útil) ---
// Você normalmente colocaria isso em um arquivo de configuração do Swagger
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: ID único do usuário
 *           example: 1
 *         name:
 *           type: string
 *           description: Nome completo do usuário
 *           example: "Maria Oliveira"
 *         whatsappNumber:
 *           type: string
 *           description: Número do WhatsApp (identificador)
 *           example: "+5521987654321"
 *         cpf:
 *           type: string
 *           description: CPF do usuário
 *           example: "98765432100"
 *         dateOfBirth:
 *           type: string
 *           format: date
 *           description: Data de nascimento
 *           example: "1985-05-15"
 *         gender:
 *           type: string
 *           description: Gênero informado
 *           example: "Feminino"
 *         photoUrl:
 *           type: string
 *           description: URL da foto do usuário
 *           example: "https://example.com/maria.png"
 *         address:
 *           type: string
 *           description: Endereço do usuário
 *           example: "Avenida Principal, 456, Centro, Rio de Janeiro - RJ"
 *         isBlocked:
 *           type: boolean
 *           description: Indica se o usuário está bloqueado
 *           example: false
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Data de criação do registro
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Data da última atualização do registro
 */