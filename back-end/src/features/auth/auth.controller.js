// src/features/auth/auth.controller.js
const authService = require('./auth.service');

/**
 * Lida com a requisição de login do administrador.
 */
const login = async (req, res, next) => {
    try {
        const { identifier, password } = req.body; // 'identifier' pode ser email ou username, neste caso é email

        // Validação básica de entrada
        if (!identifier || !password) {
            return res.status(400).json({ message: 'Email e senha são obrigatórios.' });
        }

        // Chama o serviço para autenticar
        const result = await authService.loginAdministrator(identifier, password);

        // Responde com sucesso (token e dados do usuário)
        res.status(200).json(result);

    } catch (error) {
        // Trata erros específicos do serviço
        if (error.message === 'Credenciais inválidas.') {
            // Retorna 401 Unauthorized para credenciais inválidas ou usuário não encontrado
            return res.status(401).json({ message: 'Email ou senha inválidos.' });
        }
        // Passa outros erros para o handler global
        next(error);
    }
};

module.exports = {
    login,
};