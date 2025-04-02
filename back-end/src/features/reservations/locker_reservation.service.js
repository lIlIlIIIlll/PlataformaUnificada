// src/features/reservations/locker_reservation.service.js
const { LockerReservation, User, Branch, Locker, Payment, SQ: sequelize } = require('../../index'); // Import necessary models and Sequelize instance
const { Op } = require('sequelize');
const crypto = require('crypto'); // For generating retrieval code

// Define allowed ENUM values for validation
const ALLOWED_RESERVATION_STATUSES = ['pending_payment', 'active', 'awaiting_retrieval', 'completed', 'cancelled'];

// --- Helper Functions ---

/**
 * Generates a random, unique (within context) retrieval code.
 * @param {number} length - Number of digits for the code.
 * @returns {Promise<number>} - The generated code.
 */
const generateRetrievalCode = async (length = 6) => {
    // Simple random number generation. For production, ensure uniqueness more robustly
    // (e.g., check against active codes in DB within a transaction or use UUIDs).
    const max = Math.pow(10, length) - 1;
    const min = Math.pow(10, length - 1);
    let code;
    let exists = true;
    let attempts = 0;

    // Basic attempt to avoid immediate collision (not foolproof)
    while (exists && attempts < 10) {
        code = Math.floor(Math.random() * (max - min + 1)) + min;
        // In a real app, query the DB here to check if the code is currently active
        // const existing = await LockerReservation.findOne({ where: { retrievalCode: code, status: ['active', 'awaiting_retrieval'] } });
        // exists = !!existing;
        exists = false; // Placeholder - Implement DB check if needed
        attempts++;
    }
    if (attempts >= 10) {
         console.error("Failed to generate unique retrieval code after multiple attempts.");
         // Fallback or stronger generation method needed
         code = Date.now() % max; // Simple fallback
    }

    return code;
};

/**
 * Calculates the initial due time based on configuration (placeholder).
 * @param {Date} startTime - The time the reservation period starts (e.g., deposit time or creation time).
 * @returns {Date} - The calculated due time.
 */
const calculateDueTime = (startTime) => {
    // Placeholder: Get duration from settings (e.g., 24 hours)
    const durationHours = 24;
    const dueTime = new Date(startTime);
    dueTime.setHours(dueTime.getHours() + durationHours);
    return dueTime;
};

/**
 * Calculates the initial cost (placeholder).
 * @param {number} branchId
 * @param {number} numberOfLockers
 * @returns {Promise<number>} - The calculated cost.
 */
const calculateInitialCost = async (branchId, numberOfLockers) => {
    // Placeholder: Fetch base cost per locker from Branch settings or global settings
    const costPerLocker = 50.00; // Example fixed cost
    return costPerLocker * numberOfLockers;
};

// --- Core Service Functions ---

/**
 * Creates a new locker reservation.
 * Finds available lockers, calculates cost/due time, associates entities.
 * @param {object} reservationInput - Input data.
 * @param {number} reservationInput.userId - ID of the user making the reservation.
 * @param {number} reservationInput.branchId - ID of the branch.
 * @param {number} [reservationInput.numberOfLockers=1] - How many lockers are needed.
 * @returns {Promise<LockerReservation>} - The created reservation instance with associations.
 * @throws {Error} - If validation fails, user/branch not found, no lockers available, etc.
 */
