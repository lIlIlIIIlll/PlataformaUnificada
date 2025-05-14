// src/features/lockers/locker.service.js
const { Locker, Branch, LockerReservation } = require('../../index'); // Import necessary models
const { Op } = require('sequelize');

/**
 * Creates a new locker.
 * @param {object} lockerData - Data for the new locker.
 * @param {number} lockerData.branchId - ID of the branch the locker belongs to.
 * @param {string} lockerData.lockerIdentifier - Unique identifier within the branch (e.g., A01).
 * @param {number|string} lockerData.deviceId - Physical device ID (eWeLink, etc.). Convert to required type if needed.
 * @param {string} [lockerData.status='available'] - Initial status.
 * @returns {Promise<Locker>} - The created locker instance.
 * @throws {Error} - If validation fails, branch doesn't exist, or identifier is duplicate.
 */
const createLocker = async (lockerData) => {
    const { branchId, lockerIdentifier, deviceId } = lockerData;
    if (!branchId || !lockerIdentifier || !deviceId) {
        throw new Error('branchId, lockerIdentifier, e deviceId são obrigatórios.');
    }

    try {
        // 1. Check if Branch exists
        const branch = await Branch.findByPk(branchId);
        if (!branch) {
            throw new Error(`Filial com ID ${branchId} não encontrada.`);
        }

        // 2. Check if lockerIdentifier is unique within the branch
        const existingLocker = await Locker.findOne({
            where: {
                branchId: branchId,
                lockerIdentifier: lockerIdentifier
            }
        });
        if (existingLocker) {
            throw new Error(`Identificador de armário '${lockerIdentifier}' já existe na filial ${branchId}.`);
        }

        // 3. Create the locker
        const newLocker = await Locker.create({
            branchId,
            lockerIdentifier,
            deviceId, // Ensure type matches model (BIGINT)
            status: lockerData.status || 'available', // Default status
        });

        // Optionally reload to include branch info
        return Locker.findByPk(newLocker.id, { include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] });


    } catch (error) {
        if (error.message.includes('não encontrada') || error.message.includes('já existe')) {
            throw error; // Re-throw specific validation/constraint errors
        }
         if (error.name === 'SequelizeValidationError') {
             // This might catch ENUM errors for status
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
        console.error('Erro ao criar armário:', error);
        throw new Error('Não foi possível criar o armário.');
    }
};

/**
 * Finds all lockers, optionally filtering by branch or status.
 * @param {object} options - Filter options.
 * @param {number} [options.branchId] - Filter by branch ID.
 * @param {string} [options.status] - Filter by status ('available', 'occupied', etc.).
 * @returns {Promise<Locker[]>} - Array of locker instances.
 */
const findAllLockers = async (options = {}) => {
    try {
        const whereClause = {};
        if (options.branchId) {
            whereClause.branchId = options.branchId;
        }
        if (options.status) {
            // You might want validation for the status enum here
            whereClause.status = options.status;
        }

        const lockers = await Locker.findAll({
            where: whereClause,
            include: [{
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name'] // Include basic branch info
            }],
            order: [
                ['branchId', 'ASC'],
                ['lockerIdentifier', 'ASC'] // Example ordering
            ]
        });
        return lockers;
    } catch (error) {
        console.error('Erro ao buscar todos os armários:', error);
        throw new Error('Erro ao consultar banco de dados para listar armários.');
    }
};

/**
 * Finds a locker by its ID.
 * @param {number} id - The ID of the locker.
 * @returns {Promise<Locker|null>} - The locker instance or null if not found.
 */
