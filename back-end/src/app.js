// src/app.js
const path = require('path');
const express = require('express');
const db = require('./index'); // Ensure this initializes models and associations
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
const whatsappRoutes = require('./features/whatsapp/whatsappRoutes'); // Rotas antigas do WhatsApp, podem ser removidas/revisadas
const hikvisionRoutes = require('./features/hikvision/hikvision.routes');
const uploadRoutes = require('./features/uploads/upload.routes');
const authRoutes = require('./features/auth/auth.routes');

// --- IMPORTANTE: Importar o Model e a Config de Seeding ---
const { Setting } = db; 
const permanentSettingsConfig = require('./config/permanentSettings.config'); 
const DEFAULT_SETTINGS_DATA = permanentSettingsConfig.defaults; 

// --- IMPORTAR GERENCIADOR DE INSTÂNCIAS WHATSAPP E BRANCH SERVICE ---
const whatsappInstanceManager = require('./features/whatsapp/whatsappInstanceManager');
const branchService = require('./features/branches/branch.service'); // Necessário para o reconnectPersistedSessions

const app = express();

app.use(cors());

app.use(express.json()); 
app.use(express.urlencoded({ extended: true })); 

const uploadsDir = path.join(__dirname, '..', 'uploads');
console.log(`Servindo arquivos estáticos de: ${uploadsDir}`);
app.use('/uploads', express.static(uploadsDir));

// --- API Routes ---
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/administrators`, administratorRoutes);
app.use(`${API_PREFIX}/branches`, branchRoutes); // Contém as novas rotas de gerenciamento do WhatsApp por filial
app.use(`${API_PREFIX}/lockers`, lockerRoutes);
app.use(`${API_PREFIX}/reservations`, reservationRoutes);
app.use(`${API_PREFIX}/payments`, paymentRoutes);
app.use(`${API_PREFIX}/settings`, settingRoutes);
// As rotas em whatsappRoutes (se ainda existirem) provavelmente são para um bot global.
// Se a intenção é ter apenas bots por filial, estas rotas podem ser descontinuadas ou adaptadas.
// Por ora, vamos mantê-las, mas o foco agora são os bots por filial gerenciados via /branches/:branchId/whatsapp/*
app.use(`${API_PREFIX}/whatsapp`, whatsappRoutes); 
app.use(`${API_PREFIX}/hikvisions`, hikvisionRoutes); 
app.use(`${API_PREFIX}/uploads`, uploadRoutes); 


app.get('/', (req, res) => {
  res.send('API is running.');
});


app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err); 

  if (err.status === 401 || err.message === 'Credenciais inválidas.') {
    return res.status(401).json({ message: err.message || 'Não autorizado.' });
  }

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ message: `Arquivo muito grande. Limite de ${err.limit / 1024 / 1024}MB.` });
    }
    return res.status(400).json({ message: `Erro no upload (Multer): ${err.message}` });
  } else if (err.message && err.message.includes('Tipo de arquivo inválido')) {
     return res.status(400).json({ message: err.message });
  }

  let statusCode = 500;
  let message = 'Erro interno do servidor.';

  if (err.name === 'SequelizeValidationError' || (err.message && err.message.includes('Erro de validação'))) {
    statusCode = 400;
    const messages = err.errors ? err.errors.map(e => e.message).join(', ') : err.message;
    message = `Erro de validação: ${messages}`;
  } else if (err.name === 'SequelizeUniqueConstraintError' || (err.message && (err.message.includes('já cadastrado') || err.message.includes('já existe')))) {
    statusCode = 409; 
     const messages = err.errors ? err.errors.map(e => e.message).join(', ') : err.message;
    message = `Erro de duplicação: ${messages}`;
  } else if (err.name === 'SequelizeForeignKeyConstraintError' || (err.message && (err.message.includes('chave estrangeira') || err.message.includes('não encontrada')))) {
      statusCode = 400; 
      message = `Erro de referência: Um registro relacionado necessário não foi encontrado ou fornecido é inválido. Detalhe: ${err.message}`; 
  } else if (err.status) {
    statusCode = err.status;
    message = err.message;
  } else if (err.message && err.message.includes('permanente e não pode ser excluída')) { 
      statusCode = 403; 
      message = err.message;
  } else if (err.message && (err.message.includes('Não é possível excluir') || err.message.includes('possui registros associados'))) {
      statusCode = 409; 
      message = err.message;
  } else if (err.message && err.message.includes('Não foi possível')) { 
     statusCode = err.isClientSafe ? 400 : 500; // Exemplo de como diferenciar erros
     message = err.message;
  }
  
  res.status(statusCode).json({ message });
});


const seedDefaultSettings = async () => {
    console.log('Verificando/Criando configurações padrão...');
    try {
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
        }
        console.log('Verificação de configurações padrão concluída.');
    } catch (error) {
        console.error('Erro durante o seeding das configurações padrão:', error);
    }
};


const PORT = process.env.PORT || 3009;

console.log("Tentando sincronizar com banco de dados...");

db.SQ.sync() 
  .then(async () => { 
    console.log("Banco de Dados sincronizado com sucesso!");

    await seedDefaultSettings();
    
    // --- MODIFICAÇÃO PRINCIPAL AQUI ---
    // Tenta reconectar sessões WhatsApp persistidas após a sincronização do DB e seeding.
    // Passa o branchService para que o instanceManager possa buscar as filiais no DB.
    console.log("Iniciando verificação e reconexão de sessões WhatsApp persistidas...");
    try {
        await whatsappInstanceManager.reconnectPersistedSessions(branchService);
        console.log("Verificação de sessões WhatsApp concluída.");
    } catch (reconnectError) {
        console.error("Erro durante a tentativa de reconectar sessões WhatsApp:", reconnectError);
        // Não impede o servidor de iniciar, mas loga o erro.
    }
    // --- FIM DA MODIFICAÇÃO ---

    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro fatal ao sincronizar com o banco de dados:", err);
    process.exit(1); 
  });