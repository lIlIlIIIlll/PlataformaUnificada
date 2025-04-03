'use client'

// pages/reservations/index.js
import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import {
    Table,
    Typography,
    Input,
    Select,
    DatePicker,
    Button,
    Row,
    Col,
    Tag,
    Modal,
    Descriptions,
    message, // Para exibir feedback
    Spin,    // Para estado de carregamento
    Space,   // Para layout na barra de filtros
} from 'antd';
import { SearchOutlined, ClearOutlined, EyeOutlined, StopOutlined } from '@ant-design/icons';
import dayjs from 'dayjs'; // Garanta que dayjs está instalado (`npm install dayjs`) ou use Date nativo
import 'dayjs/locale/pt-br'; // Importar locale pt-br para dayjs (opcional, mas bom para formatação)
dayjs.locale('pt-br'); // Definir locale globalmente para dayjs (opcional)


// --- Funções Auxiliares (Exemplo) ---
const getStatusColor = (status) => {
    switch (status) {
        case 'pending_payment':
            return 'orange';
        case 'active':
            return 'blue';
        case 'awaiting_retrieval':
            return 'purple';
        case 'completed':
            return 'green';
        case 'cancelled':
            return 'red';
        default:
            return 'default';
    }
};

// Mapeamento de status para texto em Português
const statusTextMap = {
    'pending_payment': 'Pagamento Pendente',
    'active': 'Ativa',
    'awaiting_retrieval': 'Aguardando Retirada',
    'completed': 'Concluída',
    'cancelled': 'Cancelada',
};

const getStatusText = (status) => {
    return statusTextMap[status] || status.replace('_', ' ').toUpperCase(); // Fallback caso o status não esteja mapeado
};


// --- Dados Fictícios (Substituir por Chamada API) ---
const dummyReservations = [
    {
        id: 1,
        user: { id: 101, name: 'Alice Silva', whatsappNumber: '+5511987654321' },
        branch: { id: 1, name: 'Filial Centro' },
        lockers: [{ id: 1, lockerIdentifier: 'A01' }, { id: 2, lockerIdentifier: 'A02' }],
        paymentStatus: 'active', // Chave NÃO traduzida
        retrievalCode: 123456,
        depositTime: '2023-10-26T10:00:00Z',
        dueTime: '2023-10-27T10:00:00Z',
        initialCost: 50.00,
        extraFee: 0.00,
        totalPaid: 50.00,
        createdAt: '2023-10-26T09:55:00Z',
    },
    {
        id: 2,
        user: { id: 102, name: 'Bruno Costa', whatsappNumber: '+5521912345678' },
        branch: { id: 2, name: 'Filial Praia' },
        lockers: [{ id: 15, lockerIdentifier: 'P10' }],
        paymentStatus: 'completed', // Chave NÃO traduzida
        retrievalCode: 654321,
        depositTime: '2023-10-25T14:30:00Z',
        retrievalTime: '2023-10-25T18:00:00Z', // Adicionado para status concluído
        dueTime: '2023-10-26T14:30:00Z',
        initialCost: 50.00,
        extraFee: 0.00,
        totalPaid: 50.00,
        createdAt: '2023-10-25T14:25:00Z',
    },
     {
        id: 3,
        user: { id: 103, name: 'Carla Dias', whatsappNumber: '+5531999887766' },
        branch: { id: 1, name: 'Filial Centro' },
        lockers: [{ id: 3, lockerIdentifier: 'A03' }],
        paymentStatus: 'pending_payment', // Chave NÃO traduzida
        retrievalCode: 987123,
        depositTime: '2023-10-27T11:00:00Z', // Horário de início placeholder
        dueTime: '2023-10-28T11:00:00Z',
        initialCost: 50.00,
        extraFee: 0.00,
        totalPaid: 0.00,
        createdAt: '2023-10-27T10:58:00Z',
    },
    {
        id: 4,
        user: { id: 101, name: 'Alice Silva', whatsappNumber: '+5511987654321' },
        branch: { id: 1, name: 'Filial Centro' },
        lockers: [{ id: 5, lockerIdentifier: 'B01' }],
        paymentStatus: 'cancelled', // Chave NÃO traduzida
        retrievalCode: 321654,
        depositTime: '2023-10-24T08:15:00Z',
        dueTime: '2023-10-25T08:15:00Z',
        initialCost: 50.00,
        extraFee: 0.00,
        totalPaid: 0.00,
        createdAt: '2023-10-24T08:10:00Z',
    },
];

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

