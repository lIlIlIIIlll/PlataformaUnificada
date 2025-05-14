// src/features/users/user.service.js
const { User, Branch } = require('../../index'); // Import User and potentially Branch if needed
const { Op } = require('sequelize');
// const { v4: uuidv4 } = require('uuid'); // Não mais necessário aqui, pois o helper gera
const path = require('path'); // Para construir caminho absoluto da imagem
const fs = require('fs').promises; // Para verificar se o arquivo de imagem existe

// Importa as funções do helper Hikvision
const {
    createUserInHikvision,
    deleteUserFromHikvision,
    uploadFaceImageToHikvision,
    deleteFaceFromHikvision,
    generateEmployeeNo // Usaremos o gerador do helper
} = require('../../utils/hikvisionApiHelper'); // Ajuste o caminho se necessário

// --- Funções Originais do Serviço (sem alterações a partir daqui) ---

/**
 * Busca um usuário pelo número do WhatsApp.
 * @param {string} whatsappNumber - O número do WhatsApp.
 * @returns {Promise<User|null>}
 */
const findUserByWhatsappNumber = async (whatsappNumber) => {
    try {
        const user = await User.findOne({
            where: { whatsappNumber: whatsappNumber },
            // include: [{ model: Branch, as: 'branch' }] // Optionally include associated branch
        });
        return user;
    } catch (error) {
        console.error('Erro ao buscar usuário por WhatsApp:', error);
        throw new Error('Erro ao consultar banco de dados ao buscar por WhatsApp.');
    }
};

/**
 * Verifica a identidade de um usuário existente.
 * @param {string} whatsappNumber
 * @param {string} cpf
 * @param {string} dateOfBirth (YYYY-MM-DD).
 * @returns {Promise<User>}
 * @throws {Error}
 */
const verifyIdentityAndGetData = async (whatsappNumber, cpf, dateOfBirth) => {
    try {
        const user = await User.findOne({
            where: { whatsappNumber: whatsappNumber },
            // include: [{ model: Branch, as: 'branch' }] // Optionally include associated branch
        });

        if (!user) {
            throw new Error('Usuário não encontrado para este número de WhatsApp.');
        }

        const dbDate = user.dateOfBirth instanceof Date ? user.dateOfBirth.toISOString().split('T')[0] : user.dateOfBirth;
        const inputDate = dateOfBirth;

        if (user.cpf === cpf && dbDate === inputDate) {
            return user;
        } else {
            throw new Error('CPF ou Data de Nascimento inválidos.');
        }
    } catch (error) {
        if (error.message === 'Usuário não encontrado para este número de WhatsApp.' || error.message === 'CPF ou Data de Nascimento inválidos.') {
            throw error;
        }
        console.error('Erro ao verificar identidade do usuário:', error);
        throw new Error('Erro durante a verificação de identidade.');
    }
};

/**
 * Cria um novo usuário no banco de dados e na API Hikvision.
 * @param {object} userData
 * @returns {Promise<User>}
 * @throws {Error}
 */
