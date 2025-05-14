// src/features/hikvisions/hikvision.routes.js
const express = require('express');
const hikvisionController = require('./hikvision.controller');
// const { authenticate, authorize } = require('../../middleware/auth'); // Exemplo: Importar middlewares de auth

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Hikvisions
 *   description: Gerenciamento de dispositivos Hikvision
 */

// Aplicar middlewares de autenticação/autorização se necessário
// router.use(authenticate); // Ex: Requer login para todas as rotas
// router.use(authorize('admin')); // Ex: Requer papel de admin

/**
 * @swagger
 * /hikvisions:
 *   post:
 *     summary: Cria um novo dispositivo Hikvision
 *     tags: [Hikvisions]
 *     security:
 *       - bearerAuth: [] # Se usar autenticação
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HikvisionInput'
 *     responses:
 *       201: { description: Dispositivo criado, content: { application/json: { schema: { $ref: '#/components/schemas/Hikvision' } } } }
 *       400: { description: Dados inválidos (campos obrigatórios, filial não existe, formato inválido) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       409: { description: Conflito (número de série já existe) }
 *       500: { description: Erro interno }
 */
router.post('/', /* authorize('admin'), */ hikvisionController.createHikvision);

/**
 * @swagger
 * /hikvisions:
 *   get:
 *     summary: Lista todos os dispositivos Hikvision
 *     tags: [Hikvisions]
 *     security:
 *       - bearerAuth: [] # Se usar autenticação
 *     parameters:
 *       - in: query
 *         name: branchId
 *         schema: { type: integer }
 *         description: Filtra dispositivos por ID da filial
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, maintenance, error] }
 *         description: Filtra dispositivos por status
 *     responses:
 *       200: { description: Lista de dispositivos, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Hikvision' } } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       500: { description: Erro interno }
 */
router.get('/', /* authorize('admin'), */ hikvisionController.getAllHikvisions);

/**
 * @swagger
 * /hikvisions/{id}:
 *   get:
 *     summary: Obtém um dispositivo Hikvision específico pelo ID
 *     tags: [Hikvisions]
 *     security:
 *       - bearerAuth: [] # Se usar autenticação
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Dispositivo Hikvision
 *     responses:
 *       200: { description: Dados do dispositivo, content: { application/json: { schema: { $ref: '#/components/schemas/Hikvision' } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Dispositivo não encontrado }
 *       500: { description: Erro interno }
 */
router.get('/:id', /* authorize('admin'), */ hikvisionController.getHikvisionById);

/**
 * @swagger
 * /hikvisions/{id}:
 *   put:
 *     summary: Atualiza um dispositivo Hikvision existente
 *     tags: [Hikvisions]
 *     security:
 *       - bearerAuth: [] # Se usar autenticação
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Dispositivo Hikvision
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/HikvisionUpdateInput'
 *     responses:
 *       200: { description: Dispositivo atualizado, content: { application/json: { schema: { $ref: '#/components/schemas/Hikvision' } } } }
 *       400: { description: Dados inválidos (filial não existe, status inválido) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Dispositivo não encontrado }
 *       409: { description: Conflito (número de série já existe) }
 *       500: { description: Erro interno }
 */
router.put('/:id', /* authorize('admin'), */ hikvisionController.updateHikvision);

/**
 * @swagger
 * /hikvisions/{id}:
 *   delete:
 *     summary: Exclui um dispositivo Hikvision
 *     tags: [Hikvisions]
 *     security:
 *       - bearerAuth: [] # Se usar autenticação
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: ID do Dispositivo Hikvision
 *     responses:
 *       204: { description: Dispositivo excluído com sucesso }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Dispositivo não encontrado }
 *       409: { description: Conflito (dispositivo possui dependências) }
 *       500: { description: Erro interno }
 */
router.delete('/:id', /* authorize('admin'), */ hikvisionController.deleteHikvision);

module.exports = router;

// --- Definições de Schema Swagger (idealmente em um local central) ---
/**
 * @swagger
 * components:
 *   schemas:
 *     HikvisionInput:
 *       type: object
 *       required: [branchId, name, ipAddress, port, username, password, serialNumber]
 *       properties:
 *         branchId: { type: integer, description: "ID da filial" }
 *         name: { type: string, description: "Nome do dispositivo" }
 *         ipAddress: { type: string, format: ipv4, description: "Endereço IP" }
 *         port: { type: integer, description: "Porta de comunicação", default: 80 }
 *         username: { type: string, description: "Usuário de acesso" }
 *         password: { type: string, format: password, description: "Senha de acesso (será hasheada)" }
 *         serialNumber: { type: string, description: "Número de série único" }
 *         status: { type: string, enum: [active, inactive, maintenance, error], default: active }
 *
 *     HikvisionUpdateInput:
 *       type: object
 *       properties:
 *         branchId: { type: integer, description: "Novo ID da filial" }
 *         name: { type: string, description: "Novo nome do dispositivo" }
 *         ipAddress: { type: string, format: ipv4, description: "Novo endereço IP" }
 *         port: { type: integer, description: "Nova porta" }
 *         username: { type: string, description: "Novo usuário" }
 *         password: { type: string, format: password, description: "Nova senha (opcional, será hasheada)" }
 *         serialNumber: { type: string, description: "Novo número de série" }
 *         status: { type: string, enum: [active, inactive, maintenance, error] }
 *
 *     Hikvision:
 *       allOf:
 *         - type: object
 *           properties:
 *             id: { type: integer, readOnly: true }
 *             branchId: { type: integer }
 *             name: { type: string }
 *             ipAddress: { type: string, format: ipv4 }
 *             port: { type: integer }
 *             username: { type: string }
 *             # password NUNCA é retornado
 *             serialNumber: { type: string }
 *             status: { type: string, enum: [active, inactive, maintenance, error] }
 *             createdAt: { type: string, format: date-time, readOnly: true }
 *             updatedAt: { type: string, format: date-time, readOnly: true }
 *         - $ref: '#/components/schemas/BranchAssociation' # Inclui a associação com Branch
 *
 *   # Defina este schema se não existir, para incluir a filial nos resultados
 *   BranchAssociation:
 *      type: object
 *      properties:
 *          branch:
 *              type: object
 *              readOnly: true
 *              properties:
 *                  id: { type: integer }
 *                  name: { type: string }
 */