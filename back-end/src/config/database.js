// src/config/database.js
const { Sequelize } = require('sequelize');
const path = require('path');
const storagePath = path.join(__dirname, '..', '..', 'database.sqlite');


const SQ = new Sequelize({
    dialect:'sqlite',
    storage:storagePath
});

module.exports = SQ;