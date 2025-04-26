// src/app.js
const express = require('express');
const db = require('./index'); // Ensure this initializes models and associations
const path = require('path');
const cors = require('cors');
const multer = require('multer');

// Import Routes
const userRoutes = require('./features/users/user.routes');
const administratorRoutes = require('./features/administrators/administrator.routes');
const branchRoutes = require('./features/branches/branch.routes');
const lockerRoutes = require('./features/lockers/locker.routes');
const reservationRoutes = require('./features/reservations/locker_reservation.routes');
const paymentRoutes = require('./features/payments/payment.routes');
const settingRoutes = require('./features/settings/setting.routes');
const whatsappRoutes = require('./features/whatsapp/whatsappRoutes');
const hikvisionRoutes = require('./features/hikvision/hikvision.routes');
const uploadRoutes = require('./features/uploads/upload.routes');
// Import other routes as needed

// --- IMPORTANTE: Importar o Model e a Config de Seeding ---
const { Setting } = db; // Acessa o modelo Setting inicializado em db
const permanentSettingsConfig = require('./config/permanentSettings.config'); // Importa a config centralizada
const DEFAULT_SETTINGS_DATA = permanentSettingsConfig.defaults; // Pega os dados padrão para seeding
// --- FIM DAS IMPORTAÇÕES ---

const app = express();

app.use(cors());

// Middlewares essenciais
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Para parsear dados de formulário URL-encoded

const uploadsDir = path.join(__dirname, '..', 'uploads');
console.log(`Servindo arquivos estáticos de: ${uploadsDir}`);
app.use('/uploads', express.static(uploadsDir));

// --- API Routes ---
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/administrators`, administratorRoutes);
app.use(`${API_PREFIX}/branches`, branchRoutes);
app.use(`${API_PREFIX}/lockers`, lockerRoutes);
app.use(`${API_PREFIX}/reservations`, reservationRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/settings`, settingRoutes);
app.use(`${API_PREFIX}/whatsapp`, whatsappRoutes);
app.use(`${API_PREFIX}/hikvisions`, hikvisionRoutes); // <<< NOVAS ROTAS MONTADAS
app.use(`${API_PREFIX}/uploads`, uploadRoutes); // <<< NOVAS ROTAS DE UPLOAD MONTADAS

// Mount other routes

// Simple Root Route for health check or info
app.get('/', (req, res) => {
  res.send('API is running.');
});


// --- Global Error Handler (Example) ---
// Place this AFTER all your routes
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err); // Log the error

  if (err instanceof multer.MulterError) {
    // Erros conhecidos do Multer (ex: limite de tamanho)
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: `Arquivo muito grande. Limite de ${err.limit / 1024 / 1024}MB.` });
    }
    // Outros erros do Multer
    return res.status(400).json({ message: `Erro no upload (Multer): ${err.message}` });
  } else if (err.message.includes('Tipo de arquivo inválido')) {
     // Erro customizado do nosso fileFilter
     return res.status(400).json({ message: err.message });
  }

  // Default error status and message
  let statusCode = 500;
  let message = 'Erro interno do servidor.';

  if (err.name === 'SequelizeValidationError' || err.message.includes('Erro de validação')) {
    statusCode = 400;
    // Tenta extrair mensagens mais específicas do Sequelize
    const messages = err.errors ? err.errors.map(e => e.message).join(', ') : err.message;
    message = `Erro de validação: ${messages}`;
  } else if (err.name === 'SequelizeUniqueConstraintError' || err.message.includes('já cadastrado') || err.message.includes('já existe')) {
    statusCode = 409; // Conflict
     const messages = err.errors ? err.errors.map(e => e.message).join(', ') : err.message;
    message = `Erro de duplicação: ${messages}`;
  } else if (err.name === 'SequelizeForeignKeyConstraintError' || err.message.includes('chave estrangeira') || err.message.includes('não encontrada')) {
      statusCode = 400; // Ou 409 dependendo do contexto, mas 400 para 'not found' implícito
      // Tenta ser mais específico, mas cuidado para não expor detalhes internos
      message = `Erro de referência: Um registro relacionado necessário não foi encontrado ou fornecido é inválido. Detalhe: ${err.message}`; // Cuidado ao expor err.message
  } else if (err.status) {
    // If the error has a specific status code attached (ex: from auth middleware)
    statusCode = err.status;
    message = err.message;
  } else if (err.message.includes('permanente e não pode ser excluída')) { // Captura erro específico do service
      statusCode = 403; // Forbidden - Ação não permitida por ser permanente
      message = err.message;
  } else if (err.message.includes('Não é possível excluir') || err.message.includes('possui registros associados')) {
      statusCode = 409; // Conflict - Cannot delete due to dependencies
      message = err.message;
  } else if (err.message.includes('Não foi possível')) { // Catch other custom service errors
     statusCode = 500; // Ou talvez 400/409 dependendo do contexto do erro
     message = err.message;
  }
  // Adicione mais verificações de erros específicos aqui se necessário

  res.status(statusCode).json({ message });
});


// --- Função para criar configurações padrão se não existirem (usando config centralizada) ---
const seedDefaultSettings = async () => {
    console.log('Verificando/Criando configurações padrão...');
    try {
        // Itera sobre os dados padrão importados do arquivo de configuração
        for (const settingData of DEFAULT_SETTINGS_DATA) {
            const [setting, created] = await Setting.findOrCreate({
                where: { name: settingData.name },
                defaults: {
                    value: settingData.value,
                    description: settingData.description,
                },
            });

            if (created) {
                console.log(`- Configuração padrão '${setting.name}' criada.`);
            }
            // Opcional: loggar se já existia
            // else { console.log(`- Configuração padrão '${setting.name}' já existe.`); }
        }
        console.log('Verificação de configurações padrão concluída.');
    } catch (error) {
        console.error('Erro durante o seeding das configurações padrão:', error);
        // Decide se quer parar a aplicação ou apenas logar o erro
        // throw error; // Descomente se quiser que um erro no seeding pare a inicialização
    }
};


// --- Server Initialization ---
const PORT = process.env.PORT || 3009;

console.log("Tentando sincronizar com banco de dados...");

db.SQ.sync() // Use the instance from db object
  .then(async () => { // Tornar o callback async para usar await no seeding
    console.log("Banco de Dados sincronizado com sucesso!");

    // --- Executar Seeding das Configurações ---
    await seedDefaultSettings();
    // --- Fim do Seeding ---

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro fatal ao sincronizar com o banco de dados:", err);
    process.exit(1); // Exit if DB sync fails
  });