// src/features/hikvisions/hikvision.service.js
const { Hikvision, Branch } = require('../../index'); // Importa os modelos necessários
const { Op } = require('sequelize');
// const bcrypt = require('bcrypt'); // Importe bcrypt se for fazer hashing da senha aqui

// const SALT_ROUNDS = 10; // Custo do Hashing

/**
 * Cria um novo registro de dispositivo Hikvision.
 * @param {object} hikvisionData - Dados do dispositivo.
 * @param {number} hikvisionData.branchId - ID da filial.
 * @param {string} hikvisionData.name - Nome do dispositivo.
 * @param {string} hikvisionData.ipAddress - Endereço IP.
 * @param {number} hikvisionData.port - Porta.
 * @param {string} hikvisionData.username - Usuário.
 * @param {string} hikvisionData.password - Senha (texto plano - será hasheada).
 * @param {string} hikvisionData.serialNumber - Número de série.
 * @param {string} [hikvisionData.status='active'] - Status inicial.
 * @returns {Promise<Hikvision>} - O dispositivo criado.
 * @throws {Error} - Se validação falhar, filial não existir, ou S/N duplicado.
 */
const createHikvision = async (hikvisionData) => {
    const { branchId, name, ipAddress, port, username, password, serialNumber } = hikvisionData;

    // Validação básica de campos obrigatórios
    if (!branchId || !name || !ipAddress || !port || !username || !password || !serialNumber) {
        throw new Error('Campos obrigatórios faltando: branchId, name, ipAddress, port, username, password, serialNumber.');
    }

    try {
        // 1. Verificar se a filial existe
        const branch = await Branch.findByPk(branchId);
        if (!branch) {
            throw new Error(`Filial com ID ${branchId} não encontrada.`);
        }

        // 2. Verificar se o número de série já existe (deve ser único)
        const existingDevice = await Hikvision.findOne({ where: { serialNumber } });
        if (existingDevice) {
            throw new Error(`Dispositivo Hikvision com número de série '${serialNumber}' já cadastrado.`);
        }

        // 3. **IMPORTANTE: Hashear a senha antes de salvar!**
        // Implemente a lógica de hashing aqui ou use um hook no modelo.
        // const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
        const hashedPassword = password; // Placeholder - SUBSTITUA PELA SENHA HASHEADA

        // 4. Criar o registro
        const newHikvision = await Hikvision.create({
            ...hikvisionData,
            password: hashedPassword, // Salva a senha hasheada
            status: hikvisionData.status || 'active',
        });

        // Retornar com a filial associada, excluindo a senha
        return Hikvision.findByPk(newHikvision.id, {
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            attributes: { exclude: ['password'] }
        });

    } catch (error) {
        if (error.message.includes('não encontrada') || error.message.includes('já cadastrado') || error.message.includes('obrigatórios faltando')) {
            throw error; // Re-lança erros específicos de validação/negócio
        }
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
             // Captura erros de validação do Sequelize (ex: ENUM inválido, unique constraint)
            const messages = error.errors ? error.errors.map(e => e.message).join(', ') : error.message;
            throw new Error(`Erro de validação/constraint: ${messages}`);
        }
        console.error('Erro ao criar dispositivo Hikvision:', error);
        throw new Error('Não foi possível criar o dispositivo Hikvision.');
    }
};

/**
 * Busca todos os dispositivos Hikvision, com filtros opcionais.
 * @param {object} options - Opções de filtro.
 * @param {number} [options.branchId] - Filtrar por ID da filial.
 * @param {string} [options.status] - Filtrar por status.
 * @returns {Promise<Hikvision[]>} - Lista de dispositivos.
 */
const findAllHikvisions = async (options = {}) => {
    try {
        const whereClause = {};
        if (options.branchId) {
            whereClause.branchId = options.branchId;
        }
        if (options.status) {
            // Adicionar validação de ENUM se necessário
            whereClause.status = options.status;
        }

        const hikvisions = await Hikvision.findAll({
            where: whereClause,
            include: [{
                model: Branch,
                as: 'branch',
                attributes: ['id', 'name'] // Incluir info básica da filial
            }],
            attributes: { exclude: ['password'] }, // Nunca retornar a senha
            order: [['branchId', 'ASC'], ['name', 'ASC']]
        });
        return hikvisions;
    } catch (error) {
        console.error('Erro ao buscar todos os dispositivos Hikvision:', error);
        throw new Error('Erro ao consultar banco de dados para listar dispositivos Hikvision.');
    }
};

/**
 * Busca um dispositivo Hikvision pelo ID.
 * @param {number} id - ID do dispositivo.
 * @returns {Promise<Hikvision|null>} - O dispositivo encontrado ou null.
 */
