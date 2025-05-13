// src/features/branches/branch.routes.js
const express = require('express');
const branchController = require('./branch.controller');
// const { authenticate, authorize } = require('../../middleware/auth'); // Exemplo Auth Middleware

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Branches
 *   description: Gerenciamento de Filiais e suas conexões WhatsApp
 */

// router.use(authenticate); // Exemplo: Todas as rotas de filial podem requerer autenticação
// router.use(authorize('admin')); // Exemplo: Operações de escrita/gerenciamento podem requerer role de admin

// --- Rotas CRUD de Filial (Existentes) ---

/**
 * @swagger
 * /branches:
 *   post:
 *     summary: Cria uma nova filial
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: [] 
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/BranchInput' } } } }
 *     responses:
 *       201: { description: Filial criada, content: { application/json: { schema: { $ref: '#/components/schemas/Branch' } } } }
 *       400: { description: Dados inválidos }
 */
router.post('/', branchController.createBranch); 

/**
 * @swagger
 * /branches:
 *   get:
 *     summary: Lista todas as filiais
 *     tags: [Branches]
 *     parameters:
 *       - in: query
 *         name: include
 *         schema: { type: string, enum: [users, lockers, administrators] }
 *         description: Inclui associações (users, lockers, administrators)
 *     responses:
 *       200: { description: Lista de filiais, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Branch' } } } } }
 */
router.get('/', branchController.getAllBranches); 

/**
 * @swagger
 * /branches/{id}:
 *   get:
 *     summary: Obtém uma filial específica pelo ID
 *     tags: [Branches]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema: { type: integer }
 *         required: true
 *         description: ID da filial
 *       - in: query
 *         name: include
 *         schema: { type: string, enum: [users, lockers, administrators] }
 *         description: Inclui associações (users, lockers, administrators)
 *     responses:
 *       200: { description: Dados da filial, content: { application/json: { schema: { $ref: '#/components/schemas/Branch' } } } }
 *       404: { description: Filial não encontrada }
 */
router.get('/:id', branchController.getBranchById);

/**
 * @swagger
 * /branches/{id}:
 *   put:
 *     summary: Atualiza uma filial existente
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer }, description: ID da filial }]
 *     requestBody: { required: true, content: { application/json: { schema: { $ref: '#/components/schemas/BranchInput' } } } }
 *     responses:
 *       200: { description: Filial atualizada, content: { application/json: { schema: { $ref: '#/components/schemas/Branch' } } } }
 *       400: { description: Dados inválidos }
 *       404: { description: Filial não encontrada }
 */
router.put('/:id', branchController.updateBranch); 

/**
 * @swagger
 * /branches/{id}:
 *   delete:
 *     summary: Exclui uma filial (e tenta limpar sua sessão WhatsApp)
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: []
 *     parameters: [{ in: path, name: id, required: true, schema: { type: integer }, description: ID da filial }]
 *     responses:
 *       204: { description: Filial excluída }
 *       404: { description: Filial não encontrada }
 *       409: { description: Conflito (filial possui dependências) }
 */
router.delete('/:id', branchController.deleteBranch); 

// --- Rotas de Associação de Administradores (Existentes) ---
router.post('/:branchId/administrators/:administratorId', branchController.addAdministratorToBranch);
router.delete('/:branchId/administrators/:administratorId', branchController.removeAdministratorFromBranch);


// --- NOVAS Rotas para Gerenciamento do WhatsApp da Filial ---

/**
 * @swagger
 * /branches/{branchId}/whatsapp/connect:
 *   post:
 *     summary: Inicia ou tenta reconectar a sessão WhatsApp para uma filial
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: [] # Proteger esta rota
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Filial
 *     responses:
 *       202: { description: Solicitação de conexão aceita. O frontend deve pollar o status para obter QR code ou confirmação. }
 *       400: { description: Falha ao iniciar a solicitação de conexão. }
 *       404: { description: Filial não encontrada. }
 */
router.post('/:branchId/whatsapp/connect', branchController.initiateWhatsAppConnectionController);

