// src/features/payments/payment.service.js
const { Payment, LockerReservation } = require('../../index'); // Import necessary models
const { Op } = require('sequelize');

// Define allowed ENUM values for validation
const ALLOWED_PAYMENT_TYPES = ['initial', 'extra_fee'];
const ALLOWED_PAYMENT_METHODS = ['pix', 'credit_card', 'debit_card'];
const ALLOWED_PAYMENT_STATUSES = ['pending', 'completed', 'failed', 'refunded'];

/**
 * Creates a new payment record.
 * Typically triggered after initiating a payment process.
 * @param {object} paymentData - Data for the new payment.
 * @param {number} paymentData.reservationId - ID of the associated reservation.
 * @param {number} paymentData.amount - Payment amount (Decimal).
 * @param {string} paymentData.paymentType - 'initial' or 'extra_fee'.
 * @param {string} paymentData.paymentMethod - 'pix', 'credit_card', 'debit_card'.
 * @param {string} paymentData.paymentGatewayId - Transaction ID from the gateway.
 * @param {string} [paymentData.status='pending'] - Initial status.
 * @returns {Promise<Payment>} - The created payment instance.
 * @throws {Error} - If validation fails or reservation doesn't exist.
 */
const createPayment = async (paymentData) => {
    const { reservationId, amount, paymentType, paymentMethod, paymentGatewayId, status } = paymentData;

    // Basic validation
    if (!reservationId || amount === undefined || !paymentType || !paymentMethod || !paymentGatewayId) {
        throw new Error('reservationId, amount, paymentType, paymentMethod, e paymentGatewayId são obrigatórios.');
    }
    if (!ALLOWED_PAYMENT_TYPES.includes(paymentType)) {
        throw new Error(`paymentType inválido: ${paymentType}. Permitidos: ${ALLOWED_PAYMENT_TYPES.join(', ')}`);
    }
    if (!ALLOWED_PAYMENT_METHODS.includes(paymentMethod)) {
        throw new Error(`paymentMethod inválido: ${paymentMethod}. Permitidos: ${ALLOWED_PAYMENT_METHODS.join(', ')}`);
    }
    const currentStatus = status || 'pending';
    if (!ALLOWED_PAYMENT_STATUSES.includes(currentStatus)) {
        throw new Error(`Status inválido: ${currentStatus}. Permitidos: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`);
    }
     if (isNaN(parseFloat(amount)) || !isFinite(amount) || amount <= 0) {
        throw new Error('Amount deve ser um número positivo.');
    }


    try {
        // Check if reservation exists
        const reservation = await LockerReservation.findByPk(reservationId);
        if (!reservation) {
            throw new Error(`Reserva com ID ${reservationId} não encontrada.`);
        }

        // Create the payment
        const newPayment = await Payment.create({
            reservationId,
            amount,
            paymentType,
            paymentMethod,
            paymentGatewayId,
            status: currentStatus,
        });

        // Return with reservation details optionally
         return Payment.findByPk(newPayment.id, {
            include: [{ model: LockerReservation, as: 'reservation', attributes: ['id', 'retrievalCode'] }]
         });

    } catch (error) {
        if (error.message.includes('não encontrada') || error.message.includes('inválido') || error.message.includes('obrigatórios')) {
            throw error; // Re-throw specific validation/constraint errors
        }
        if (error.name === 'SequelizeValidationError') {
             // Should be caught by manual checks, but fallback
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
             // Should be caught by reservation check, but fallback
             throw new Error(`Erro de chave estrangeira: Reserva ${reservationId} não encontrada.`);
         }
        console.error('Erro ao criar pagamento:', error);
        throw new Error('Não foi possível criar o registro de pagamento.');
    }
};

/**
 * Finds all payments, optionally filtering.
 * @param {object} options - Filter options.
 * @param {number} [options.reservationId] - Filter by reservation ID.
 * @param {string} [options.status] - Filter by status.
 * @param {string} [options.paymentMethod] - Filter by payment method.
 * @param {string} [options.paymentType] - Filter by payment type.
 * @returns {Promise<Payment[]>} - Array of payment instances.
 */
