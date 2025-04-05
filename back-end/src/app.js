// src/app.js
const express = require('express');
const db = require('./index'); // Ensure this initializes models and associations
const cors = require('cors'); 

// Import Routes
const userRoutes = require('./features/users/user.routes');
const administratorRoutes = require('./features/administrators/administrator.routes');
const branchRoutes = require('./features/branches/branch.routes');
const lockerRoutes = require('./features/lockers/locker.routes');
const reservationRoutes = require('./features/reservations/locker_reservation.routes');
const paymentRoutes = require('./features/payments/payment.routes');
const settingRoutes = require('./features/settings/setting.routes');
const whatsappRoutes = require('./features/whatsapp/whatsappRoutes');
// Import other routes as needed

const app = express();

app.use(cors())

// Middlewares essenciais
app.use(express.json()); // Para parsear JSON no corpo das requisições
app.use(express.urlencoded({ extended: true })); // Para parsear dados de formulário URL-encoded

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

// Mount other routes

// Simple Root Route for health check or info
app.get('/', (req, res) => {
  res.send('API is running.');
});


// --- Global Error Handler (Example) ---
// Place this AFTER all your routes
app.use((err, req, res, next) => {
  console.error("Global Error Handler:", err); // Log the error

  // Default error status and message
  let statusCode = 500;
  let message = 'Erro interno do servidor.';

  // Customize based on error type (examples)
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = `Erro de validação: ${err.errors.map(e => e.message).join(', ')}`;
  } else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409; // Conflict
    message = `Erro de duplicação: ${err.errors.map(e => e.message).join(', ')}`;
  } else if (err.name === 'SequelizeForeignKeyConstraintError') {
      statusCode = 400; // Or 409 depending on context
      // You might need more logic to determine *which* foreign key failed
      message = 'Erro de referência: Um registro relacionado não foi encontrado.';
  } else if (err.status) {
    // If the error has a specific status code attached
    statusCode = err.status;
    message = err.message;
  } else if (err.message.includes('Não foi possível')) { // Catch custom service errors
     statusCode = 500; // Or maybe 400 depending on the error context
     message = err.message;
  }
  // Add more specific error checks as needed

  res.status(statusCode).json({ message });
});


// --- Server Initialization ---
const PORT = process.env.PORT || 3009;

console.log("Tentando sincronizar com banco de dados...");

db.SQ.sync() // Use the instance from db object
  .then(() => {
    console.log("Banco de Dados sincronizado com sucesso!");
    app.listen(PORT, () => {
      console.log(`Servidor rodando na porta ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Erro fatal ao sincronizar com o banco de dados:", err);
    process.exit(1); // Exit if DB sync fails
  });