/**
 * @swagger
 * /branches/{branchId}/whatsapp/status:
 *   get:
 *     summary: Obtém o status atual da conexão WhatsApp de uma filial
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: [] # Proteger esta rota
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Filial
 *     responses:
 *       200: { description: Status da conexão, pode incluir QR code se pendente., content: { application/json: { schema: { $ref: '#/components/schemas/WhatsAppStatus' } } } }
 *       404: { description: Filial não encontrada. }
 */
router.get('/:branchId/whatsapp/status', branchController.getWhatsAppConnectionStatusController);

/**
 * @swagger
 * /branches/{branchId}/whatsapp/disconnect:
 *   post:
 *     summary: Desconecta a sessão WhatsApp de uma filial
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: [] # Proteger esta rota
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Filial
 *     responses:
 *       200: { description: Sessão desconectada com sucesso ou já estava desconectada. }
 *       404: { description: Filial não encontrada. }
 */
router.post('/:branchId/whatsapp/disconnect', branchController.disconnectWhatsAppController);

/**
 * @swagger
 * /branches/{branchId}/whatsapp/session/clear:
 *   delete:
 *     summary: Limpa completamente a sessão WhatsApp de uma filial (arquivos e DB)
 *     tags: [Branches]
 *     security:
 *       - bearerAuth: [] # Proteger esta rota
 *     parameters:
 *       - in: path
 *         name: branchId
 *         required: true
 *         schema: { type: integer }
 *         description: ID da Filial
 *     responses:
 *       200: { description: Sessão limpa com sucesso. }
 *       400: { description: Falha ao limpar a sessão. }
 *       404: { description: Filial não encontrada. }
 */
router.delete('/:branchId/whatsapp/session/clear', branchController.clearWhatsAppSessionController);


module.exports = router;

// --- Swagger Schema Definitions (Adicionar/Atualizar) ---
/**
 * @swagger
 * components:
 *   schemas:
 *     BranchInput:
 *       type: object
 *       properties:
 *         name: { type: string, example: "Filial Centro" }
 *         address: { type: string, example: "Rua Principal, 100", nullable: true }
 *         openaiAssistantIdOverride: { type: string, nullable: true, description: "ID do Assistente OpenAI específico para esta filial" }
 *       required:
 *         - name
 *     Branch:
 *       allOf:
 *         - $ref: '#/components/schemas/BranchInput'
 *         - type: object
 *           properties:
 *             id: { type: integer, readOnly: true }
 *             whatsappSessionId: { type: string, readOnly: true, nullable: true, description: "ID da sessão WhatsApp" }
 *             whatsappStatus: { type: string, enum: ['disconnected', 'connecting', 'qr_pending', 'connected', 'auth_failure', 'error', 'initializing', 'destroying'], readOnly: true, description: "Status da conexão WhatsApp" }
 *             whatsappNumber: { type: string, readOnly: true, nullable: true, description: "Número WhatsApp conectado" }
 *             whatsappLastError: { type: string, readOnly: true, nullable: true, description: "Último erro da conexão WhatsApp" }
 *             # whatsappQrCode não é usualmente retornado aqui, mas sim no endpoint de status específico
 *             createdAt: { type: string, format: date-time, readOnly: true }
 *             updatedAt: { type: string, format: date-time, readOnly: true }
 *             users: { type: array, items: { $ref: '#/components/schemas/User' }, readOnly: true, description: "Incluído via ?include=users" }
 *             lockers: { type: array, items: { $ref: '#/components/schemas/Locker' }, readOnly: true, description: "Incluído via ?include=lockers" }
 *             administrators: { type: array, items: { $ref: '#/components/schemas/Administrator' }, readOnly: true, description: "Incluído via ?include=administrators" }
 *     WhatsAppStatus:
 *       type: object
 *       properties:
 *         branchId: { type: integer }
 *         status: { type: string, enum: ['disconnected', 'connecting', 'qr_pending', 'connected', 'auth_failure', 'error', 'initializing', 'destroying'] }
 *         qrCode: { type: string, nullable: true, description: "QR Code em base64, se status for qr_pending" }
 *         lastError: { type: string, nullable: true }
 *         connectedNumber: { type: string, nullable: true }
 *         sessionId: { type: string, nullable: true }
 */