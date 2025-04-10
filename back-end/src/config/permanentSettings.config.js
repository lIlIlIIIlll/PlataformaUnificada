// src/config/permanentSettings.config.js

// Defina aqui os dados padrão para as configurações que devem existir
// e não podem ser excluídas pela API.
const defaultSettingsData = [
    {
        name: 'custo_base_armario',
        value: '5.00',
        description: 'Valor base cobrado por hora de uso do locker.',
    },
    {
        name: 'horas_maximas_reserva',
        value: '2',
        description: 'Tempo máximo inicial (em horas) que uma reserva pode ser feita antes de gerar cobrança adicional.',
    },
    {
        name: 'valor_base_por_hora_atraso',
        value: '1.5',
        description: 'Multiplicador aplicado sobre a taxa base para cada hora excedida do tempo de reserva.',
    },
    // Adicione outras configurações permanentes aqui
];

// Cria um Set com os nomes para verificação rápida (usado no service)
const permanentSettingNames = new Set(defaultSettingsData.map(setting => setting.name));

module.exports = {
    // Lista de objetos com os dados padrão (usado no seeding em app.js)
    defaults: defaultSettingsData,
    // Set contendo apenas os nomes/chaves (usado na verificação em setting.service.js)
    names: permanentSettingNames,
};