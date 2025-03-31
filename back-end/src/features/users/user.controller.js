// src/features/users/user.controller.js
const userService = require('./user.services'); // Importa o serviço de usuário

/**
 * Controller para verificar a existência de um usuário pelo número do WhatsApp.
 * Responde à rota GET /users/check-existence?whatsappNumber=...
 */
const checkUserExistence = async (req, res, next) => {
  const { whatsappNumber } = req.query;

  // Validação básica da entrada
  if (!whatsappNumber) {
    return res.status(400).json({ message: 'Número do WhatsApp é obrigatório na query string (whatsappNumber).' });
  }

  try {
    const user = await userService.findUserByWhatsappNumber(whatsappNumber);
    // Retorna true se o usuário foi encontrado, false caso contrário
    return res.status(200).json({ exists: !!user }); // !!user converte o resultado (objeto ou null) para boolean
  } catch (error) {
    // Passa o erro para o middleware de erro global (se houver) ou lida aqui
    console.error(`[UserController:checkUserExistence] Erro: ${error.message}`);
    // Evita expor detalhes do erro interno, mas pode ser útil logar 'error' completo
    return res.status(500).json({ message: 'Erro interno ao verificar existência do usuário.' });
    // next(error); // Alternativa se tiver um middleware de erro configurado
  }
};

/**
 * Controller para criar um novo usuário.
 * Responde à rota POST /users
 */
const createUser = async (req, res, next) => {
  const userData = req.body;

  // Validação básica dos campos obrigatórios no corpo da requisição
  // (Embora o serviço e o modelo também validem, é bom ter uma checagem inicial)
  const requiredFields = ['name', 'whatsappNumber', 'cpf', 'dateOfBirth', 'photoUrl'];
  const missingFields = requiredFields.filter(field => !(field in userData));

  if (missingFields.length > 0) {
    return res.status(400).json({
      message: `Campos obrigatórios faltando no corpo da requisição: ${missingFields.join(', ')}`
    });
  }

  try {
    const newUser = await userService.createUser(userData);
    // Retorna o usuário criado com status 201 (Created)
    // Considerar não retornar todos os dados se houver campos sensíveis
    return res.status(201).json(newUser);
  } catch (error) {
    console.error(`[UserController:createUser] Erro: ${error.message}`);
    // Trata erros específicos lançados pelo serviço
    if (error.message === 'CPF já cadastrado.' || error.message === 'Número de WhatsApp já cadastrado.') {
      return res.status(409).json({ message: error.message }); // 409 Conflict
    }
    if (error.message.startsWith('Erro de validação')) {
        return res.status(400).json({ message: error.message }); // 400 Bad Request para erros de validação
    }
    // Erro genérico
    return res.status(500).json({ message: 'Erro interno ao criar usuário.' });
    // next(error);
  }
};

/**
 * Controller para verificar a identidade de um usuário (CPF/DataNasc) dado o WhatsApp.
 * Responde à rota POST /users/verify
 */
const verifyUserIdentity = async (req, res, next) => {
  const { whatsappNumber, cpf, dateOfBirth } = req.body;

  // Validação básica da entrada
  if (!whatsappNumber || !cpf || !dateOfBirth) {
    return res.status(400).json({ message: 'Campos whatsappNumber, cpf e dateOfBirth são obrigatórios no corpo da requisição.' });
  }

  try {
    const verifiedUser = await userService.verifyIdentityAndGetData(whatsappNumber, cpf, dateOfBirth);
    // Retorna os dados do usuário verificado
    // Novamente, considerar quais dados retornar
    return res.status(200).json(verifiedUser);
  } catch (error) {
    console.error(`[UserController:verifyUserIdentity] Erro: ${error.message}`);
    // Trata erros específicos lançados pelo serviço
    if (error.message === 'Usuário não encontrado para este número de WhatsApp.') {
      return res.status(404).json({ message: error.message }); // 404 Not Found
    }
    if (error.message === 'CPF ou Data de Nascimento inválidos.') {
      // 401 Unauthorized ou 403 Forbidden podem ser semanticamente melhores aqui
      return res.status(401).json({ message: 'Falha na verificação: CPF ou Data de Nascimento não conferem.' });
    }
    // Erro genérico
    return res.status(500).json({ message: 'Erro interno durante a verificação de identidade.' });
    // next(error);
  }
};

// Exporta os métodos do controller
module.exports = {
  checkUserExistence,
  createUser,
  verifyUserIdentity,
};