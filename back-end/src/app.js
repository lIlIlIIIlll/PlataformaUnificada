const express = require('express');
const userRoutes = require('./features/users/user.routes'); // Importa as rotas de usuário
// Importe outras rotas (auth, etc.) aqui também

const app = express();

// Middlewares essenciais
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Para parsear dados de formulário URL-encoded

// Monta as rotas de usuário sob o prefixo /api/v1/users
app.use('/api/v1/users', userRoutes);
// Monte outras rotas aqui (ex: app.use('/api/v1/auth', authRoutes);)

// Middleware de tratamento de erros (opcional, mas recomendado)
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Algo deu errado!');
});

// Inicialização do servidor
const PORT = process.env.PORT || 3009;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  // Conectar ao banco de dados aqui se ainda não o fez
});