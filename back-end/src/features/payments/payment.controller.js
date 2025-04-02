// src/features/payments/payment.controller.js
const paymentService = require('./payment.service');

const createPayment = async (req, res, next) => {
    try {
        // Input validation might happen here or in the service
        const newPayment = await paymentService.createPayment(req.body);
        res.status(201).json(newPayment);
    } catch (error) {
        // Handle specific errors from service
        if (error.message.includes('obrigatórios') || error.message.includes('inválido') || error.message.includes('não encontrada')) {
            return res.status(400).json({ message: error.message });
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
             return res.status(400).json({ message: `Reserva com ID ${req.body.reservationId} não encontrada.` });
         }
        next(error); // Pass other errors to global handler
    }
};

const getAllPayments = async (req, res, next) => {
    try {
        // Pass query params for filtering
        const payments = await paymentService.findAllPayments(req.query);
        res.status(200).json(payments);
    } catch (error) {
        next(error);
    }
};

const getPaymentById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const payment = await paymentService.findPaymentById(id);
        if (!payment) {
            return res.status(404).json({ message: 'Registro de pagamento não encontrado.' });
        }
        res.status(200).json(payment);
    } catch (error) {
        next(error);
    }
};

const updatePayment = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Ensure only allowed fields are passed (e.g., status)
        const updateData = {
            status: req.body.status,
            paymentGatewayId: req.body.paymentGatewayId // Allow updating this too?
        };

        // Remove undefined fields so service doesn't process them
         Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);


        const updatedPayment = await paymentService.updatePayment(id, updateData);
        if (!updatedPayment) {
            return res.status(404).json({ message: 'Pagamento não encontrado para atualização.' });
        }
        res.status(200).json(updatedPayment);
    } catch (error) {
        if (error.message.includes('inválido') || error.message.includes('Nenhum campo válido')) {
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

const deletePayment = async (req, res, next) => {
     console.warn(`API Request to DELETE payment ID: ${req.params.id}. Operation discouraged.`);
    try {
        const { id } = req.params;
        const deleted = await paymentService.deletePayment(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Pagamento não encontrado para exclusão.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
        // Handle specific errors e.g., cannot delete completed
        // if (error.message.includes('Não é possível excluir')) {
        //     return res.status(409).json({ message: error.message });
        // }
        next(error);
    }
};


module.exports = {
    createPayment,
    getAllPayments,
    getPaymentById,
    updatePayment,
    deletePayment,
};