const createUser = async (userData) => {
    if (!userData.name || !userData.whatsappNumber || !userData.cpf || !userData.dateOfBirth || !userData.photoPath || !userData.branchId || !userData.gender || !userData.address) {
        throw new Error('Erro de validação: Dados essenciais para criação do usuário estão faltando.');
    }

    const employeeNoToUse = userData.employeeNo || generateEmployeeNo();
    console.log(`[UserService:createUser] EmployeeNo a ser usado: ${employeeNoToUse} (Fornecido: ${!!userData.employeeNo}, Gerado: ${!userData.employeeNo})`);

    const existingEmployeeNo = await User.findOne({ where: { employeeNo: employeeNoToUse } });
    if (existingEmployeeNo) {
        console.error(`[UserService:createUser] ERRO: Conflito de EmployeeNo. O EmployeeNo '${employeeNoToUse}' já está em uso.`);
        throw new Error(`O EmployeeNo '${employeeNoToUse}' já está em uso.`);
    }
    console.log(`[UserService:createUser] EmployeeNo '${employeeNoToUse}' verificado como único.`);

    let newUserInDb;
    try {
        const existingUser = await User.findOne({
            where: {
                [Op.or]: [
                    { cpf: userData.cpf },
                    { whatsappNumber: userData.whatsappNumber }
                ]
            }
        });

        if (existingUser) {
            if (existingUser.cpf === userData.cpf) {
                throw new Error('CPF já cadastrado.');
            } else {
                throw new Error('Número de WhatsApp já cadastrado.');
            }
        }

        const creationData = {
            ...userData,
            employeeNo: employeeNoToUse,
            isBlocked: userData.isBlocked ?? false,
        };
        console.log(`[UserService:createUser] Dados prontos para criação no DB: ${JSON.stringify(Omit(creationData, ['photoPath']))}... photoPath omitido do log.`);

        newUserInDb = await User.create(creationData);
        console.log(`[UserService:createUser] SUCESSO NO DB: Usuário criado no banco de dados com ID: ${newUserInDb.id}, EmployeeNo: ${newUserInDb.employeeNo}`);

        // ----> INTEGRAÇÃO HIKVISION: Criação UserInfo <----
        if (newUserInDb && newUserInDb.isBlocked === false) {
            console.log(`[UserService:createUser] Tentando criar UserInfo no Hikvision para ${newUserInDb.employeeNo}...`);
            try {
                await createUserInHikvision(newUserInDb); // Passa o objeto completo do usuário do DB
                console.log(`[UserService:createUser] UserInfo para ${newUserInDb.employeeNo} criado/verificado no Hikvision.`);

                // ----> INTEGRAÇÃO HIKVISION: Upload da Face <----
                if (newUserInDb.photoPath) {
                    console.log(`[UserService:createUser] Tentando enviar FACE para Hikvision (EmployeeNo: ${newUserInDb.employeeNo}, ImagePath: ${newUserInDb.photoPath})`);
                    try {
                        // Verifica se o arquivo de imagem realmente existe antes de tentar enviar
                        const absoluteImagePath = path.join(process.cwd(), newUserInDb.photoPath);
                        await fs.access(absoluteImagePath); // Lança erro se não existir
                        
                        await uploadFaceImageToHikvision(newUserInDb.employeeNo, newUserInDb.photoPath);
                        console.log(`[UserService:createUser] Upload da FACE para ${newUserInDb.employeeNo} bem-sucedido (ou já existia).`);
                    } catch (faceUploadError) {
                        console.error(`[UserService:createUser] FALHA no upload da FACE para ${newUserInDb.employeeNo} no Hikvision: ${faceUploadError.message}. O usuário UserInfo PODE ter sido criado.`);
                        // Não relançar o erro aqui para não reverter a criação do usuário no DB,
                        // mas o log é importante para diagnóstico.
                    }
                } else {
                    console.warn(`[UserService:createUser] Usuário ${newUserInDb.employeeNo} não possui photoPath. Pulando upload da face.`);
                }
                // ----> FIM INTEGRAÇÃO HIKVISION FACE <----

            } catch (hikvisionUserInfoError) {
                console.error(`[UserService:createUser] FALHA ao criar UserInfo ${newUserInDb.employeeNo} no Hikvision: ${hikvisionUserInfoError.message}. O usuário FOI criado no banco de dados.`);
                // Não relançar, pois o usuário já está no DB.
            }
        } else if (newUserInDb && newUserInDb.isBlocked === true) {
            console.log(`[UserService:createUser] Usuário ${newUserInDb.employeeNo} criado como bloqueado, não será adicionado ao Hikvision por enquanto.`);
        }
        // ----> FIM INTEGRAÇÃO HIKVISION UserInfo <----

        return newUserInDb;

    } catch (error) {
        if (!newUserInDb) {
            console.error('[UserService:createUser] Erro ANTES de criar usuário no banco de dados:', error);
            if (error.message === 'CPF já cadastrado.' || error.message === 'Número de WhatsApp já cadastrado.' || error.message.startsWith('Erro de validação') || error.message.startsWith('O EmployeeNo')) {
                throw error;
            }
            if (error.name === 'SequelizeValidationError') {
                throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
            }
            if (error.name === 'SequelizeForeignKeyConstraintError') {
                throw new Error(`Erro de chave estrangeira: A filial com ID ${userData.branchId} não foi encontrada.`);
            }
            throw new Error('Não foi possível iniciar a criação do usuário devido a um erro interno.');
        } else {
            console.error(`[UserService:createUser] Erro APÓS criar usuário ${newUserInDb.id} no DB (possivelmente na integração Hikvision - ver logs anteriores):`, error.message);
            return newUserInDb; // Retorna o usuário do DB mesmo com falha na integração
        }
    }
};