const createReservation = async ({ userId, branchId, numberOfLockers = 1 }) => {
    if (!userId || !branchId) {
        throw new Error('userId e branchId são obrigatórios.');
    }
    if (numberOfLockers <= 0) {
         throw new Error('numberOfLockers deve ser positivo.');
    }

    const transaction = await sequelize.transaction(); // Start transaction

    try {
        // 1. Validate User and Branch
        const user = await User.findByPk(userId, { transaction });
        if (!user) {
            throw new Error(`Usuário com ID ${userId} não encontrado.`);
        }
        if (user.isBlocked) {
             throw new Error(`Usuário com ID ${userId} está bloqueado.`);
        }
        const branch = await Branch.findByPk(branchId, { transaction });
        if (!branch) {
            throw new Error(`Filial com ID ${branchId} não encontrada.`);
        }

        // 2. Find available Lockers
        const availableLockers = await Locker.findAll({
            where: {
                branchId: branchId,
                status: 'available'
            },
            limit: numberOfLockers,
            lock: transaction.LOCK.UPDATE, // Lock rows for update within transaction
            transaction
        });

        if (availableLockers.length < numberOfLockers) {
            throw new Error(`Não há ${numberOfLockers} armários disponíveis na filial ${branchId}. Encontrados: ${availableLockers.length}.`);
        }

        // 3. Prepare Reservation Data
        const retrievalCode = await generateRetrievalCode();
        const initialCost = await calculateInitialCost(branchId, numberOfLockers);
        // Deposit time TBD - Set when user physically deposits? Let's use creation time for now for dueTime calc.
        const creationTime = new Date();
        const dueTime = calculateDueTime(creationTime);

        // 4. Create Reservation Record
        const newReservation = await LockerReservation.create({
            userId,
            branchId,
            retrievalCode,
            paymentStatus: 'pending_payment', // Initial status
            // depositTime: null, // Set later?
            depositTime: creationTime, // Using creation time as placeholder start
            retrievalTime: null,
            initialCost,
            extraFee: 0.00,
            totalPaid: 0.00,
            dueTime,
        }, { transaction });

        // 5. Associate Lockers and Update their Status
        await newReservation.addLockers(availableLockers, { transaction });
        const lockerIds = availableLockers.map(l => l.id);
        await Locker.update(
            { status: 'reserved' }, // Change status to 'reserved' until deposit/payment? Or 'occupied'? Let's use 'reserved'.
            { where: { id: lockerIds }, transaction }
        );

        // --- Optional: Create Initial Pending Payment Record ---
        // Consider if this should be done here or when user initiates payment flow
        // const { createPayment } = require('../payments/payment.service'); // Avoid circular dependency if possible
        // await createPayment({
        //     reservationId: newReservation.id,
        //     amount: initialCost,
        //     paymentType: 'initial',
        //     paymentMethod: 'pix', // Or determine method later?
        //     paymentGatewayId: `pending_${newReservation.id}`, // Placeholder ID
        //     status: 'pending'
        // }, { transaction }); // Pass transaction if service supports it


        // 6. Commit Transaction
        await transaction.commit();

        // 7. Return the created reservation with associations
        return LockerReservation.findByPk(newReservation.id, {
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'whatsappNumber'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: Locker, as: 'lockers', attributes: ['id', 'lockerIdentifier'], through: { attributes: [] } },
                 // Include payments if created
                 // { model: Payment, as: 'payments' }
            ]
        });

    } catch (error) {
        await transaction.rollback(); // Rollback on error
        if (error.message.includes('não encontrado') || error.message.includes('bloqueado') || error.message.includes('Não há') || error.message.includes('obrigatórios')) {
            throw error; // Re-throw specific validation/constraint errors
        }
        console.error('Erro ao criar reserva:', error);
        throw new Error('Não foi possível criar a reserva.');
    }
};


/**
 * Finds all reservations, optionally filtering.
 * @param {object} options - Filter options.
 * @param {number} [options.userId]
 * @param {number} [options.branchId]
 * @param {string} [options.paymentStatus]
 * @param {Date} [options.dateFrom]
 * @param {Date} [options.dateTo]
 * @returns {Promise<LockerReservation[]>}
 */
