// src/features/settings/setting.routes.js
const express = require('express');
const settingController = require('./setting.controller');
// const { authenticate, authorize } = require('../../middleware/auth'); // Example Auth Middleware

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: Gerenciamento de Configurações Gerais do Sistema
 */

// Apply authentication/authorization middleware (settings are usually admin-only)
// router.use(authenticate);
// router.use(authorize('admin')); // Or a more specific role if needed

/**
 * @swagger
 * /settings:
 *   post:
 *     summary: Cria uma nova configuração (chave-valor)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SettingInput'
 *     responses:
 *       201: { description: Configuração criada, content: { application/json: { schema: { $ref: '#/components/schemas/Setting' } } } }
 *       400: { description: Dados inválidos (campos obrigatórios) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       409: { description: Conflito (Nome/chave já existe) }
 *       500: { description: Erro interno }
 */
router.post('/', /* authorize('admin'), */ settingController.createSetting);

/**
 * @swagger
 * /settings:
 *   get:
 *     summary: Lista todas as configurações
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Lista de configurações, content: { application/json: { schema: { type: array, items: { $ref: '#/components/schemas/Setting' } } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       500: { description: Erro interno }
 */
router.get('/', /* authorize('admin'), */ settingController.getAllSettings);

/**
 * @swagger
 * /settings/{name}:
 *   get:
 *     summary: Obtém uma configuração específica pelo nome (chave)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema: { type: string }
 *         description: Nome (chave) único da configuração
 *         example: "base_locker_price"
 *     responses:
 *       200: { description: Dados da configuração, content: { application/json: { schema: { $ref: '#/components/schemas/Setting' } } } }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Configuração não encontrada }
 *       500: { description: Erro interno }
 */
router.get('/:name', /* authorize('admin'), */ settingController.getSettingByName);

/**
 * @swagger
 * /settings/{name}:
 *   put:
 *     summary: Atualiza o valor ou descrição de uma configuração pelo nome (chave)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema: { type: string }
 *         description: Nome (chave) único da configuração a ser atualizada
 *         example: "base_locker_price"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/SettingUpdateInput'
 *     responses:
 *       200: { description: Configuração atualizada, content: { application/json: { schema: { $ref: '#/components/schemas/Setting' } } } }
 *       400: { description: Dados inválidos (nenhum dado fornecido) }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Configuração não encontrada }
 *       500: { description: Erro interno }
 */
router.put('/:name', /* authorize('admin'), */ settingController.updateSettingByName);

/**
 * @swagger
 * /settings/{name}:
 *   delete:
 *     summary: Exclui uma configuração pelo nome (chave)
 *     tags: [Settings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema: { type: string }
 *         description: Nome (chave) único da configuração a ser excluída
 *         example: "temporary_promo_code"
 *     responses:
 *       204: { description: Configuração excluída com sucesso }
 *       401: { description: Não autenticado }
 *       403: { description: Proibido }
 *       404: { description: Configuração não encontrada }
 *       500: { description: Erro interno }
 */
router.delete('/:name', /* authorize('admin'), */ settingController.deleteSettingByName);


module.exports = router;

// --- Swagger Schema Definitions (Add to your central Swagger config) ---
/**
 * @swagger
 * components:
 *   schemas:
 *     SettingInput:
 *       type: object
 *       required:
 *         - name
 *         - value
 *       properties:
 *         name:
 *           type: string
 *           description: Nome (chave) único da configuração.
 *           example: "max_reservation_hours"
 *         value:
 *           type: string # Stored as TEXT, parsing happens in application logic
 *           description: Valor da configuração. Pode ser string, número, JSON stringificado, etc.
 *           example: "48"
 *         description:
 *           type: string
 *           nullable: true
 *           description: Descrição opcional do propósito da configuração.
 *           example: "Número máximo de horas que uma reserva pode durar antes de gerar taxa extra."
 *
 *     SettingUpdateInput:
 *        type: object
 *        description: Pelo menos 'value' ou 'description' deve ser fornecido.
 *        properties:
 *          value:
 *            type: string
 *            description: O novo valor para a configuração.
 *            example: "72"
 *          description:
 *            type: string
 *            nullable: true
 *            description: A nova descrição para a configuração.
 *            example: "Número máximo de horas (atualizado)."
 *
 *     Setting:
 *       allOf:
 *         - $ref: '#/components/schemas/SettingInput'
 *         - type: object
 *           properties:
 *             id: { type: integer, readOnly: true }
 *             createdAt: { type: string, format: date-time, readOnly: true }
 *             updatedAt: { type: string, format: date-time, readOnly: true }
 */