/**
 * Busca todos os usuários (com filtros opcionais).
 * @param {object} options - Opções de filtro (e.g., { branchId: 1 })
 * @returns {Promise<User[]>}
 */
const findAllUsers = async (options = {}) => {
    try {
        const whereClause = {};
        if (options.branchId) {
            whereClause.branchId = options.branchId;
        }
        if (options.search) {
            whereClause[Op.or] = [
                { name: { [Op.like]: `%${options.search}%` } },
                { cpf: { [Op.like]: `%${options.search}%` } },
                { whatsappNumber: { [Op.like]: `%${options.search}%` } },
                { employeeNo: { [Op.like]: `%${options.search}%` } },
            ];
        }
        if (typeof options.isBlocked === 'boolean' || (typeof options.isBlocked === 'string' && ['true', 'false'].includes(options.isBlocked))) {
            whereClause.isBlocked = String(options.isBlocked) === 'true';
        }


        const users = await User.findAll({
            where: whereClause,
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }],
            attributes: { exclude: ['updatedAt'] }, // Excluir updatedAt se não for usado no frontend
            order: [['name', 'ASC']], // Ordenar por nome por padrão
        });
        return users;
    } catch (error) {
        console.error('Erro ao buscar todos os usuários:', error);
        throw new Error('Erro ao consultar banco de dados para listar usuários.');
    }
};

/**
 * Busca um usuário pelo ID.
 * @param {number} id - ID do usuário.
 * @returns {Promise<User|null>}
 */
const findUserById = async (id) => {
    try {
        const user = await User.findByPk(id, {
            include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }]
        });
        return user;
    } catch (error) {
        console.error(`Erro ao buscar usuário por ID (${id}):`, error);
        throw new Error('Erro ao consultar banco de dados ao buscar usuário por ID.');
    }
};

/**
 * Atualiza um usuário existente.
 * @param {number} id - ID do usuário.
 * @param {object} userData - Dados para atualizar.
 * @returns {Promise<User|null>}
 */
