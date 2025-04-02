// src/features/branches/branch.routes.js
const express = require('express');
const branchController = require('./branch.controller');
// const { authenticate, authorize } = require('../../middleware/auth'); // Example Auth Middleware

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Gerenciamento de Filiais
 */

// Apply authentication/authorization middleware if needed
// router.use(authenticate); // Example: All branch routes require login
// router.use(authorize('admin')); // Example: All branch routes require admin role

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Cria uma nova filial
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: [] # Assuming JWT Bearer token auth
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/BranchInput' } } } }
 *     responses:
 *       201: { description: Filial criada, content: { application/json: { schema: { $ref: '#/components/schemas/Branch' } } } }
 *       400: { description: Dados inválidos }
 *       401: { description: Não autorizado }
 *       403: { description: Proibido (permissão insuficiente) }
 *       500: { description: Erro interno }
 */
router.post('/', branchController.createBranch); // Add middleware like authorize('admin') if needed

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: Lista todas as filiais
 *     tags: [Branches]
 *     parameters:
 *       - in: query
 *         name: include
 *         schema: { type: string, enum: [users, lockers, administrators] }
 *         description: Inclui associações (users, lockers, administrators)
 *     responses:
 *       200: { description: Lista de filiais, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Branch' } } } } }
 *       500: { description: Erro interno }
 */
router.get('/', branchController.getAllBranches); // Public or Authenticated? Add middleware as needed

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: Obtém uma filial específica pelo ID
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: integer }
 *         required: true
 *         description: ID da filial
 *       - in: query
 *         name: include
 *         schema: { type: string, enum: [users, lockers, administrators] }
 *         description: Inclui associações (users, lockers, administrators)
 *     responses:
 *       200: { description: Dados da filial, content: { application/json: { schema: { $ref: '#/components/schemas/Branch' } } } }
 *       404: { description: Filial não encontrada }
 *       500: { description: Erro interno }
 */
router.get('/:id', branchController.getBranchById);

/**
 * @swagger
 * /branches/{id}:
 *   put:
 *     summary: Atualiza uma filial existente
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer }, description: ID da filial }]
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/BranchInput' } } } }
 *     responses:
 *       200: { description: Filial atualizada, content: { application/json: { schema: { $ref: '#/components/schemas/Branch' } } } }
 *       400: { description: Dados inválidos }
 *       401: { description: Não autorizado }
 *       403: { description: Proibido }
 *       404: { description: Filial não encontrada }
 *       500: { description: Erro interno }
 */
router.put('/:id', branchController.updateBranch); // Add middleware

/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     summary: Exclui uma filial
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer }, description: ID da filial }]
 *     responses:
 *       204: { description: Filial excluída }
 *       401: { description: Não autorizado }
 *       403: { description: Proibido }
 *       404: { description: Filial não encontrada }
 *       409: { description: Conflito (filial possui dependências) }
 *       500: { description: Erro interno }
 */
router.delete('/:id', branchController.deleteBranch); // Add middleware

// --- Routes for managing Administrator associations ---

/**
 * @swagger
 * /branches/{branchId}/administrators/{administratorId}:
 *   post:
 *     summary: Associa um administrador a uma filial
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Filial
 *       - in: path
 *         name: administratorId
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Administrador
 *     responses:
 *       200: { description: Associação criada }
 *       401: { description: Não autorizado }
 *       403: { description: Proibido }
 *       404: { description: Filial ou Administrador não encontrado }
 *       409: { description: Associação já existe }
 *       500: { description: Erro interno }
 */
router.post('/:branchId/administrators/:administratorId', branchController.addAdministratorToBranch); // Add middleware

/**
 * @swagger
 * /branches/{branchId}/administrators/{administratorId}:
 *   delete:
 *     summary: Remove a associação de um administrador de uma filial
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Filial
 *       - in: path
 *         name: administratorId
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Administrador
 *     responses:
 *       200: { description: Associação removida }
 *       204: { description: Associação removida (alternativa) }
 *       401: { description: Não autorizado }
 *       403: { description: Proibido }
 *       404: { description: Filial, Administrador ou Associação não encontrada }
 *       500: { description: Erro interno }
 */
router.delete('/:branchId/administrators/:administratorId', branchController.removeAdministratorFromBranch); // Add middleware


module.exports = router;

// --- Swagger Schema Definitions ---
/**
 * @swagger
 * components:
 *   schemas:
 *     BranchInput:
 *       type: object
 *       properties:
 *         name: { type: string, example: "Filial Centro" }
 *         address: { type: string, example: "Rua Principal, 100", nullable: true }
 *       required:
 *         - name
 *     Branch:
 *       allOf:
 *         - $ref: '#/components/schemas/BranchInput'
 *         - type: object
 *           properties:
 *             id: { type: integer, readOnly: true }
 *             createdAt: { type: string, format: date-time, readOnly: true }
 *             updatedAt: { type: string, format: date-time, readOnly: true }
 *             users: { type: array, items: { $ref: '#/components/schemas/User' }, readOnly: true, description: "Incluído via ?include=users" }
 *             lockers: { type: array, items: { $ref: '#/components/schemas/Locker' }, readOnly: true, description: "Incluído via ?include=lockers" }
 *             administrators: { type: array, items: { $ref: '#/components/schemas/Administrator' }, readOnly: true, description: "Incluído via ?include=administrators" }
 */