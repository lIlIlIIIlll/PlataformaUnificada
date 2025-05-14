// src/features/auth/auth.service.js
const administratorService = require('../administrators/administrator.service'); // Reutiliza o service existente
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const JWT_SECRET = process.env.JWT_SECRET || 'batata847474'; // Use uma chave segura e coloque no .env
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

if (!JWT_SECRET || JWT_SECRET === 'batata847474') {
    console.warn("AVISO: JWT_SECRET não está definida no .env ou está usando o valor padrão. Use uma chave segura em produção!");
    // Não sair em desenvolvimento, mas logar o aviso. Sair se for produção e não estiver definida.
    if(process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
        console.error("ERRO FATAL: Variável de ambiente JWT_SECRET não definida em produção.");
        process.exit(1); // Impede a aplicação de iniciar sem segredo JWT em produção
    }
}

/**
 * Autentica um administrador com base no email e senha.
 * @param {string} email - O email do administrador.
 * @param {string} password - A senha em texto plano fornecida.
 * @returns {Promise<{token: string, user: object}>} - Objeto contendo o token JWT e dados do usuário (sem senha e com filiais se branch_admin).
 * @throws {Error} - Se as credenciais forem inválidas, usuário não encontrado ou erro interno.
 */
const loginAdministrator = async (email, password) => {
    try {
        // 1. Encontrar o administrador pelo email (incluindo a senha hashada)
        // A função findAdministratorByEmail já retorna o objeto completo do Sequelize
        const admin = await administratorService.findAdministratorByEmail(email);

        // 2. Verificar se o administrador existe
        if (!admin) {
            console.warn(`Tentativa de login falhou: Email não encontrado - ${email}`);
            throw new Error('Credenciais inválidas.');
        }

        // 3. Comparar a senha fornecida com o hash armazenado
        const isPasswordValid = await bcrypt.compare(password, admin.password);

        if (!isPasswordValid) {
            console.warn(`Tentativa de login falhou: Senha inválida para email - ${email}`);
            throw new Error('Credenciais inválidas.');
        }

        console.log(`Login bem-sucedido para: ${email}, Role: ${admin.role}`);

        // 4. Senha válida -> Gerar o Token JWT
        const payload = {
            userId: admin.id,
            role: admin.role, // Inclui o papel no token para futuras verificações de permissão
            name: admin.name, // Pode incluir outros dados não sensíveis se útil
        };

        const token = jwt.sign(
            payload,
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // 5. Preparar os dados do usuário para retornar (sem a senha!)
        const { password: removedPassword, ...adminWithoutPassword } = admin.get({ plain: true });

        // --- INÍCIO DA MODIFICAÇÃO: Busca e inclui filiais se for branch_admin ---
        let adminDataForReturn = { ...adminWithoutPassword }; // Começa com os dados básicos sem senha

        if (admin.role === 'branch_admin') {
            console.log(`Admin ${admin.id} (${admin.email}) é branch_admin. Buscando filiais associadas...`);
            try {
                // Usa o método de associação 'getBranches' gerado pelo Sequelize
                // Seleciona apenas os campos 'id' e 'name' das filiais associadas
                // joinTableAttributes: [] evita trazer dados da tabela de junção (administrator_branch)
                const branches = await admin.getBranches({
                    attributes: ['id', 'name'],
                    joinTableAttributes: []
                });

                // Adiciona o array de filiais (objetos simples) aos dados de retorno
                adminDataForReturn.branches = branches.map(branch => branch.get({ plain: true }));
                console.log(`Filiais encontradas e associadas para admin ${admin.id}:`, JSON.stringify(adminDataForReturn.branches));

                // Verifica se encontrou filiais (importante para a lógica do frontend)
                if (!adminDataForReturn.branches || adminDataForReturn.branches.length === 0) {
                     console.warn(`AVISO: Administrador de filial ${admin.id} (${admin.email}) não possui filiais associadas no banco de dados!`);
                     // O frontend já trata isso, mas é um bom aviso no backend.
                }

            } catch (branchError) {
                console.error(`Erro CRÍTICO ao buscar filiais associadas para admin ${admin.id} (${admin.email}):`, branchError);
                // Decide o que fazer:
                // Opção 1: Falhar o login (mais seguro se as filiais são 100% necessárias)
                // throw new Error('Erro ao buscar filiais associadas ao administrador. Login interrompido.');
                // Opção 2: Continuar, mas logar e retornar array vazio (frontend tratará)
                 adminDataForReturn.branches = []; // Define como array vazio em caso de erro na busca
            }
        }
        // --- FIM DA MODIFICAÇÃO ---

        // Retorna o token e os dados do usuário (agora com 'branches' se aplicável)
        return {
            token,
            user: adminDataForReturn
        };

    } catch (error) {
        // Re-lança erros específicos ou genéricos
        if (error.message === 'Credenciais inválidas.') {
            // Não logar senha ou detalhes excessivos aqui
            throw error;
        }
         if (error.message.includes('Erro ao buscar filiais associadas')) {
             // Se optou por falhar o login no catch do getBranches
             throw error;
         }
        // Logar outros erros inesperados
        console.error('Erro inesperado no serviço de login:', error);
        throw new Error('Erro durante o processo de login.'); // Erro genérico para o cliente
    }
};

module.exports = {
    loginAdministrator,
};