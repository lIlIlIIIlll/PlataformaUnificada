const express = require('express');
const router = express.Router();
const whatsappController = require('./whatsappController'); // Ajuste o caminho

// Rota para solicitar uma nova sessão e obter o QR Code
// Usar POST pode ser semanticamente melhor, pois cria um recurso (sessão)
router.post('/new-session', whatsappController.getNewWhatsAppSession);


module.exports = router;