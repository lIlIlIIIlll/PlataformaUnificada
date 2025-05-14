// src/features/reservations/locker_reservation.routes.js
const express = require('express');
const reservationController = require('./locker_reservation.controller');
// const { authenticate, authorize } = require('../../middleware/auth'); // Example Auth Middleware

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Reservations
 *   description: Gerenciamento de Reservas de Armários
 */

// Apply authentication middleware - most actions require login
// router.use(authenticate);

/**
 * @swagger
 * /reservations:
 *   post:
 *     summary: Cria uma nova reserva de armário
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: [] # User or Admin token
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ReservationInput'
 *     responses:
 *       201: { description: Reserva criada, content: { application/json: { schema: { $ref: '#/components/schemas/LockerReservation' } } } }
 *       400: { description: Dados inválidos (campos obrigatórios, usuário/filial não existe, usuário bloqueado) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       409: { description: Conflito (sem armários disponíveis) }
 *       500: { description: Erro interno }
 */
router.post('/', /* authenticate, */ reservationController.createReservation);

/**
 * @swagger
 * /reservations:
 *   get:
 *     summary: Lista reservas (usuário vê as suas, admin vê todas/filtradas)
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: userId
 *         schema: { type: integer }
 *         description: Filtra por ID do usuário (Admin only)
 *       - in: query
 *         name: branchId
 *         schema: { type: integer }
 *         description: Filtra por ID da filial
 *       - in: query
 *         name: paymentStatus
 *         schema: { type: string, enum: [pending_payment, active, awaiting_retrieval, completed, cancelled] }
 *         description: Filtra por status da reserva/pagamento
 *       # Add other filters like date ranges
 *     responses:
 *       200: { description: Lista de reservas, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/LockerReservation' } } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido (ex: user trying to access others') }
 *       500: { description: Erro interno }
 */
router.get('/', /* authenticate, */ reservationController.getAllReservations); // Add authorization logic in controller/service

/**
 * @swagger
 * /reservations/{id}:
 *   get:
 *     summary: Obtém detalhes de uma reserva específica pelo ID
 *     tags: [Reservations]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Reserva
 *     responses:
 *       200: { description: Dados da reserva, content: { application/json: { schema: { $ref: '#/components/schemas/LockerReservation' } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido (não é dono nem admin) }
 *       404: { description: Reserva não encontrada }
 *       500: { description: Erro interno }
 */
router.get('/:id', /* authenticate, */ reservationController.getReservationById); // Add authorization in controller

/**
 * @swagger
 * /reservations/{id}/status:
 *   put:
 *     summary: Atualiza o status de uma reserva (Admin/Sistema)
 *     tags: [Reservations]
 *     description: Endpoint para forçar a mudança de estado (ex: de webhook, painel admin). Valida a transição.
 *     security:
 *       - bearerAuth: [] # Likely Admin only
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Reserva
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [status]
 *             properties:
 *               status:
 *                 type: string
 *                 enum: [pending_payment, active, awaiting_retrieval, completed, cancelled]
 *                 description: O novo status desejado.
 *               timestamp:
 *                  type: string
 *                  format: date-time
 *                  description: (Opcional) Timestamp do evento que causou a mudança.
 *     responses:
 *       200: { description: Status da reserva atualizado, content: { application/json: { schema: { $ref: '#/components/schemas/LockerReservation' } } } }
 *       400: { description: Dados inválidos (status obrigatório, transição inválida, reserva não encontrada) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Reserva não encontrada }
 *       500: { description: Erro interno }
 */
router.put('/:id/status', /* authorize('admin'), */ reservationController.updateReservationStatus);

/**
 * @swagger
 * /reservations/{id}/cancel:
 *   post:
 *     summary: Cancela uma reserva (Usuário/Admin)
 *     tags: [Reservations]
 *     description: Define o status da reserva como 'cancelled' se permitido pelas regras.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Reserva a ser cancelada
 *     responses:
 *       200: { description: Reserva cancelada, content: { application/json: { schema: { $ref: '#/components/schemas/LockerReservation' } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido (não é dono nem admin) }
 *       404: { description: Reserva não encontrada }
 *       409: { description: Conflito (Não é possível cancelar no status atual) }
 *       500: { description: Erro interno }
 */
router.post('/:id/cancel', /* authenticate, */ reservationController.cancelReservation); // Auth check inside controller


/**
 * @swagger
 * /reservations/{id}:
 *   delete:
 *     summary: Exclui um registro de reserva (NÃO RECOMENDADO)
 *     tags: [Reservations]
 *     description: ATENÇÃO! Excluir registros de reserva não é recomendado. Use com extrema cautela (Admin only).
 *     security:
 *       - bearerAuth: [] # Admin/Superadmin only
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Reserva
 *     responses:
 *       204: { description: Reserva excluída com sucesso }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Reserva não encontrada }
 *       409: { description: Conflito (não pode excluir neste status ou com pagamentos) }
 *       500: { description: Erro interno }
 */
router.delete('/:id', /* authorize('superadmin'), */ reservationController.deleteReservation);


module.exports = router;

// --- Swagger Schema Definitions (Add to your central Swagger config) ---
/**
 * @swagger
 * components:
 *   schemas:
 *     ReservationInput:
 *       type: object
 *       required:
 *         - branchId
 *       properties:
 *         userId:
 *           type: integer
 *           description: ID do usuário (pode ser omitido se obtido do token de autenticação).
 *           example: 15
 *         branchId:
 *           type: integer
 *           description: ID da filial onde a reserva será feita.
 *           example: 1
 *         numberOfLockers:
 *           type: integer
 *           description: Quantidade de armários necessários (padrão 1).
 *           default: 1
 *           example: 1
 *
 *     LockerReservation:
 *       type: object
 *       properties:
 *         id: { type: integer, readOnly: true }
 *         userId: { type: integer }
 *         branchId: { type: integer }
 *         retrievalCode: { type: integer, description: "Código para retirada" }
 *         paymentStatus: { type: string, enum: [pending_payment, active, awaiting_retrieval, completed, cancelled] }
 *         depositTime: { type: string, format: date-time, nullable: true, description: "Quando o objeto foi depositado" }
 *         retrievalTime: { type: string, format: date-time, nullable: true, description: "Quando o objeto foi retirado" }
 *         initialCost: { type: number, format: float, description: "Custo base da reserva" }
 *         extraFee: { type: number, format: float, description: "Taxa extra cobrada" }
 *         totalPaid: { type: number, format: float, description: "Total efetivamente pago" }
 *         dueTime: { type: string, format: date-time, description: "Prazo para retirada sem taxa extra" }
 *         createdAt: { type: string, format: date-time, readOnly: true }
 *         updatedAt: { type: string, format: date-time, readOnly: true }
 *         user: { $ref: '#/components/schemas/User', readOnly: true, description: "Usuário associado" }
 *         branch: { $ref: '#/components/schemas/Branch', readOnly: true, description: "Filial associada" }
 *         lockers:
 *           type: array
 *           readOnly: true
 *           description: "Armários associados a esta reserva"
 *           items:
 *              type: object
 *              properties:
 *                  id: { type: integer }
 *                  lockerIdentifier: { type: string }
 *         payments:
 *            type: array
 *            readOnly: true
 *            description: "Pagamentos associados a esta reserva"
 *            items:
 *              $ref: '#/components/schemas/Payment'
 */