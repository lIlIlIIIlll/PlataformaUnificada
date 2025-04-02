// src/features/payments/payment.routes.js
const express = require('express');
const paymentController = require('./payment.controller');
// const { authenticate, authorize } = require('../../middleware/auth'); // Example Auth Middleware

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Payments
 *   description: Gerenciamento de Registros de Pagamento
 */

// Apply authentication/authorization middleware (likely admin-focused)
// router.use(authenticate);
// router.use(authorize('admin')); // Most payment CRUD might be admin only

/**
 * @swagger
 * /payments:
 *   post:
 *     summary: Cria um novo registro de pagamento (uso interno/admin)
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentInput'
 *     responses:
 *       201: { description: Pagamento registrado, content: { application/json: { schema: { $ref: '#/components/schemas/Payment' } } } }
 *       400: { description: Dados inválidos (campos obrigatórios, reserva não encontrada, ENUM inválido) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       500: { description: Erro interno }
 */
router.post('/', /* authorize('admin'), */ paymentController.createPayment);

/**
 * @swagger
 * /payments:
 *   get:
 *     summary: Lista todos os registros de pagamento
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: reservationId
 *         schema: { type: integer }
 *         description: Filtra por ID da reserva
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [pending, completed, failed, refunded] }
 *         description: Filtra por status do pagamento
 *       - in: query
 *         name: paymentMethod
 *         schema: { type: string, enum: [pix, credit_card, debit_card] }
 *         description: Filtra por método de pagamento
 *       - in: query
 *         name: paymentType
 *         schema: { type: string, enum: [initial, extra_fee] }
 *         description: Filtra por tipo de pagamento
 *     responses:
 *       200: { description: Lista de pagamentos, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Payment' } } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       500: { description: Erro interno }
 */
router.get('/', /* authorize('admin'), */ paymentController.getAllPayments);

/**
 * @swagger
 * /payments/{id}:
 *   get:
 *     summary: Obtém um registro de pagamento específico pelo ID
 *     tags: [Payments]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Pagamento
 *     responses:
 *       200: { description: Dados do pagamento, content: { application/json: { schema: { $ref: '#/components/schemas/Payment' } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Pagamento não encontrado }
 *       500: { description: Erro interno }
 */
router.get('/:id', /* authorize('admin'), */ paymentController.getPaymentById);

/**
 * @swagger
 * /payments/{id}:
 *   put:
 *     summary: Atualiza um registro de pagamento (principalmente status)
 *     tags: [Payments]
 *     description: Usado para atualizar o status vindo de um webhook ou manualmente. Evite alterar outros campos.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Pagamento
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/PaymentUpdateInput'
 *     responses:
 *       200: { description: Pagamento atualizado, content: { application/json: { schema: { $ref: '#/components/schemas/Payment' } } } }
 *       400: { description: Dados inválidos (status inválido, nenhum campo válido) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Pagamento não encontrado }
 *       500: { description: Erro interno }
 */
router.put('/:id', /* authorize('admin'), */ paymentController.updatePayment); // Webhooks might hit a different, unprotected endpoint

/**
 * @swagger
 * /payments/{id}:
 *   delete:
 *     summary: Exclui um registro de pagamento (NÃO RECOMENDADO)
 *     tags: [Payments]
 *     description: ATENÇÃO! Excluir registros financeiros não é recomendado. Use com extrema cautela.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Pagamento a ser excluído
 *     responses:
 *       204: { description: Pagamento excluído com sucesso }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Pagamento não encontrado }
 *       409: { description: Conflito (ex: não é possível excluir pagamento concluído) }
 *       500: { description: Erro interno }
 */
router.delete('/:id', /* authorize('superadmin'), */ paymentController.deletePayment); // Restrict deletion severely


module.exports = router;

// --- Swagger Schema Definitions (Add to your central Swagger config) ---
/**
 * @swagger
 * components:
 *   schemas:
 *     PaymentInput:
 *       type: object
 *       required:
 *         - reservationId
 *         - amount
 *         - paymentType
 *         - paymentMethod
 *         - paymentGatewayId
 *       properties:
 *         reservationId:
 *           type: integer
 *           description: ID da reserva associada.
 *           example: 5
 *         amount:
 *           type: number
 *           format: float # Use float or double for decimal
 *           description: Valor do pagamento.
 *           example: 50.00
 *         paymentType:
 *           type: string
 *           enum: [initial, extra_fee]
 *           description: Tipo do pagamento.
 *           example: initial
 *         paymentMethod:
 *           type: string
 *           enum: [pix, credit_card, debit_card]
 *           description: Método de pagamento utilizado.
 *           example: pix
 *         paymentGatewayId:
 *           type: string
 *           description: ID da transação no gateway de pagamento.
 *           example: "pi_1I..."
 *         status:
 *           type: string
 *           enum: [pending, completed, failed, refunded]
 *           description: Status inicial (opcional, padrão 'pending').
 *           default: pending
 *           example: pending
 *
 *     PaymentUpdateInput:
 *        type: object
 *        properties:
 *          status:
 *            type: string
 *            enum: [pending, completed, failed, refunded]
 *            description: Novo status do pagamento.
 *            example: completed
 *          paymentGatewayId:
 *             type: string
 *             description: ID de transação do gateway (se precisar ser atualizado).
 *             example: "pi_1I..._confirmed"
 *
 *     Payment:
 *       type: object
 *       properties:
 *         id: { type: integer, readOnly: true }
 *         reservationId: { type: integer }
 *         amount: { type: number, format: float }
 *         paymentType: { type: string, enum: [initial, extra_fee] }
 *         paymentMethod: { type: string, enum: [pix, credit_card, debit_card] }
 *         paymentGatewayId: { type: string }
 *         status: { type: string, enum: [pending, completed, failed, refunded] }
 *         createdAt: { type: string, format: date-time, readOnly: true }
 *         updatedAt: { type: string, format: date-time, readOnly: true }
 *         reservation: # Included association example
 *            type: object
 *            readOnly: true
 *            properties:
 *              id: { type: integer }
 *              retrievalCode: { type: integer } # Example field from reservation
 *              # Add other relevant reservation fields if needed
 */