const updateUser = async (id, userData) => {
    let user;
    try {
        user = await User.findByPk(id);
        if (!user) {
            return null;
        }

        const originalIsBlocked = user.isBlocked;
        const employeeNo = user.employeeNo;
        const originalPhotoPath = user.photoPath; // Salva o caminho da foto original

        console.log(`[UserService:updateUser] Atualizando usuário ID: ${id}. Estado original isBlocked: ${originalIsBlocked}, EmployeeNo: ${employeeNo}`);

        // Campos que não devem ser atualizados diretamente por esta rota
        delete userData.id;
        delete userData.cpf;
        delete userData.whatsappNumber;
        delete userData.registeredAt;
        delete userData.createdAt;
        delete userData.updatedAt;
        delete userData.employeeNo; // employeeNo não deve ser alterado após criação

        await user.update(userData);
        await user.reload(); // Recarrega para ter os dados mais recentes do DB
        console.log(`[UserService:updateUser] Usuário ID: ${id} atualizado no DB. Novo isBlocked: ${user.isBlocked}, Novo photoPath: ${user.photoPath}`);

        // ----> INTEGRAÇÃO HIKVISION: Atualização de Bloqueio e Face <----
        if (employeeNo) { // Só interage com Hikvision se houver employeeNo
            // 1. Lógica de Bloqueio/Desbloqueio
            if ('isBlocked' in userData && user.isBlocked !== originalIsBlocked) {
                console.log(`[UserService:updateUser] Mudança detectada em isBlocked para usuário ${employeeNo}.`);
                try {
                    if (user.isBlocked === true) {
                        console.log(`[UserService:updateUser] Usuário ${employeeNo} foi bloqueado. Chamando deleteUserFromHikvision...`);
                        await deleteUserFromHikvision(employeeNo);
                    } else {
                        console.log(`[UserService:updateUser] Usuário ${employeeNo} foi desbloqueado. Chamando createUserInHikvision (para recriar/habilitar)...`);
                        await createUserInHikvision(user); // Recria/habilita o usuário UserInfo
                        // Se desbloqueado E a foto existe, tenta (re)enviar a face
                        if (user.photoPath) {
                             console.log(`[UserService:updateUser] Tentando (re)enviar FACE para ${employeeNo} após desbloqueio.`);
                             try {
                                const absoluteImagePath = path.join(process.cwd(), user.photoPath);
                                await fs.access(absoluteImagePath);
                                await uploadFaceImageToHikvision(employeeNo, user.photoPath);
                             } catch (faceUploadError) {
                                 console.warn(`[UserService:updateUser] FALHA ao (re)enviar FACE para ${employeeNo} após desbloqueio: ${faceUploadError.message}`);
                             }
                        }
                    }
                } catch (hikBlockError) {
                     console.error(`[UserService:updateUser] FALHA na lógica de bloqueio/desbloqueio Hikvision para ${employeeNo}: ${hikBlockError.message}`);
                }
            }

            // 2. Lógica de Atualização da Foto (se não estiver bloqueado e a foto mudou)
            //    (A API Hikvision pode não ter um "update face", então pode ser delete+add ou apenas add se não existir)
            //    Por simplicidade, se a foto mudou e o usuário não está bloqueado, tentamos enviar a nova.
            //    A API de upload de face do Hikvision pode lidar com FPID já existente (sobrescrevendo ou dando erro).
            if (user.isBlocked === false && 'photoPath' in userData && user.photoPath !== originalPhotoPath && user.photoPath) {
                console.log(`[UserService:updateUser] Foto alterada para usuário ${employeeNo}. Tentando enviar nova FACE.`);
                try {
                    // DELETAR A FACE ANTIGA PRIMEIRO, SE EXISTIA UMA
                    // Não precisamos verificar originalPhotoPath aqui, pois a API de deleção de face
                    // não retorna erro se a face não existir.
                    console.log(`[UserService:updateUser] Tentando deletar FACE existente (se houver) para ${employeeNo} no Hikvision antes de enviar a nova.`);
                    await deleteFaceFromHikvision(employeeNo); // FDID "1" e faceLibType "blackFD" são os defaults na função helper
                    console.log(`[UserService:updateUser] Deleção da face antiga para ${employeeNo} concluída (ou face não existia).`);

                    // AGORA ENVIA A NOVA FACE
                    const absoluteImagePath = path.join(process.cwd(), user.photoPath);
                    await fs.access(absoluteImagePath); // Garante que o novo arquivo de imagem existe
                    await uploadFaceImageToHikvision(employeeNo, user.photoPath);
                    console.log(`[UserService:updateUser] Nova FACE para ${employeeNo} enviada com sucesso.`);
                } catch (faceProcessingError) { // Erro genérico para o processo de deletar+adicionar
                    console.error(`[UserService:updateUser] FALHA no processo de atualização da FACE para ${employeeNo} no Hikvision: ${faceProcessingError.message}`);
                    // Logar, mas não necessariamente impedir o resto da atualização do usuário no seu sistema.
                }
            } else if (user.isBlocked === false && 'photoPath' in userData && !user.photoPath && originalPhotoPath) {
                console.warn(`[UserService:updateUser] Foto removida para usuário ${employeeNo}. Tentando deletar FACE do Hikvision.`);
                try {
                    await deleteFaceFromHikvision(employeeNo);
                    console.log(`[UserService:updateUser] Face para ${employeeNo} deletada do Hikvision devido à remoção do photoPath.`);
                } catch (faceDeletionError) {
                     console.error(`[UserService:updateUser] FALHA ao deletar FACE para ${employeeNo} do Hikvision após remoção do photoPath: ${faceDeletionError.message}`);
                }
            }

        } else {
            console.warn(`[UserService:updateUser] Usuário ${id} não possui employeeNo. Nenhuma ação no Hikvision será tomada para bloqueio ou foto.`);
        }
        // ----> FIM INTEGRAÇÃO HIKVISION <----

        await user.reload({ include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] });
        return user;

    } catch (error) {
        if (!user) {
            console.error(`[UserService:updateUser] Erro ao buscar usuário para atualizar (ID: ${id}):`, error);
            throw new Error(`Erro interno ao buscar usuário ${id} para atualização.`);
        }
        console.error(`[UserService:updateUser] Erro durante ou após atualizar usuário ${id}:`, error);
        if (error.name === 'SequelizeValidationError') {
            throw new Error(`Erro de validação: ${error.errors.map(e => e.message).join(', ')}`);
        }
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            const targetBranchId = userData.branchId ?? user.branchId;
            throw new Error(`Erro de chave estrangeira: A filial com ID ${targetBranchId} não foi encontrada.`);
        }
        // Retornar o estado do DB mesmo com erro na integração, pois o DB foi atualizado.
        await user.reload({ include: [{ model: Branch, as: 'branch', attributes: ['id', 'name'] }] });
        return user;
    }
};