const findAllPayments = async (options = {}) => {
    try {
        const whereClause = {};
        if (options.reservationId) {
            whereClause.reservationId = options.reservationId;
        }
        if (options.status && ALLOWED_PAYMENT_STATUSES.includes(options.status)) {
            whereClause.status = options.status;
        }
         if (options.paymentMethod && ALLOWED_PAYMENT_METHODS.includes(options.paymentMethod)) {
            whereClause.paymentMethod = options.paymentMethod;
        }
         if (options.paymentType && ALLOWED_PAYMENT_TYPES.includes(options.paymentType)) {
            whereClause.paymentType = options.paymentType;
        }
        // Add date range filters if needed

        const payments = await Payment.findAll({
            where: whereClause,
            include: [{
                model: LockerReservation,
                as: 'reservation',
                attributes: ['id', 'retrievalCode'] // Include basic reservation info
            }],
            order: [['createdAt', 'DESC']] // Example ordering
        });
        return payments;
    } catch (error) {
        console.error('Erro ao buscar todos os pagamentos:', error);
        throw new Error('Erro ao consultar banco de dados para listar pagamentos.');
    }
};

/**
 * Finds a payment by its ID.
 * @param {number} id - The ID of the payment.
 * @returns {Promise<Payment|null>} - The payment instance or null if not found.
 */
const findPaymentById = async (id) => {
    try {
        const payment = await Payment.findByPk(id, {
            include: [{ model: LockerReservation, as: 'reservation' }] // Include full reservation details if needed
        });
        return payment;
    } catch (error) {
        console.error(`Erro ao buscar pagamento por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar pagamento por ID.');
    }
};

/**
 * Updates an existing payment record.
 * Use primarily for updating STATUS based on gateway feedback (webhooks).
 * Avoid updating amount, type, method, reservationId after creation.
 * @param {number} id - The ID of the payment to update.
 * @param {object} updateData - Data to update.
 * @param {string} [updateData.status] - New status ('pending', 'completed', 'failed', 'refunded').
 * @param {string} [updateData.paymentGatewayId] - Update gateway ID if needed (e.g., confirmed ID).
 * @returns {Promise<Payment|null>} - The updated payment or null if not found.
 */
const updatePayment = async (id, updateData) => {
    try {
        const payment = await Payment.findByPk(id);
        if (!payment) {
            return null; // Not found
        }

        // Only allow updating specific fields (mainly status)
        const allowedUpdates = {};
        if (updateData.status) {
            if (!ALLOWED_PAYMENT_STATUSES.includes(updateData.status)) {
                 throw new Error(`Status inválido: ${updateData.status}. Permitidos: ${ALLOWED_PAYMENT_STATUSES.join(', ')}`);
            }
            allowedUpdates.status = updateData.status;
        }
        if (updateData.paymentGatewayId) { // Allow updating gateway ID if necessary
             allowedUpdates.paymentGatewayId = updateData.paymentGatewayId;
        }

        if (Object.keys(allowedUpdates).length === 0) {
            throw new Error("Nenhum campo válido fornecido para atualização (permitido: status, paymentGatewayId).");
        }


        await payment.update(allowedUpdates);
         return Payment.findByPk(payment.id, { // Reload to ensure data consistency
             include: [{ model: LockerReservation, as: 'reservation', attributes: ['id', 'retrievalCode'] }]
         });

    } catch (error) {
         if (error.message.includes('inválido') || error.message.includes('Nenhum campo válido')) {
            throw error; // Re-throw specific validation errors
        }
         if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
        console.error(`Erro ao atualizar pagamento (${id}):`, error);
        throw new Error('Erro interno ao atualizar pagamento.');
    }
};

/**
 * Deletes a payment record by ID.
 * WARNING: Use with extreme caution. Prefer changing status to 'failed' or 'refunded'.
 * @param {number} id - The ID of the payment to delete.
 * @returns {Promise<boolean>} - True if deleted, false if not found.
 */
const deletePayment = async (id) => {
     console.warn(`Tentativa de exclusão do pagamento ID: ${id}. Esta operação não é recomendada.`);
    try {
        const payment = await Payment.findByPk(id);
        if (!payment) {
            return false; // Not found
        }

        // Add checks here if certain statuses cannot be deleted (e.g., 'completed')
        // if (payment.status === 'completed') {
        //    throw new Error('Não é possível excluir um pagamento concluído.');
        // }

        await payment.destroy();
        return true;
    } catch (error) {
        // if (error.message.includes('Não é possível excluir')) {
        //     throw error; // Let controller handle 409
        // }
        console.error(`Erro ao deletar pagamento (${id}):`, error);
        throw new Error('Erro interno ao deletar pagamento.');
    }
};

module.exports = {
    createPayment,
    findAllPayments,
    findPaymentById,
    updatePayment,
    deletePayment, // Use with caution!
};