const findLockerById = async (id) => {
    try {
        const locker = await Locker.findByPk(id, {
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
            // Add include for Reservations if needed, but be cautious of data size
            // include: [
            //    { model: Branch, as: 'branch', attributes: ['id', 'name'] },
            //    { model: LockerReservation, as: 'reservations', through: { attributes: [] } /* Optional */ }
            // ]
        });
        return locker;
    } catch (error) {
        console.error(`Erro ao buscar armário por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar armário por ID.');
    }
};

/**
 * Updates an existing locker.
 * @param {number} id - The ID of the locker to update.
 * @param {object} updateData - Data to update.
 * @param {string} [updateData.lockerIdentifier] - New identifier (check uniqueness if changed).
 * @param {number|string} [updateData.deviceId] - New device ID.
 * @param {string} [updateData.status] - New status ('available', 'occupied', 'maintenance', 'reserved').
 * @param {number} [updateData.branchId] - New branch ID (handle carefully, check existence).
 * @returns {Promise<Locker|null>} - The updated locker or null if not found.
 */
const updateLocker = async (id, updateData) => {
    try {
        const locker = await Locker.findByPk(id);
        if (!locker) {
            return null; // Not found
        }

        // Prevent updating ID
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // Check uniqueness if lockerIdentifier or branchId is changing
        const needsUniquenessCheck = (updateData.lockerIdentifier && updateData.lockerIdentifier !== locker.lockerIdentifier) ||
                                    (updateData.branchId && updateData.branchId !== locker.branchId);

        if (needsUniquenessCheck) {
            const targetBranchId = updateData.branchId || locker.branchId;
            const targetIdentifier = updateData.lockerIdentifier || locker.lockerIdentifier;

             // Check if target branch exists if it's changing
            if (updateData.branchId && updateData.branchId !== locker.branchId) {
                 const branch = await Branch.findByPk(updateData.branchId);
                 if (!branch) {
                    throw new Error(`Filial com ID ${updateData.branchId} não encontrada.`);
                 }
            }

            const existingLocker = await Locker.findOne({
                where: {
                    branchId: targetBranchId,
                    lockerIdentifier: targetIdentifier,
                    id: { [Op.ne]: id } // Exclude the current locker
                }
            });
            if (existingLocker) {
                throw new Error(`Identificador de armário '${targetIdentifier}' já existe na filial ${targetBranchId}.`);
            }
        }

        // Validate status if provided
        if (updateData.status && !['available', 'occupied', 'maintenance', 'reserved'].includes(updateData.status)) {
             throw new Error(`Status inválido: ${updateData.status}`);
        }


        await locker.update(updateData);

         // Reload to get potentially updated branch info if branchId changed
        return Locker.findByPk(locker.id, { include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] });

    } catch (error) {
         if (error.message.includes('não encontrada') || error.message.includes('já existe') || error.message.includes('Status inválido')) {
            throw error; // Re-throw specific validation/constraint errors
        }
         if (error.name === 'SequelizeValidationError') {
             // This might catch ENUM errors for status
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
             // Should be caught by branch existence check above, but as a fallback
             throw new Error(`Erro de chave estrangeira: A filial com ID ${updateData.branchId} não foi encontrada.`);
         }
        console.error(`Erro ao atualizar armário (${id}):`, error);
        throw new Error('Erro interno ao atualizar armário.');
    }
};

/**
 * Deletes a locker by ID.
 * @param {number} id - The ID of the locker to delete.
 * @returns {Promise<boolean>} - True if deleted, false if not found.
 * @throws {Error} - If the locker has active reservations or dependencies.
 */
const deleteLocker = async (id) => {
    try {
        const locker = await Locker.findByPk(id);
        if (!locker) {
            return false; // Not found
        }

        // Check for active reservations associated with this locker
        // This requires checking the junction table or the reservations linked
         const reservationCount = await locker.countReservations({
             // Add where clause if needed, e.g., only count active/pending reservations
             // where: { paymentStatus: { [Op.in]: ['active', 'awaiting_retrieval', 'pending_payment']} }
         });

         if (reservationCount > 0) {
             throw new Error('Não é possível excluir o armário pois ele possui reservas associadas.');
         }

        await locker.destroy();
        return true;
    } catch (error) {
        if (error.message.includes('Não é possível excluir')) {
             throw error; // Let controller handle 409
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
           // Should be caught by the reservation check, but good fallback
            throw new Error('Não é possível excluir o armário devido a dependências.');
        }
        console.error(`Erro ao deletar armário (${id}):`, error);
        throw new Error('Erro interno ao deletar armário.');
    }
};


module.exports = {
    createLocker,
    findAllLockers,
    findLockerById,
    updateLocker,
    deleteLocker,
};