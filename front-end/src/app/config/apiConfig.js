// src/config/apiConfig.js

// Defina a URL base da sua API backend aqui
// Certifique-se de que esta URL esteja acessível a partir do seu ambiente de frontend
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.100.200:3009/api/v1';

// Você pode adicionar outras configurações aqui se necessário
// Ex: const API_TIMEOUT = 10000;

export { API_BASE_URL };