const findAllReservations = async (options = {}) => {
    try {
        const whereClause = {};
        if (options.userId) whereClause.userId = options.userId;
        if (options.branchId) whereClause.branchId = options.branchId;
        if (options.paymentStatus && ALLOWED_RESERVATION_STATUSES.includes(options.paymentStatus)) {
            whereClause.paymentStatus = options.paymentStatus;
        }
        // Add date range filters on 'createdAt' or 'depositTime' if needed
        // if (options.dateFrom) whereClause.createdAt = { [Op.gte]: options.dateFrom };
        // if (options.dateTo) whereClause.createdAt = { ...whereClause.createdAt, [Op.lte]: options.dateTo };


        const reservations = await LockerReservation.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'user', attributes: ['id', 'name', 'whatsappNumber'] },
                { model: Branch, as: 'branch', attributes: ['id', 'name'] },
                { model: Locker, as: 'lockers', attributes: ['id', 'lockerIdentifier'], through: { attributes: [] } },
                // Optionally include payments, be mindful of data size
                 { model: Payment, as: 'payments', attributes: ['id', 'amount', 'status', 'paymentType'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        return reservations;
    } catch (error) {
        console.error('Erro ao buscar todas as reservas:', error);
        throw new Error('Erro ao consultar banco de dados para listar reservas.');
    }
};

/**
 * Finds a reservation by its ID.
 * @param {number} id - The ID of the reservation.
 * @returns {Promise<LockerReservation|null>}
 */
const findReservationById = async (id) => {
    try {
        const reservation = await LockerReservation.findByPk(id, {
            include: [
                 { model: User, as: 'user', attributes: { exclude: ['password', 'updatedAt'] } }, // Exclude sensitive fields
                { model: Branch, as: 'branch' },
                { model: Locker, as: 'lockers', through: { attributes: [] } },
                { model: Payment, as: 'payments' }
            ]
        });
        return reservation;
    } catch (error) {
        console.error(`Erro ao buscar reserva por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar reserva por ID.');
    }
};

/**
 * Updates the status of a reservation (State Machine Logic).
 * This should be the primary way to modify a reservation's lifecycle.
 * @param {number} id - Reservation ID.
 * @param {string} newStatus - The target status.
 * @param {object} [context={}] - Additional context (e.g., payment details, deposit confirmation time).
 * @param {Date} [context.timestamp] - Time of the event causing the status change.
 * @returns {Promise<LockerReservation>}
 * @throws {Error} - If transition is invalid or update fails.
 */
const updateReservationStatus = async (id, newStatus, context = {}) => {
     if (!ALLOWED_RESERVATION_STATUSES.includes(newStatus)) {
        throw new Error(`Status de atualização inválido: ${newStatus}`);
    }

    const transaction = await sequelize.transaction();
    try {
        const reservation = await LockerReservation.findByPk(id, {
             include: [{ model: Locker, as: 'lockers'}], // Need lockers to update their status
             transaction,
             lock: transaction.LOCK.UPDATE
            });
        if (!reservation) {
            throw new Error('Reserva não encontrada.');
        }

        const currentStatus = reservation.paymentStatus;
        const timestamp = context.timestamp || new Date();

        // --- State Transition Logic ---
        let updates = { paymentStatus: newStatus };
        let lockerStatusUpdate = null;

        switch (`${currentStatus}_to_${newStatus}`) {
            case 'pending_payment_to_active': // Payment confirmed (before deposit?)
                // Requires payment check elsewhere
                updates.totalPaid = reservation.initialCost; // Assuming full initial payment
                 // Maybe lockers become 'occupied' only after deposit? Let's keep 'reserved' for now.
                 lockerStatusUpdate = null; // Or 'occupied' if payment implies readiness
                break;

            case 'pending_payment_to_cancelled':
                 lockerStatusUpdate = 'available'; // Release reserved lockers
                break;

             case 'reserved_to_active': // Or maybe the flow is: pending_payment -> paid -> deposit -> active? Let's assume payment implies active for now
                // This state 'reserved' isn't in the ENUM, assumes intermediate internal state if needed
                 updates.depositTime = timestamp; // Record deposit time
                 lockerStatusUpdate = 'occupied';
                break;


            case 'active_to_awaiting_retrieval': // Service/process finished
                 // Nothing specific to update besides status? Maybe notify user?
                break;

            case 'awaiting_retrieval_to_completed': // User retrieved items
                 updates.retrievalTime = timestamp;
                 lockerStatusUpdate = 'available'; // Release occupied lockers
                 // Ensure totalPaid includes any extra fees (handled elsewhere)
                break;

             case 'awaiting_retrieval_to_pending_payment': // Overdue, requires extra fee
                 // This implies extra fee payment needed. Logic handled by payment flow.
                 // Status might not change here, but an extra fee payment record is created.
                 throw new Error("Mudança para 'pending_payment' por taxa extra deve ser tratada pelo fluxo de pagamento.");


             case 'awaiting_retrieval_to_cancelled': // Admin cancels overdue?
                  lockerStatusUpdate = 'available';
                 break;

            // Add other valid transitions (e.g., active_to_cancelled by admin?)

            default:
                if (currentStatus === newStatus) { // Allow setting same status? Maybe for idempotency?
                     console.warn(`Tentativa de atualizar reserva ${id} para o mesmo status: ${newStatus}`);
                     // break; // Or throw error if not allowed:
                     await transaction.rollback();
                     return reservation; // Or throw error below
                }
                throw new Error(`Transição de status inválida: de '${currentStatus}' para '${newStatus}'.`);
        }

        // Apply reservation updates
        await reservation.update(updates, { transaction });

        // Apply locker status updates if needed
        if (lockerStatusUpdate && reservation.lockers && reservation.lockers.length > 0) {
            const lockerIds = reservation.lockers.map(l => l.id);
            await Locker.update(
                { status: lockerStatusUpdate },
                { where: { id: lockerIds }, transaction }
            );
        }

        await transaction.commit();
        return findReservationById(id); // Return updated reservation with details

    } catch (error) {
        await transaction.rollback();
         if (error.message.includes('inválida') || error.message.includes('não encontrada')) {
            throw error;
        }
        console.error(`Erro ao atualizar status da reserva (${id}) para ${newStatus}:`, error);
        throw new Error('Erro interno ao atualizar status da reserva.');
    }
};


/**
 * Cancels a reservation (sets status to 'cancelled').
 * @param {number} id - Reservation ID.
 * @returns {Promise<LockerReservation>}
 */
const cancelReservation = async (id) => {
    // This is a specific case of updateReservationStatus
     // Add logic here to check *if* cancellation is allowed based on current status
     const reservation = await findReservationById(id);
      if (!reservation) throw new Error('Reserva não encontrada.');

      // Example rule: Only cancel if pending payment or maybe active (admin only?)
     if (!['pending_payment'/*, 'active', 'awaiting_retrieval'*/].includes(reservation.paymentStatus)) {
         throw new Error(`Não é possível cancelar a reserva no status atual: '${reservation.paymentStatus}'.`);
     }

    return updateReservationStatus(id, 'cancelled');
};


/**
 * Deletes a reservation record by ID.
 * WARNING: Use with extreme caution. Prefer changing status to 'cancelled'.
 * @param {number} id - ID of the reservation to delete.
 * @returns {Promise<boolean>} - True if deleted, false if not found.
 */
const deleteReservation = async (id) => {
    console.warn(`Tentativa de exclusão da reserva ID: ${id}. Operação não recomendada.`);
    const transaction = await sequelize.transaction();
    try {
        const reservation = await LockerReservation.findByPk(id, {
             include: [{ model: Locker, as: 'lockers'}], // Need lockers
             transaction,
             lock: transaction.LOCK.UPDATE
            });
        if (!reservation) {
             await transaction.rollback();
            return false; // Not found
        }

        // Define conditions under which deletion is allowed (e.g., only if 'cancelled' or 'completed')
        if (!['cancelled', 'completed'].includes(reservation.paymentStatus)) {
             throw new Error(`Não é possível excluir a reserva no status atual: '${reservation.paymentStatus}'. Cancele primeiro.`);
        }

        // Ensure associated payments are handled (maybe prevent deletion if payments exist?)
        const paymentCount = await reservation.countPayments({ transaction });
        if (paymentCount > 0) {
            // Decide whether to delete associated payments (BAD IDEA) or prevent reservation deletion
             throw new Error('Não é possível excluir reserva com registros de pagamento associados.');
        }

         // Release associated lockers IF they are still linked and marked as occupied/reserved by this logic
         // (They *should* be 'available' if status is completed/cancelled based on update logic)
         if (reservation.lockers && reservation.lockers.length > 0) {
             const lockerIds = reservation.lockers.map(l => l.id);
              // Double-check if lockers are indeed linked ONLY to this reservation before setting available
             await Locker.update(
                 { status: 'available' },
                 { where: { id: lockerIds /* Add more checks if needed */ }, transaction }
             );
             // Dissociate lockers explicitly before destroying reservation
             await reservation.removeLockers(reservation.lockers, { transaction });
         }


        await reservation.destroy({ transaction });
        await transaction.commit();
        return true;

    } catch (error) {
        await transaction.rollback();
        if (error.message.includes('Não é possível excluir') || error.name === 'SequelizeForeignKeyConstraintError') {
            // Let controller handle 409/400
             throw error;
        }
        console.error(`Erro ao deletar reserva (${id}):`, error);
        throw new Error('Erro interno ao deletar reserva.');
    }
};

module.exports = {
    createReservation,
    findAllReservations,
    findReservationById,
    updateReservationStatus, // Primary update method
    cancelReservation,       // Specific status update
    deleteReservation,       // Use with caution
};