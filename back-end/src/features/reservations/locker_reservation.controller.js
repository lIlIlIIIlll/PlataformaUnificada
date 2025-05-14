// src/features/reservations/locker_reservation.controller.js
const reservationService = require('./locker_reservation.service');

const createReservation = async (req, res, next) => {
    try {
        // User ID might come from auth token (req.user.id) or body for admin creation
        const userId = req.user?.id || req.body.userId;
        const { branchId, numberOfLockers } = req.body;

        if (!userId) {
            return res.status(400).json({ message: 'userId é obrigatório (se não autenticado).' });
        }

        const reservationInput = { userId, branchId, numberOfLockers };
        const newReservation = await reservationService.createReservation(reservationInput);
        res.status(201).json(newReservation);
    } catch (error) {
         // Handle specific errors from service
        if (error.message.includes('obrigatórios') || error.message.includes('não encontrado') || error.message.includes('bloqueado') || error.message.includes('positivo')) {
            return res.status(400).json({ message: error.message });
        }
         if (error.message.includes('Não há') && error.message.includes('armários disponíveis')) {
             return res.status(409).json({ message: error.message }); // Conflict - no resources
         }
        next(error); // Pass other errors to global handler
    }
};

const getAllReservations = async (req, res, next) => {
    try {
        // Add filtering based on user role? Regular users see only their own?
        const queryOptions = { ...req.query };
        // if (req.user.role !== 'admin') { // Example authorization check
        //    queryOptions.userId = req.user.id;
        // }
        const reservations = await reservationService.findAllReservations(queryOptions);
        res.status(200).json(reservations);
    } catch (error) {
        next(error);
    }
};

const getReservationById = async (req, res, next) => {
    try {
        const { id } = req.params;
        const reservation = await reservationService.findReservationById(id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reserva não encontrada.' });
        }
         // Authorization check: Does req.user own this reservation or is admin?
         // if (req.user.role !== 'admin' && reservation.userId !== req.user.id) {
         //    return res.status(403).json({ message: 'Acesso proibido a esta reserva.' });
         // }
        res.status(200).json(reservation);
    } catch (error) {
        next(error);
    }
};

// Controller for general status update (might be admin-only or system-triggered)
const updateReservationStatus = async (req, res, next) => {
     try {
        const { id } = req.params;
        const { status } = req.body; // Get target status from body
        const context = { timestamp: req.body.timestamp }; // Optional context

        if (!status) {
             return res.status(400).json({ message: 'Novo status é obrigatório no corpo da requisição.' });
        }

        const updatedReservation = await reservationService.updateReservationStatus(id, status, context);
         // Note: findReservationById is called within the service after update
        if (!updatedReservation) {
             // Should be caught by service Pk find, but as safety
             return res.status(404).json({ message: 'Reserva não encontrada para atualização.' });
         }
        res.status(200).json(updatedReservation);
    } catch (error) {
        if (error.message.includes('inválid') || error.message.includes('não encontrada')) {
             // Status inválido, Transição inválida, Reserva não encontrada
            return res.status(400).json({ message: error.message });
        }
        next(error);
    }
};

// Specific controller for user/admin cancelling a reservation
const cancelReservation = async (req, res, next) => {
    try {
        const { id } = req.params;
        // Authorization check needed: Is user the owner or an admin?
        const reservation = await reservationService.findReservationById(id);
        if (!reservation) {
            return res.status(404).json({ message: 'Reserva não encontrada.' });
        }
         // if (req.user.role !== 'admin' && reservation.userId !== req.user.id) {
         //    return res.status(403).json({ message: 'Acesso proibido para cancelar esta reserva.' });
         // }

        const cancelledReservation = await reservationService.cancelReservation(id);
        res.status(200).json(cancelledReservation);
    } catch (error) {
         if (error.message.includes('Não é possível cancelar')) {
             return res.status(409).json({ message: error.message }); // Conflict - cannot perform action
         }
         if (error.message.includes('não encontrada')) {
             return res.status(404).json({ message: error.message });
         }
        next(error);
    }
};


const deleteReservation = async (req, res, next) => {
    console.warn(`API Request to DELETE reservation ID: ${req.params.id}. Operation discouraged.`);
    try {
        const { id } = req.params;
        // Add strict authorization - likely superadmin only
        const deleted = await reservationService.deleteReservation(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Reserva não encontrada para exclusão.' });
        }
        res.status(204).send(); // No Content
    } catch (error) {
         if (error.message.includes('Não é possível excluir') || error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(409).json({ message: error.message || 'Não é possível excluir a reserva devido a dependências ou status.' });
        }
        next(error);
    }
};


module.exports = {
    createReservation,
    getAllReservations,
    getReservationById,
    updateReservationStatus, // General status update endpoint
    cancelReservation,       // Specific cancellation action endpoint
    deleteReservation,
};