const ReservationsPage = () => {
    const [reservations, setReservations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    const [isCancelModalVisible, setIsCancelModalVisible] = useState(false);
    const [reservationToCancel, setReservationToCancel] = useState(null);

    // --- Estados dos Filtros ---
    const [filters, setFilters] = useState({
        search: '',
        branchId: null,
        status: null, // Chave do status (e.g., 'pending_payment')
        dateRange: [null, null], // [dataInicio, dataFim] usando objetos dayjs
    });

    // --- Busca de Dados ---
    const fetchData = async () => {
        setLoading(true);
        console.log("Buscando dados com filtros:", filters); // Log dos filtros usados
        try {
            // Substituir pela chamada API real
            // const params = new URLSearchParams();
            // if (filters.search) params.append('search', filters.search); // Ajustar nome do parâmetro conforme API
            // if (filters.branchId) params.append('branchId', filters.branchId);
            // if (filters.status) params.append('paymentStatus', filters.status); // Usar a chave do status
            // if (filters.dateRange[0]) params.append('dateFrom', filters.dateRange[0].toISOString());
            // if (filters.dateRange[1]) params.append('dateTo', filters.dateRange[1].toISOString());

            // const response = await fetch(`/api/v1/reservations?${params.toString()}`);
            // if (!response.ok) {
            //     throw new Error(`Erro na API: ${response.statusText}`);
            // }
            // const data = await response.json();
            // setReservations(data);

            // --- Usando Dados Fictícios ---
            await new Promise(resolve => setTimeout(resolve, 500)); // Simular atraso de rede
            // Filtragem básica para dados fictícios (substituir por filtragem da API)
             let filteredData = dummyReservations.filter(res => {
                 const searchLower = filters.search.toLowerCase();
                 const matchesSearch = !filters.search ||
                     res.user.name.toLowerCase().includes(searchLower) ||
                     res.user.whatsappNumber.includes(searchLower) ||
                     String(res.retrievalCode).includes(searchLower);

                 const matchesBranch = !filters.branchId || res.branch.id === filters.branchId;
                 const matchesStatus = !filters.status || res.paymentStatus === filters.status; // Comparar com a chave
                 const matchesDate = (!filters.dateRange[0] || dayjs(res.createdAt).isAfter(filters.dateRange[0])) &&
                                     (!filters.dateRange[1] || dayjs(res.createdAt).isBefore(filters.dateRange[1]));

                 return matchesSearch && matchesBranch && matchesStatus && matchesDate;
             });

            setReservations(filteredData);
            // --- Fim Dados Fictícios ---

        } catch (error) {
            console.error("Falha ao buscar reservas:", error);
            message.error(`Falha ao carregar reservas: ${error.message}`);
            setReservations([]); // Limpar dados em caso de erro
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]); // Re-buscar quando os filtros mudarem

    // --- Manipuladores de Filtro ---
    const handleFilterChange = (key, value) => {
        // Se for o filtro de status, armazenamos a chave ('pending_payment', etc.)
        setFilters(prev => ({ ...prev, [key]: value }));
        // A busca é disparada pelo hook useEffect que escuta 'filters'
    };

    const handleSearch = (value) => {
         handleFilterChange('search', value);
    };

    const clearFilters = () => {
        setFilters({
            search: '',
            branchId: null,
            status: null,
            dateRange: [null, null],
        });
         // A busca é disparada pelo hook useEffect que escuta 'filters'
    };


    // --- Manipuladores de Modal ---
    const showDetailModal = (record) => {
        setSelectedReservation(record);
        setIsDetailModalVisible(true);
    };

    const handleDetailModalClose = () => {
        setIsDetailModalVisible(false);
        setSelectedReservation(null);
    };

     const showCancelModal = (record) => {
         // Verificação básica se o cancelamento é possível baseado no status
         if (!['pending_payment', 'active'].includes(record.paymentStatus)) {
             message.warning(`Não é possível cancelar reserva com status '${getStatusText(record.paymentStatus)}'.`);
             return;
         }
        setReservationToCancel(record);
        setIsCancelModalVisible(true);
    };

     const handleCancelModalClose = () => {
        setIsCancelModalVisible(false);
        setReservationToCancel(null);
    };

    const handleConfirmCancel = async () => {
         if (!reservationToCancel) return;
         console.log(`Cancelando reserva ID: ${reservationToCancel.id}`);
         // --- Substituir pela Chamada API Real ---
         try {
            // const response = await fetch(`/api/v1/reservations/${reservationToCancel.id}/cancel`, { method: 'POST' });
            // if (!response.ok) {
            //    const errorData = await response.json();
            //    throw new Error(errorData.message || `Falha ao cancelar reserva (${response.status})`);
            // }

             // --- Simular Sucesso ---
             await new Promise(resolve => setTimeout(resolve, 300));
             // --- Fim Simulação ---

            message.success(`Reserva ${reservationToCancel.id} cancelada com sucesso.`);
            handleCancelModalClose();
            fetchData(); // Atualizar os dados da tabela
        } catch (error) {
            console.error("Falha no cancelamento:", error);
            message.error(`Falha ao cancelar reserva: ${error.message}`);
            handleCancelModalClose(); // Fechar modal mesmo em caso de falha
        }
         // --- Fim Chamada API ---
    };


    // --- Definição das Colunas da Tabela ---
    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id },
        {
            title: 'Usuário',
            dataIndex: ['user', 'name'], // Acessar dado aninhado
            key: 'userName',
            render: (name, record) => (
                 // Link para página de detalhes do usuário depois?
                 <>
                     <div>{name}</div>
                     <small>{record.user?.whatsappNumber}</small>
                 </>
            ),
            sorter: (a, b) => a.user.name.localeCompare(b.user.name),
        },
        { title: 'Filial', dataIndex: ['branch', 'name'], key: 'branchName', sorter: (a, b) => a.branch.name.localeCompare(b.branch.name) },
        {
             title: 'Armários',
             dataIndex: 'lockers',
             key: 'lockers',
             render: (lockers) => lockers?.map(l => l.lockerIdentifier).join(', ') || 'N/D' // N/D = Não Disponível
        },
        {
            title: 'Status',
            dataIndex: 'paymentStatus', // Dado é a chave do status
            key: 'status',
            render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>, // Renderiza o texto traduzido
            sorter: (a, b) => a.paymentStatus.localeCompare(b.paymentStatus),
             // Adicionar filtro dropdown diretamente no cabeçalho se desejado
            // filters: Object.keys(statusTextMap).map(s => ({ text: getStatusText(s), value: s })),
            // onFilter: (value, record) => record.paymentStatus === value,
        },
        { title: 'Código de Retirada', dataIndex: 'retrievalCode', key: 'retrievalCode' },
        {
            title: 'Criado Em',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/D', // Formato pt-BR
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        },
        {
            title: 'Prazo Final',
            dataIndex: 'dueTime',
            key: 'dueTime',
            render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/D', // Formato pt-BR
             sorter: (a, b) => dayjs(a.dueTime).unix() - dayjs(b.dueTime).unix(),
        },
        {
            title: 'Ações',
            key: 'actions',
            render: (_, record) => (
                <Space size="small">
                    <Button icon={<EyeOutlined />} onClick={() => showDetailModal(record)} size="small">
                        Detalhes
                    </Button>
                    <Button
                        icon={<StopOutlined />}
                        onClick={() => showCancelModal(record)}
                        size="small"
                        danger
                        disabled={!['pending_payment', 'active'].includes(record.paymentStatus)} // Desabilitar baseado no status (chave)
                    >
                        Cancelar
                    </Button>
                    {/* Adicionar outras ações como Adicionar Observação/Taxa depois */}
                </Space>
            ),
        },
    ];

    // --- Renderização ---
    return (
        <>
            <Head>
                <title>Gerenciamento de Reservas</title>
            </Head>
            <Title level={2}>Gerenciamento de Reservas</Title>

            {/* --- Barra de Filtros --- */}
            <Space direction="vertical" size="middle" style={{ display: 'flex', marginBottom: 16 }}>
                 <Row gutter={[16, 16]}>
                     <Col xs={24} sm={12} md={8} lg={6}>
                        <Input.Search
                            placeholder="Buscar Usuário, WhatsApp, Código..."
                            allowClear
                            enterButton={<SearchOutlined />}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)} // Atualiza ao digitar
                            onSearch={handleSearch} // Dispara busca explicitamente se necessário
                        />
                     </Col>
                     <Col xs={24} sm={12} md={8} lg={5}>
                        <Select
                            placeholder="Filtrar por Filial"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.branchId}
                            onChange={(value) => handleFilterChange('branchId', value)}
                        >
                            {/* TODO: Buscar filiais dinamicamente */}
                            <Option value={1}>Filial Centro</Option>
                            <Option value={2}>Filial Praia</Option>
                        </Select>
                    </Col>
                     <Col xs={24} sm={12} md={8} lg={5}>
                        <Select
                            placeholder="Filtrar por Status"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.status} // O valor ainda é a chave (e.g., 'pending_payment')
                             onChange={(value) => handleFilterChange('status', value)}
                        >
                             {/* Usar constante se disponível */}
                            {Object.keys(statusTextMap).map(s => (
                                <Option key={s} value={s}>{getStatusText(s)}</Option> // Mostra texto traduzido, valor é a chave
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={6}>
                        <RangePicker
                            style={{ width: '100%' }}
                            value={filters.dateRange}
                            onChange={(dates) => handleFilterChange('dateRange', dates)}
                            // locale={ptBR} // Pode precisar importar o locale de antd/es/date-picker/locale/pt_BR
                            format="DD/MM/YYYY" // Definir formato explicitamente se necessário
                            placeholder={['Data de Início', 'Data de Fim']} // Adicionado placeholder em Português
                        />
                    </Col>
                     <Col xs={24} sm={12} md={4} lg={2}>
                         <Button icon={<ClearOutlined />} onClick={clearFilters}>
                             Limpar
                         </Button>
                     </Col>
                </Row>
             </Space>

            {/* --- Tabela --- */}
            <Spin spinning={loading} tip="Carregando...">
                <Table
                    dataSource={reservations}
                    columns={columns}
                    rowKey="id"
                    scroll={{ x: 'max-content' }} // Habilita scroll horizontal em telas menores
                    // pagination={{ pageSize: 10 }} // Adicionar paginação depois
                />
            </Spin>

            {/* --- Modal de Detalhes --- */}
            <Modal
                title={`Detalhes da Reserva (ID: ${selectedReservation?.id})`}
                open={isDetailModalVisible}
                onCancel={handleDetailModalClose}
                footer={[
                    <Button key="close" onClick={handleDetailModalClose}>
                        Fechar
                    </Button>,
                    // Adicionar outras ações aqui se necessário (ex: Cancelar)
                     <Button
                        key="cancel"
                        icon={<StopOutlined />}
                        onClick={() => {
                             handleDetailModalClose(); // Fecha este modal primeiro
                             showCancelModal(selectedReservation); // Então abre o de confirmação de cancelamento
                        }}
                        danger
                        disabled={!selectedReservation || !['pending_payment', 'active'].includes(selectedReservation.paymentStatus)}
                    >
                        Cancelar Reserva
                    </Button>,
                ]}
                width={800}
            >
                {selectedReservation && (
                     <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} size="small">
                        <Descriptions.Item label="Nome do Usuário">{selectedReservation.user?.name}</Descriptions.Item>
                        <Descriptions.Item label="WhatsApp do Usuário">{selectedReservation.user?.whatsappNumber}</Descriptions.Item>
                        <Descriptions.Item label="Filial">{selectedReservation.branch?.name}</Descriptions.Item>
                        <Descriptions.Item label="Armários">{selectedReservation.lockers?.map(l => l.lockerIdentifier).join(', ') || 'N/D'}</Descriptions.Item>
                        <Descriptions.Item label="Status"><Tag color={getStatusColor(selectedReservation.paymentStatus)}>{getStatusText(selectedReservation.paymentStatus)}</Tag></Descriptions.Item>
                        <Descriptions.Item label="Código de Retirada">{selectedReservation.retrievalCode}</Descriptions.Item>
                        <Descriptions.Item label="Criado Em">{dayjs(selectedReservation.createdAt).format('DD/MM/YYYY HH:mm:ss')}</Descriptions.Item>
                        <Descriptions.Item label="Hora Depósito">{selectedReservation.depositTime ? dayjs(selectedReservation.depositTime).format('DD/MM/YYYY HH:mm:ss') : 'N/D'}</Descriptions.Item>
                        <Descriptions.Item label="Prazo Final">{dayjs(selectedReservation.dueTime).format('DD/MM/YYYY HH:mm:ss')}</Descriptions.Item>
                        <Descriptions.Item label="Hora Retirada">{selectedReservation.retrievalTime ? dayjs(selectedReservation.retrievalTime).format('DD/MM/YYYY HH:mm:ss') : 'N/D'}</Descriptions.Item>
                        <Descriptions.Item label="Custo Inicial">{`R$ ${selectedReservation.initialCost?.toFixed(2)}`}</Descriptions.Item>
                        <Descriptions.Item label="Taxa Extra">{`R$ ${selectedReservation.extraFee?.toFixed(2)}`}</Descriptions.Item>
                        <Descriptions.Item label="Total Pago">{`R$ ${selectedReservation.totalPaid?.toFixed(2)}`}</Descriptions.Item>
                        {/* Adicionar Link/Tabela de Histórico de Pagamento aqui depois */}
                    </Descriptions>
                )}
            </Modal>

            {/* --- Modal de Confirmação de Cancelamento --- */}
            <Modal
                title="Confirmar Cancelamento"
                open={isCancelModalVisible}
                onOk={handleConfirmCancel}
                onCancel={handleCancelModalClose}
                okText="Sim, Cancelar Reserva"
                cancelText="Não"
                okButtonProps={{ danger: true }}
            >
                <p>Tem certeza que deseja cancelar a reserva ID: <strong>{reservationToCancel?.id}</strong>?</p>
                <p>Usuário: {reservationToCancel?.user?.name} ({reservationToCancel?.user?.whatsappNumber})</p>
                <p>Esta ação não pode ser desfeita facilmente.</p>
            </Modal>
        </>
    );
};

export default ReservationsPage;

// TODO: Implementar chamadas API reais
// TODO: Adicionar paginação adequada à Tabela e chamadas API
// TODO: Buscar lista de Filiais dinamicamente para o dropdown de filtro
// TODO: Adicionar verificações de Autenticação/Autorização
// TODO: Implementar funcionalidade de Adicionar Observação/Taxa
// TODO: Considerar dividir em componentes menores (ex: FilterBar, ReservationDetailModal)