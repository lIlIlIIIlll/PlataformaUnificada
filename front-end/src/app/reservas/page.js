// app/reservas/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
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
    message,
    Spin,
    Space,
    ConfigProvider, // Para locale ptBR
    Popconfirm // Para confirmação de cancelamento
} from 'antd';
import { SearchOutlined, ClearOutlined, EyeOutlined, StopOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR'; // Locale para Ant Design
import { API_BASE_URL } from '../config/apiConfig'; // <-- Importa a URL base

dayjs.locale('pt-br');

const { Title } = Typography;
const { Option } = Select;
const { RangePicker } = DatePicker;

// --- Funções Auxiliares (Mantidas) ---
const getStatusColor = (status) => { /* ... (código mantido) ... */ };
const statusTextMap = { /* ... (código mantido) ... */ };
const getStatusText = (status) => { /* ... (código mantido) ... */ };

const ReservationsPage = () => {
    const [reservations, setReservations] = useState([]);
    const [branches, setBranches] = useState([]); // Para filtro de filial
    const [loading, setLoading] = useState(false);
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);
    // const [isCancelModalVisible, setIsCancelModalVisible] = useState(false); // Usaremos Popconfirm agora
    // const [reservationToCancel, setReservationToCancel] = useState(null); // Usaremos Popconfirm agora

    const [filters, setFilters] = useState({
        search: '',
        branchId: null,
        paymentStatus: null, // Nome do filtro pode ser 'paymentStatus' ou só 'status'
        dateRange: [null, null],
    });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

    // --- Busca de Dados (API) ---
    const fetchData = useCallback(async (page = pagination.current, pageSize = pagination.pageSize, currentFilters = filters) => {
        setLoading(true);
        console.log("Buscando reservas da API com filtros:", currentFilters, `Page: ${page}, Size: ${pageSize}`);

        const params = new URLSearchParams({
            // page: page, // Adicionar se API suportar
            // pageSize: pageSize, // Adicionar se API suportar
            include: 'user,branch,lockers,payments' // Inclui dados associados
        });
        if (currentFilters.search) params.append('search', currentFilters.search); // Ajustar nome do param se API usar outro
        if (currentFilters.branchId) params.append('branchId', currentFilters.branchId);
        if (currentFilters.paymentStatus) params.append('paymentStatus', currentFilters.paymentStatus);
        if (currentFilters.dateRange && currentFilters.dateRange[0]) params.append('dateFrom', currentFilters.dateRange[0].toISOString());
        if (currentFilters.dateRange && currentFilters.dateRange[1]) params.append('dateTo', currentFilters.dateRange[1].toISOString());


        try {
            const response = await fetch(`${API_BASE_URL}/reservations?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao buscar reservas (${response.status})`);
            }
            const data = await response.json();
            setReservations(data);
            // Atualizar total da paginação se a API retornar
            // setPagination(prev => ({ ...prev, total: data.totalCount || data.length }));
             setPagination(prev => ({ ...prev, total: data.length, current: page, pageSize })); // Simples para frontend

        } catch (error) {
            console.error("Falha ao buscar reservas:", error);
            message.error(`Falha ao carregar reservas: ${error.message}`);
            setReservations([]);
            setPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setLoading(false);
        }
    }, [pagination.current, pagination.pageSize, filters]); // Dependências

     const fetchBranches = useCallback(async () => {
        // setLoading(true); // Pode ter loading separado
        console.log("Buscando filiais da API para filtro...");
        try {
            const response = await fetch(`${API_BASE_URL}/branches`);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao buscar filiais (${response.status})`);
            }
            const data = await response.json();
            setBranches(data);
        } catch (error) {
            console.error("Falha ao buscar filiais:", error);
            message.error(`Falha ao carregar lista de filiais para filtro: ${error.message}`);
        } finally {
            // setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
        fetchData(pagination.current, pagination.pageSize, filters);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchData, fetchBranches]); // Depende das funções memoizadas

    // --- Manipuladores de Filtro e Paginação ---
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, current: 1 })); // Reset page on filter change
        fetchData(1, pagination.pageSize, newFilters);
    };

     const handleTableChange = (newPagination) => {
        fetchData(newPagination.current, newPagination.pageSize, filters);
    };

    const clearFilters = () => {
        const resetFilters = { search: '', branchId: null, paymentStatus: null, dateRange: [null, null] };
        setFilters(resetFilters);
        setPagination(prev => ({ ...prev, current: 1 }));
        fetchData(1, pagination.pageSize, resetFilters);
    };


    // --- Manipuladores de Modal Detalhes ---
    const showDetailModal = (record) => {
        // Pode ser necessário buscar detalhes completos aqui se a lista não tiver tudo
        setSelectedReservation(record);
        setIsDetailModalVisible(true);
    };

    const handleDetailModalClose = () => {
        setIsDetailModalVisible(false);
        setSelectedReservation(null);
    };

    // --- Lógica de Cancelamento (API) ---
    const handleConfirmCancel = async (record) => {
         if (!record) return;
         console.log(`Cancelando reserva ID: ${record.id}`);
         setLoading(true); // Ativa loading geral ou um específico para a linha?
         try {
            const response = await fetch(`${API_BASE_URL}/reservations/${record.id}/cancel`, {
                method: 'POST',
                 headers: { 'Content-Type': 'application/json' },
                 // Body pode ser necessário dependendo da API (ex: motivo)
                 // body: JSON.stringify({ reason: 'Solicitado pelo usuário/admin' })
            });

            if (!response.ok) {
               const errorData = await response.json().catch(() => ({}));
                if (response.status === 409) { // Conflito (não pode cancelar)
                     throw new Error(errorData.message || 'Não é possível cancelar a reserva neste status.');
                }
                 if (response.status === 404) {
                     throw new Error('Reserva não encontrada para cancelamento.');
                 }
               throw new Error(errorData.message || `Falha ao cancelar reserva (${response.status})`);
            }

            message.success(`Reserva ${record.id} cancelada com sucesso.`);
            fetchData(pagination.current, pagination.pageSize, filters); // Atualizar os dados da tabela

        } catch (error) {
            console.error("Falha no cancelamento:", error);
            message.error(`Falha ao cancelar reserva: ${error.message}`);
        } finally {
             setLoading(false);
        }
    };


    // --- Definição das Colunas da Tabela ---
    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id },
        {
            title: 'Usuário',
            dataIndex: ['user', 'name'],
            key: 'userName',
            render: (name, record) => (
                 <>
                     <div>{name || 'N/D'}</div>
                     <small>{record.user?.whatsappNumber || '-'}</small>
                 </>
            ),
            sorter: (a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''),
        },
        { title: 'Filial', dataIndex: ['branch', 'name'], key: 'branchName', sorter: (a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || '') },
        {
             title: 'Armários',
             dataIndex: 'lockers',
             key: 'lockers',
             render: (lockers) => lockers?.map(l => l.lockerIdentifier).join(', ') || 'N/D'
        },
        {
            title: 'Status',
            dataIndex: 'paymentStatus',
            key: 'status',
            render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
            sorter: (a, b) => (a.paymentStatus || '').localeCompare(b.paymentStatus || ''),
            filters: Object.keys(statusTextMap).map(s => ({ text: getStatusText(s), value: s })),
            // onFilter: (value, record) => record.paymentStatus === value, // Frontend ou API
            filteredValue: filters.paymentStatus ? [filters.paymentStatus] : null,
        },
        { title: 'Código Retirada', dataIndex: 'retrievalCode', key: 'retrievalCode' },
        {
            title: 'Criado Em',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/D',
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        },
        {
            title: 'Prazo Final',
            dataIndex: 'dueTime',
            key: 'dueTime',
            render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/D',
             sorter: (a, b) => dayjs(a.dueTime).unix() - dayjs(b.dueTime).unix(),
        },
        {
            title: 'Ações',
            key: 'actions',
            align: 'center',
            fixed: 'right',
            width: 180, // Aumentar largura para botões
            render: (_, record) => {
                 const canCancel = ['pending_payment', 'active'].includes(record.paymentStatus); // Regra de exemplo
                 return (
                    <Space size="small">
                        <Tooltip title="Ver Detalhes">
                            <Button icon={<EyeOutlined />} onClick={() => showDetailModal(record)} size="small">
                                Detalhes
                            </Button>
                        </Tooltip>
                        <Popconfirm
                            title={`Cancelar reserva ID ${record.id}?`}
                            description="Esta ação definirá o status como 'Cancelada'."
                            onConfirm={() => handleConfirmCancel(record)}
                            okText="Sim, Cancelar"
                            cancelText="Não"
                            okButtonProps={{ danger: true }}
                            disabled={!canCancel} // Desabilita se não puder cancelar
                            icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                        >
                            <Tooltip title={canCancel ? "Cancelar Reserva" : "Não é possível cancelar neste status"}>
                                {/* O span é necessário para o Tooltip funcionar em botão desabilitado */}
                                <span style={{ display: 'inline-block', cursor: !canCancel ? 'not-allowed' : 'pointer' }}>
                                    <Button
                                        icon={<StopOutlined />}
                                        size="small"
                                        danger
                                        disabled={!canCancel}
                                        style={!canCancel ? { pointerEvents: 'none' } : {}} // Previne clique fantasma
                                    >
                                        Cancelar
                                    </Button>
                                </span>
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                );
            }
        },
    ];

    // --- Renderização ---
    return (
        <ConfigProvider locale={ptBR}>
            <Head>
                <title>Gerenciamento de Reservas</title>
            </Head>
             <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                <Title level={2} style={{ marginBottom: '16px' }}>Gerenciamento de Reservas</Title>

                {/* Barra de Filtros */}
                <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                     <Col xs={24} sm={12} md={8} lg={6}>
                        <Input.Search
                            placeholder="Buscar Usuário, Código..." // Ajustar placeholder
                            allowClear
                            enterButton={<SearchOutlined />}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            onSearch={(value) => handleFilterChange('search', value)}
                        />
                     </Col>
                     <Col xs={24} sm={12} md={8} lg={5}>
                        <Select
                            placeholder="Filtrar por Filial"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.branchId}
                            onChange={(value) => handleFilterChange('branchId', value)}
                            loading={branches.length === 0 && loading}
                        >
                            {branches.map(branch => (
                                <Option key={branch.id} value={branch.id}>{branch.name}</Option>
                            ))}
                        </Select>
                    </Col>
                     <Col xs={24} sm={12} md={8} lg={5}>
                        <Select
                            placeholder="Filtrar por Status"
                            allowClear
                            style={{ width: '100%' }}
                            value={filters.paymentStatus}
                             onChange={(value) => handleFilterChange('paymentStatus', value)}
                        >
                            {Object.keys(statusTextMap).map(s => (
                                <Option key={s} value={s}>{getStatusText(s)}</Option>
                            ))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={12} lg={6}>
                        <RangePicker
                            style={{ width: '100%' }}
                            value={filters.dateRange}
                            onChange={(dates) => handleFilterChange('dateRange', dates)}
                            format="DD/MM/YYYY"
                            placeholder={['Data Início (Criação)', 'Data Fim (Criação)']}
                        />
                    </Col>
                     <Col xs={24} sm={12} md={4} lg={2}>
                         <Button icon={<ClearOutlined />} onClick={clearFilters}>
                             Limpar
                         </Button>
                     </Col>
                </Row>

                {/* Tabela */}
                 <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                    <Spin spinning={loading} tip="Carregando reservas...">
                        <Table
                            dataSource={reservations}
                            columns={columns}
                            rowKey="id"
                            scroll={{ x: 'max-content', y: 'calc(100vh - 350px)' }}
                            pagination={pagination}
                            onChange={handleTableChange}
                            style={{ height: '100%' }}
                        />
                    </Spin>
                </div>
            </div>

            {/* Modal de Detalhes */}
            <Modal
                title={`Detalhes da Reserva (ID: ${selectedReservation?.id})`}
                open={isDetailModalVisible}
                onCancel={handleDetailModalClose}
                footer={[
                    <Button key="close" onClick={handleDetailModalClose}>
                        Fechar
                    </Button>,
                    // Botão Cancelar dentro do modal (opcional, já existe na linha)
                    // <Popconfirm ... onConfirm={() => handleConfirmCancel(selectedReservation)} ...>
                    //     <Button key="cancel" icon={<StopOutlined />} danger disabled={!canCancel}>
                    //         Cancelar Reserva
                    //     </Button>
                    // </Popconfirm>,
                ]}
                width={800}
            >
                {selectedReservation && (
                     <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} size="small">
                        <Descriptions.Item label="Nome do Usuário">{selectedReservation.user?.name || 'N/D'}</Descriptions.Item>
                        <Descriptions.Item label="WhatsApp">{selectedReservation.user?.whatsappNumber || 'N/D'}</Descriptions.Item>
                        <Descriptions.Item label="Filial">{selectedReservation.branch?.name || 'N/D'}</Descriptions.Item>
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
                        {/* TODO: Adicionar tabela/lista de pagamentos (selectedReservation.payments) */}
                    </Descriptions>
                )}
                 {selectedReservation?.payments && selectedReservation.payments.length > 0 && (
                    <>
                        <Title level={5} style={{marginTop: 20}}>Histórico de Pagamentos</Title>
                        <Table
                            size="small"
                            dataSource={selectedReservation.payments}
                            rowKey="id"
                            pagination={false}
                            columns={[
                                { title: 'ID Pag.', dataIndex: 'id', key: 'id'},
                                { title: 'Valor', dataIndex: 'amount', key: 'amount', render: val => `R$ ${val?.toFixed(2)}`},
                                { title: 'Tipo', dataIndex: 'paymentType', key: 'paymentType', render: type => type === 'initial' ? 'Inicial' : 'Taxa Extra'},
                                { title: 'Método', dataIndex: 'paymentMethod', key: 'paymentMethod'},
                                { title: 'Status', dataIndex: 'status', key: 'status'},
                                { title: 'Gateway ID', dataIndex: 'paymentGatewayId', key: 'paymentGatewayId'},
                                { title: 'Data', dataIndex: 'createdAt', key: 'createdAt', render: date => dayjs(date).format('DD/MM/YY HH:mm')},
                            ]}
                        />
                    </>
                 )}
            </Modal>

            {/* Modal de Confirmação de Cancelamento REMOVIDO - Usando Popconfirm na linha */}

        </ConfigProvider>
    );
};

export default ReservationsPage;