const findHikvisionById = async (id) => {
    try {
        const hikvision = await Hikvision.findByPk(id, {
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            attributes: { exclude: ['password'] } // Excluir senha
        });
        return hikvision;
    } catch (error) {
        console.error(`Erro ao buscar dispositivo Hikvision por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar dispositivo Hikvision por ID.');
    }
};

/**
 * Atualiza um dispositivo Hikvision existente.
 * @param {number} id - ID do dispositivo a ser atualizado.
 * @param {object} updateData - Dados a serem atualizados.
 * @returns {Promise<Hikvision|null>} - O dispositivo atualizado ou null se não encontrado.
 * @throws {Error} - Se validação falhar, filial não existir, S/N duplicado.
 */
const updateHikvision = async (id, updateData) => {
    try {
        const hikvision = await Hikvision.findByPk(id);
        if (!hikvision) {
            return null; // Não encontrado
        }

        // Impedir atualização de campos sensíveis diretamente se necessário (ex: ID, branchId talvez?)
        delete updateData.id;
        delete updateData.createdAt;
        delete updateData.updatedAt;

        // Validar existência da Branch se o branchId estiver sendo alterado
        if (updateData.branchId && updateData.branchId !== hikvision.branchId) {
             const branch = await Branch.findByPk(updateData.branchId);
             if (!branch) {
                throw new Error(`Filial com ID ${updateData.branchId} não encontrada.`);
             }
        }

        // Validar unicidade do Serial Number se estiver sendo alterado
        if (updateData.serialNumber && updateData.serialNumber !== hikvision.serialNumber) {
            const existingDevice = await Hikvision.findOne({
                where: {
                    serialNumber: updateData.serialNumber,
                    id: { [Op.ne]: id } // Excluir o próprio registro da verificação
                }
            });
            if (existingDevice) {
                throw new Error(`Dispositivo Hikvision com número de série '${updateData.serialNumber}' já cadastrado.`);
            }
        }

        // Se a senha for fornecida, hashear antes de atualizar
        if (updateData.password) {
            // **IMPORTANTE: Hashear a nova senha!**
            // updateData.password = await bcrypt.hash(updateData.password, SALT_ROUNDS);
            updateData.password = updateData.password; // Placeholder - SUBSTITUA PELA SENHA HASHEADA
        } else {
            delete updateData.password; // Não atualiza a senha se não foi fornecida
        }

        // Validar status se fornecido
         if (updateData.status && !['active', 'inactive', 'maintenance', 'error'].includes(updateData.status)) {
             throw new Error(`Status inválido: ${updateData.status}`);
         }

        // Aplicar a atualização
        await hikvision.update(updateData);

        // Recarregar para retornar dados atualizados com a filial e sem a senha
        return Hikvision.findByPk(id, {
             include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
             attributes: { exclude: ['password'] }
        });

    } catch (error) {
        if (error.message.includes('não encontrada') || error.message.includes('já cadastrado') || error.message.includes('Status inválido')) {
            throw error; // Re-lança erros específicos
        }
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const messages = error.errors ? error.errors.map(e => e.message).join(', ') : error.message;
            throw new Error(`Erro de validação/constraint: ${messages}`);
        }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
             // Provavelmente erro ao tentar definir um branchId inválido
             throw new Error(`Erro de chave estrangeira: A filial com ID ${updateData.branchId} não foi encontrada.`);
         }
        console.error(`Erro ao atualizar dispositivo Hikvision (${id}):`, error);
        throw new Error('Erro interno ao atualizar dispositivo Hikvision.');
    }
};

/**
 * Deleta um dispositivo Hikvision pelo ID.
 * @param {number} id - ID do dispositivo a ser deletado.
 * @returns {Promise<boolean>} - True se deletado, false se não encontrado.
 * @throws {Error} - Se houver restrições (ex: logs associados).
 */
const deleteHikvision = async (id) => {
    try {
        const hikvision = await Hikvision.findByPk(id);
        if (!hikvision) {
            return false; // Não encontrado
        }

        // Adicionar verificações de dependências se necessário antes de deletar
        // Ex: Verificar se existem logs de acesso vinculados a este dispositivo
        // const relatedLogs = await hikvision.countAccessLogs(); // (se o método existir)
        // if (relatedLogs > 0) {
        //    throw new Error('Não é possível excluir dispositivo Hikvision com logs de acesso associados.');
        // }

        await hikvision.destroy();
        return true;
    } catch (error) {
        // if (error.message.includes('Não é possível excluir')) {
        //     throw error; // Deixa o controller tratar (409 Conflict)
        // }
         if (error.name === 'SequelizeForeignKeyConstraintError') {
            // Indica que outra tabela depende deste registro
            console.error(`Erro de FK ao deletar Hikvision (${id}):`, error);
            throw new Error('Não é possível excluir o dispositivo pois ele possui registros dependentes em outras tabelas.');
        }
        console.error(`Erro ao deletar dispositivo Hikvision (${id}):`, error);
        throw new Error('Erro interno ao deletar dispositivo Hikvision.');
    }
};

module.exports = {
    createHikvision,
    findAllHikvisions,
    findHikvisionById,
    updateHikvision,
    deleteHikvision,
};