// src/features/administrators/administrator.routes.js
const express = require('express');
const administratorController = require('./administrator.controller');
// Import your authentication and authorization middleware
// const { authenticate, authorize } = require('../../middleware/auth'); // Example

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Administrators
 *   description: Gerenciamento de contas de Administrador do painel
 */

// --- Apply Authentication/Authorization Middleware ---
// Typically, all administrator routes should be protected
// router.use(authenticate); // Example: Require login for all admin routes
// router.use(authorize('superadmin')); // Example: Require a specific role (adjust role name)

/**
 * @swagger
 * /administrators:
 *   post:
 *     summary: Cria um novo administrador
 *     tags: [Administrators]
 *     security:
 *       - bearerAuth: [] # Indicate JWT authentication is needed
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdministratorInput'
 *     responses:
 *       201: { description: Administrador criado, content: { application/json: { schema: { $ref: '#/components/schemas/Administrator' } } } }
 *       400: { description: Dados inválidos (email, senha, nome obrigatórios) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido (sem permissão) }
 *       409: { description: Conflito (Email já cadastrado) }
 *       500: { description: Erro interno }
 */
router.post('/', /* authorize('superadmin'), */ administratorController.createAdministrator);

/**
 * @swagger
 * /administrators:
 *   get:
 *     summary: Lista todos os administradores
 *     tags: [Administrators]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: include
 *         schema: { type: string, enum: [branches] }
 *         description: Inclui filiais associadas
 *     responses:
 *       200: { description: Lista de administradores, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Administrator' } } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       500: { description: Erro interno }
 */
router.get('/', /* authorize('admin', 'superadmin'), */ administratorController.getAllAdministrators);

/**
 * @swagger
 * /administrators/{id}:
 *   get:
 *     summary: Obtém um administrador específico pelo ID
 *     tags: [Administrators]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Administrador
 *       - in: query
 *         name: include
 *         schema: { type: string, enum: [branches] }
 *         description: Inclui filiais associadas
 *     responses:
 *       200: { description: Dados do administrador, content: { application/json: { schema: { $ref: '#/components/schemas/Administrator' } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Administrador não encontrado }
 *       500: { description: Erro interno }
 */
router.get('/:id', /* authorize('admin', 'superadmin'), */ administratorController.getAdministratorById);

/**
 * @swagger
 * /administrators/{id}:
 *   put:
 *     summary: Atualiza um administrador existente
 *     tags: [Administrators]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Administrador
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/AdministratorUpdateInput'
 *     responses:
 *       200: { description: Administrador atualizado, content: { application/json: { schema: { $ref: '#/components/schemas/Administrator' } } } }
 *       400: { description: Dados inválidos }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Administrador não encontrado }
 *       409: { description: Conflito (Email já cadastrado por outro usuário) }
 *       500: { description: Erro interno }
 */
router.put('/:id', /* authorize('superadmin'), */ administratorController.updateAdministrator); // Or allow self-update with different logic

/**
 * @swagger
 * /administrators/{id}:
 *   delete:
 *     summary: Exclui um administrador
 *     tags: [Administrators]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Administrador
 *     responses:
 *       204: { description: Administrador excluído com sucesso }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido (ex: tentando excluir a si mesmo ou sem permissão) }
 *       404: { description: Administrador não encontrado }
 *       409: { description: Conflito (ex: admin associado a filiais e não pode ser excluído) }
 *       500: { description: Erro interno }
 */
router.delete('/:id', /* authorize('superadmin'), */ administratorController.deleteAdministrator);


module.exports = router;

// --- Swagger Schema Definitions (Add to your central Swagger config) ---
/**
 * @swagger
 * components:
 *   schemas:
 *     AdministratorInput:
 *       type: object
 *       required:
 *         - name
 *         - email
 *         - password
 *       properties:
 *         name:
 *           type: string
 *           example: "Admin Master"
 *         email:
 *           type: string
 *           format: email
 *           example: "admin@example.com"
 *         password:
 *           type: string
 *           format: password
 *           description: Senha (mínimo 6 caracteres)
 *           example: "strongPassword123"
 *
 *     AdministratorUpdateInput:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           example: "Admin Master Updated"
 *         email:
 *           type: string
 *           format: email
 *           example: "admin_updated@example.com"
 *         password:
 *           type: string
 *           format: password
 *           description: Nova senha (opcional, mínimo 6 caracteres)
 *           example: "newStrongPassword456"
 *
 *     Administrator:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           readOnly: true
 *           example: 1
 *         name:
 *           type: string
 *           example: "Admin Master"
 *         email:
 *           type: string
 *           format: email
 *           example: "admin@example.com"
 *         createdAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           readOnly: true
 *         branches:
 *           type: array
 *           readOnly: true
 *           description: "Incluído via ?include=branches"
 *           items:
 *             type: object
 *             properties:
 *              id: { type: integer }
 *              name: { type: string }
 *   securitySchemes: # Define if not already done
 *      bearerAuth:
 *          type: http
 *          scheme: bearer
 *          bearerFormat: JWT
 */