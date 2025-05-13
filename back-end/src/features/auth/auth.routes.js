// src/features/auth/auth.routes.js
const express = require('express');
const authController = require('./auth.controller');
// Você pode adicionar rate limiting aqui se desejar:
// const rateLimit = require('express-rate-limit');

const router = express.Router();

// Opcional: Configurar rate limiting para a rota de login
// const loginLimiter = rateLimit({
//  windowMs: 15 * 60 * 1000, // 15 minutos
//  max: 10, // Limita cada IP a 10 requisições de login por janela
//  message: 'Muitas tentativas de login a partir deste IP, tente novamente após 15 minutos.',
//  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
//  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
// });

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: Autenticação de usuários (Administradores)
 */

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Autentica um administrador e retorna um token JWT
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 format: email
 *                 description: Email do administrador
 *                 example: "admin@example.com"
 *               password:
 *                 type: string
 *                 format: password
 *                 description: Senha do administrador
 *                 example: "strongPassword123"
 *     responses:
 *       200:
 *         description: Login bem-sucedido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: Token JWT para autenticação subsequente
 *                   example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *                 user:
 *                   $ref: '#/components/schemas/Administrator' # Referencia o schema existente
 *       400:
 *         description: Dados inválidos (email ou senha faltando)
 *       401:
 *         description: Não autorizado (Email ou senha inválidos)
 *       500:
 *         description: Erro interno do servidor
 */
// Aplica o limiter APENAS nesta rota se for usar: router.post('/login', loginLimiter, authController.login);
router.post('/login', authController.login);

module.exports = router;