/**
 * Deleta um usuário.
 * @param {number} id - ID do usuário.
 * @returns {Promise<boolean>}
 */
const deleteUser = async (id) => {
    let user;
    try {
        user = await User.findByPk(id);
        if (!user) {
            console.log(`[UserService:deleteUser] Usuário ID: ${id} não encontrado para deleção.`);
            return false;
        }
        console.log(`[UserService:deleteUser] Usuário ID: ${id} encontrado. EmployeeNo: ${user.employeeNo}`);

        const employeeNo = user.employeeNo;

        // ----> INTEGRAÇÃO HIKVISION: Deleção UserInfo <----
        // A deleção do UserInfo no Hikvision geralmente remove dados associados como faces,
        // então não precisamos chamar um "delete face" separado explicitamente.
        if (employeeNo) {
            console.log(`[UserService:deleteUser] Tentando remover UserInfo do Hikvision (EmployeeNo: ${employeeNo}) ANTES de deletar do DB.`);
            try {
                await deleteUserFromHikvision(employeeNo);
                console.log(`[UserService:deleteUser] UserInfo ${employeeNo} removido do Hikvision (ou já não existia).`);
            } catch (hikvisionError) {
                console.error(`[UserService:deleteUser] FALHA ao remover UserInfo ${employeeNo} do Hikvision: ${hikvisionError.message}. Prosseguindo com a deleção do DB.`);
                // Não relançar para garantir que o usuário seja deletado do DB.
            }
        } else {
            console.warn(`[UserService:deleteUser] Usuário ${id} será deletado do DB, mas não possui employeeNo para remoção do Hikvision.`);
        }
        // ----> FIM INTEGRAÇÃO HIKVISION <----

        await user.destroy();
        console.log(`[UserService:deleteUser] SUCESSO NO DB: Usuário ${id} deletado com sucesso do banco de dados.`);
        return true;

    } catch (error) {
        if (!user && error.name !== 'SequelizeForeignKeyConstraintError') {
            console.error(`[UserService:deleteUser] Erro ao buscar usuário para deletar (ID: ${id}):`, error);
            throw new Error(`Erro interno ao buscar usuário ${id} para deleção.`);
        }
        console.error(`[UserService:deleteUser] Erro ao deletar usuário ${id}:`, error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            console.error(`[UserService:deleteUser] Tentativa de deletar usuário ${id} falhou devido a restrição de chave estrangeira.`);
            throw error;
        }
        throw new Error(`Erro interno durante o processo de deleção do usuário ${id}. Verifique os logs.`);
    }
};

// Função auxiliar para omitir campos de um objeto (para logs)
function Omit(obj, keys) {
    const result = { ...obj };
    keys.forEach(key => delete result[key]);
    return result;
}

module.exports = {
    findUserByWhatsappNumber,
    verifyIdentityAndGetData,
    createUser,
    findAllUsers,
    findUserById,
    updateUser,
    deleteUser,
};