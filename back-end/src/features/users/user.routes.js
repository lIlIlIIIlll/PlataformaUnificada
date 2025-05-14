// src/features/users/user.routes.js
const express = require('express');
const userController = require('./user.controller');

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: Gerenciamento e verificação de usuários finais
 */

// --- Existing Routes ---

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
 *         description: Número do WhatsApp do usuário (ex: +5511999998888)
 *     responses:
 *       200: { description: Retorna se o usuário existe, schema: { type: object, properties: { exists: { type: boolean } } } }
 *       400: { description: Número do WhatsApp não fornecido }
 *       500: { description: Erro interno do servidor }
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
 *             required: [name, whatsappNumber, cpf, dateOfBirth, photoPath, branchId, gender, address]
 *             properties:
 *               name: { type: string, example: "João da Silva" }
 *               whatsappNumber: { type: string, example: "+5511999998888" }
 *               cpf: { type: string, example: "12345678900" }
 *               dateOfBirth: { type: string, format: date, example: "1990-12-31" }
 *               photoPath: { type: string, example: "/path/to/photo.jpg or https://..." }
 *               branchId: { type: integer, example: 1 }
 *               gender: { type: string, example: "Masculino" }
 *               address: { type: string, example: "Rua Exemplo, 123" }
 *               isBlocked: { type: boolean, example: false, description: "(Opcional)" }
 *     responses:
 *       201: { description: Usuário criado, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
 *       400: { description: Dados inválidos ou campos obrigatórios faltando / Chave estrangeira inválida }
 *       409: { description: Conflito (CPF ou WhatsApp já cadastrado) }
 *       500: { description: Erro interno do servidor }
 */
router.post('/', userController.createUser);

/**
 * @swagger
 * /users/verify:
 *   post:
 *     summary: Verifica a identidade (CPF/DataNasc) dado o WhatsApp e retorna dados do usuário
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [whatsappNumber, cpf, dateOfBirth]
 *             properties:
 *               whatsappNumber: { type: string, example: "+5511999998888" }
 *               cpf: { type: string, example: "12345678900" }
 *               dateOfBirth: { type: string, format: date, example: "1990-12-31" }
 *     responses:
 *       200: { description: Identidade verificada, retorna dados do usuário, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
 *       400: { description: Campos obrigatórios faltando }
 *       401: { description: Falha na verificação (CPF ou Data de Nascimento não conferem) }
 *       404: { description: Usuário não encontrado para o WhatsApp fornecido }
 *       500: { description: Erro interno do servidor }
 */
router.post('/verify', userController.verifyUserIdentity);

// --- New CRUD Routes ---

/**
 * @swagger
 * /users:
 *   get:
 *     summary: Lista todos os usuários
 *     tags: [Users]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema:
 *           type: integer
 *         required: false
 *         description: Filtra usuários por ID da filial
 *     responses:
 *       200: { description: Lista de usuários, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/User' } } } } }
 *       500: { description: Erro interno do servidor }
 */
router.get('/', userController.getAllUsers);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     summary: Obtém um usuário específico pelo ID
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário
 *     responses:
 *       200: { description: Dados do usuário, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
 *       404: { description: Usuário não encontrado }
 *       500: { description: Erro interno do servidor }
 */
router.get('/:id', userController.getUserById);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     summary: Atualiza um usuário existente
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário a ser atualizado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties: # Somente campos atualizáveis
 *               name: { type: string }
 *               dateOfBirth: { type: string, format: date }
 *               gender: { type: string }
 *               address: { type: string }
 *               photoPath: { type: string }
 *               isBlocked: { type: boolean }
 *               branchId: { type: integer }
 *               # Não inclua CPF, whatsappNumber, etc. se não forem atualizáveis
 *     responses:
 *       200: { description: Usuário atualizado, content: { application/json: { schema: { $ref: '#/components/schemas/User' } } } }
 *       400: { description: Dados inválidos / Chave estrangeira inválida }
 *       404: { description: Usuário não encontrado }
 *       500: { description: Erro interno do servidor }
 */
router.put('/:id', userController.updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     summary: Exclui um usuário
 *     tags: [Users]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: ID do usuário a ser excluído
 *     responses:
 *       204: { description: Usuário excluído com sucesso }
 *       404: { description: Usuário não encontrado }
 *       409: { description: Conflito (usuário possui dependências, ex: reservas) }
 *       500: { description: Erro interno do servidor }
 */
router.delete('/:id', userController.deleteUser);


module.exports = router;

// --- Add Swagger Schema Definition (move to a central place ideally) ---
/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id: { type: integer, description: ID único do usuário }
 *         branchId: { type: integer, description: ID da filial }
 *         name: { type: string, description: Nome completo }
 *         whatsappNumber: { type: string, description: Número do WhatsApp }
 *         cpf: { type: string, description: CPF }
 *         dateOfBirth: { type: string, format: date, description: Data de nascimento }
 *         gender: { type: string, description: Gênero }
 *         address: { type: string, description: Endereço }
 *         isBlocked: { type: boolean, description: Se está bloqueado }
 *         photoPath: { type: string, description: Caminho/URL da foto }
 *         registeredAt: { type: string, format: date-time, description: Data de cadastro }
 *         lastLoginAt: { type: string, format: date-time, description: Data do último login }
 *         createdAt: { type: string, format: date-time }
 *         updatedAt: { type: string, format: date-time }
 *         branch: { # Exemplo se incluir associação
 *           type: object,
 *           properties: { id: { type: integer }, name: { type: string } }
 *         }
 */