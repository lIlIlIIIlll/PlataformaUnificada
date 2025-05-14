// src/features/lockers/locker.routes.js
const express = require('express');
const lockerController = require('./locker.controller');
// const { authenticate, authorize } = require('../../middleware/auth'); // Example Auth Middleware

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Lockers
 *   description: Gerenciamento de Armários Físicos
 */

// Apply authentication/authorization middleware if needed
// router.use(authenticate); // Example: Require login
// router.use(authorize('admin')); // Example: Require admin role

/**
 * @swagger
 * /lockers:
 *   post:
 *     summary: Cria um novo armário
 *     tags: [Lockers]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LockerInput'
 *     responses:
 *       201: { description: Armário criado, content: { application/json: { schema: { $ref: '#/components/schemas/Locker' } } } }
 *       400: { description: Dados inválidos (campos obrigatórios, filial não encontrada, status inválido) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido (sem permissão) }
 *       409: { description: Conflito (Identificador já existe na filial) }
 *       500: { description: Erro interno }
 */
router.post('/', /* authorize('admin'), */ lockerController.createLocker);

/**
 * @swagger
 * /lockers:
 *   get:
 *     summary: Lista todos os armários
 *     tags: [Lockers]
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: integer }
 *         description: Filtra armários por ID da filial
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [available, occupied, maintenance, reserved] }
 *         description: Filtra armários por status
 *     responses:
 *       200: { description: Lista de armários, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Locker' } } } } }
 *       500: { description: Erro interno }
 */
router.get('/', /* authenticate, */ lockerController.getAllLockers); // Adjust auth as needed

/**
 * @swagger
 * /lockers/{id}:
 *   get:
 *     summary: Obtém um armário específico pelo ID
 *     tags: [Lockers]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Armário
 *     responses:
 *       200: { description: Dados do armário, content: { application/json: { schema: { $ref: '#/components/schemas/Locker' } } } }
 *       404: { description: Armário não encontrado }
 *       500: { description: Erro interno }
 */
router.get('/:id', /* authenticate, */ lockerController.getLockerById); // Adjust auth

/**
 * @swagger
 * /lockers/{id}:
 *   put:
 *     summary: Atualiza um armário existente
 *     tags: [Lockers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Armário
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LockerUpdateInput'
 *     responses:
 *       200: { description: Armário atualizado, content: { application/json: { schema: { $ref: '#/components/schemas/Locker' } } } }
 *       400: { description: Dados inválidos (filial não encontrada, status inválido) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Armário não encontrado }
 *       409: { description: Conflito (Identificador já existe na filial) }
 *       500: { description: Erro interno }
 */
router.put('/:id', /* authorize('admin'), */ lockerController.updateLocker);

/**
 * @swagger
 * /lockers/{id}:
 *   delete:
 *     summary: Exclui um armário
 *     tags: [Lockers]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Armário
 *     responses:
 *       204: { description: Armário excluído com sucesso }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Armário não encontrado }
 *       409: { description: Conflito (armário possui reservas associadas) }
 *       500: { description: Erro interno }
 */
router.delete('/:id', /* authorize('admin'), */ lockerController.deleteLocker);


module.exports = router;

// --- Swagger Schema Definitions (Add to your central Swagger config) ---
/**
 * @swagger
 * components:
 *   schemas:
 *     LockerInput:
 *       type: object
 *       required:
 *         - branchId
 *         - lockerIdentifier
 *         - deviceId
 *       properties:
 *         branchId:
 *           type: integer
 *           description: ID da filial onde o armário está localizado.
 *           example: 1
 *         lockerIdentifier:
 *           type: string
 *           description: Identificador único do armário dentro da filial (ex: A01).
 *           example: "B05"
 *         deviceId:
 *           type: integer # Or string depending on what eWeLink provides
 *           description: ID do dispositivo físico associado (eWeLink, etc.).
 *           example: 1000123456
 *         status:
 *           type: string
 *           enum: [available, occupied, maintenance, reserved]
 *           description: Status inicial do armário (opcional, padrão 'available').
 *           default: available
 *           example: available
 *
 *     LockerUpdateInput:
 *        type: object
 *        properties:
 *         branchId: { type: integer, description: "ID da nova filial (mover armário)" }
 *         lockerIdentifier: { type: string, description: "Novo identificador único na filial" }
 *         deviceId: { type: integer, description: "Novo ID do dispositivo físico" } # Or string
 *         status: { type: string, enum: [available, occupied, maintenance, reserved], description: "Novo status do armário" }
 *
 *     Locker:
 *       type: object
 *       properties:
 *         id: { type: integer, readOnly: true }
 *         branchId: { type: integer }
 *         lockerIdentifier: { type: string }
 *         deviceId: { type: integer } # Or string
 *         status: { type: string, enum: [available, occupied, maintenance, reserved] }
 *         createdAt: { type: string, format: date-time, readOnly: true }
 *         updatedAt: { type: string, format: date-time, readOnly: true }
 *         branch: # Included association example
 *            type: object
 *            readOnly: true
 *            properties:
 *              id: { type: integer }
 *              name: { type: string }
 *         # reservations: # Example if including reservations
 *         #   type: array
 *         #   readOnly: true
 *         #   items:
 *         #      $ref: '#/components/schemas/LockerReservation' # Define this schema later
 */