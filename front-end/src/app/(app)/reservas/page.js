// app/reservas/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation'; // Importar para possível redirecionamento
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
    Popconfirm, // Para confirmação de cancelamento
    Tooltip // Adicionado para o Select desabilitado
} from 'antd';
import { SearchOutlined, ClearOutlined, EyeOutlined, StopOutlined, QuestionCircleOutlined, ExclamationCircleOutlined } from '@ant-design/icons'; // Adicionado ExclamationCircleOutlined
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR'; // Locale para Ant Design
import { API_BASE_URL } from '../../config/apiConfig'; // <-- Importa a URL base

dayjs.locale('pt-br');

const { Title, Text } = Typography; // Adicionado Text
const { Option } = Select;
const { RangePicker } = DatePicker;

// --- Funções Auxiliares ---
const getStatusColor = (status) => {
    const map = {
        pending_payment: 'orange',
        active: 'blue',
        awaiting_retrieval: 'purple',
        completed: 'green',
        cancelled: 'red',
    };
    return map[status] || 'default';
};
const statusTextMap = {
    pending_payment: 'Pagamento Pendente',
    active: 'Ativa',
    awaiting_retrieval: 'Aguardando Retirada',
    completed: 'Concluída',
    cancelled: 'Cancelada',
};
const getStatusText = (status) => statusTextMap[status] || status;

const ReservationsPage = () => {
    const router = useRouter();

    // --- Estados ---
    const [reservations, setReservations] = useState([]);
    const [branches, setBranches] = useState([]); // Lista de todas as filiais para filtro (SuperAdmin)
    const [loading, setLoading] = useState(false); // Loading para busca de dados
    const [isDetailModalVisible, setIsDetailModalVisible] = useState(false);
    const [selectedReservation, setSelectedReservation] = useState(null);

    // ** NOVO: Estados para permissões do usuário **
    const [userRole, setUserRole] = useState(null);
    const [userManagedBranchIds, setUserManagedBranchIds] = useState([]);
    const [userManagedBranchNames, setUserManagedBranchNames] = useState([]);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true); // Loading inicial das permissões

    const [filters, setFilters] = useState({
        search: '',
        branchId: null, // Valor inicial é null (SuperAdmin vê todas por padrão)
        paymentStatus: null,
        dateRange: [null, null],
    });
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

    // --- Efeito para carregar permissões do usuário ---
    useEffect(() => {
        console.log("Reservas: Verificando dados do usuário...");
        setIsLoadingPermissions(true);
        let role = null;
        let managedIds = [];
        let managedNames = [];
        let initialBranchFilter = null; // Filtro a ser aplicado na primeira busca

        try {
            const userDataString = sessionStorage.getItem('userData');
            if (!userDataString) throw new Error("Usuário não autenticado.");

            const userData = JSON.parse(userDataString);
            if (!userData || !userData.role) throw new Error("Dados de usuário inválidos.");

            role = userData.role;
            console.log("Reservas: Papel encontrado:", role);
            setUserRole(role);

            if (role === 'branch_admin') {
                if (!userData.branches || !Array.isArray(userData.branches) || userData.branches.length === 0) {
                     console.warn("Reservas: 'branch_admin' sem filiais associadas em userData.");
                     // Pode continuar, mas mostrará zero reservas se a API não filtrar
                     // throw new Error("Administrador de filial sem filial associada."); // Ou lançar erro se for crítico
                     managedIds = []; // Garante array vazio
                     managedNames = [];
                     initialBranchFilter = -1; // ID inválido para não trazer nada se não houver filial
                } else {
                    managedIds = userData.branches.map(b => b.id);
                    managedNames = userData.branches.map(b => b.name);
                    setUserManagedBranchIds(managedIds);
                    setUserManagedBranchNames(managedNames);
                    // Define o filtro inicial para a primeira filial gerenciada
                    initialBranchFilter = managedIds[0];
                    console.log("Reservas: Branch Admin - Filtro inicial definido para filial ID:", initialBranchFilter);
                }
                // Atualiza o estado dos filtros IMEDIATAMENTE para a primeira busca
                setFilters(prev => ({ ...prev, branchId: initialBranchFilter }));

            } else if (role !== 'superadmin') {
                 throw new Error("Papel de usuário não reconhecido.");
            }

            // Se chegou aqui, temos um role válido
            fetchBranches(); // Busca filiais para o Select (SuperAdmin)
            // A busca inicial (`fetchData`) será chamada no outro useEffect, após permissões carregarem

        } catch (err) {
            console.error("Reservas: Erro ao processar dados do usuário.", err);
            message.error(`Erro ao verificar permissões: ${err.message}. Redirecionando para login.`);
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            router.replace('/login');
        } finally {
            setIsLoadingPermissions(false);
        }
    }, [router]);

    // --- Busca de Dados (API) ---
    const fetchData = useCallback(async (page = 1, pageSize = 10, currentFilters) => {
        // Não busca se as permissões ainda estão carregando
        if (isLoadingPermissions) {
            console.log("Reservas: Aguardando carregamento das permissões...");
            return;
        }

        // Garante que temos os filtros mais recentes (importante após a definição inicial pelo useEffect)
        const effectiveFilters = currentFilters || filters;

        setLoading(true);
        console.log("Reservas: Buscando da API com filtros:", effectiveFilters, `Page: ${page}, Size: ${pageSize}`);

        const params = new URLSearchParams({
            // page: page, // Adicionar se API suportar paginação
            // pageSize: pageSize, // Adicionar se API suportar paginação
            include: 'user,branch,lockers,payments'
        });
        if (effectiveFilters.search) params.append('search', effectiveFilters.search);
        if (effectiveFilters.branchId) params.append('branchId', effectiveFilters.branchId); // Envia o ID da filial (seja do admin ou selecionado)
        if (effectiveFilters.paymentStatus) params.append('paymentStatus', effectiveFilters.paymentStatus);
        if (effectiveFilters.dateRange && effectiveFilters.dateRange[0]) params.append('dateFrom', effectiveFilters.dateRange[0].toISOString());
        if (effectiveFilters.dateRange && effectiveFilters.dateRange[1]) params.append('dateTo', effectiveFilters.dateRange[1].toISOString());

        try {
            const response = await fetch(`${API_BASE_URL}/reservations?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao buscar reservas (${response.status})`);
            }
            const data = await response.json();
            setReservations(data);
            setPagination(prev => ({ ...prev, total: data.length, current: page, pageSize })); // Simula paginação no frontend

        } catch (error) {
            console.error("Reservas: Falha ao buscar:", error);
            message.error(`Falha ao carregar reservas: ${error.message}`);
            setReservations([]);
            setPagination(prev => ({ ...prev, total: 0, current: 1 }));
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingPermissions, filters]); // Depende do loading das permissões e dos filtros

     // Busca a lista de filiais para popular o Select (usado apenas por SuperAdmin)
     const fetchBranches = useCallback(async () => {
        console.log("Reservas: Buscando filiais para filtro...");
        try {
            const response = await fetch(`${API_BASE_URL}/branches`);
            if (!response.ok) throw new Error('Falha ao buscar filiais');
            const data = await response.json();
            setBranches(data || []);
        } catch (error) {
            console.error("Reservas: Falha ao buscar filiais:", error);
            message.error(`Falha ao carregar lista de filiais: ${error.message}`);
        }
    }, []);

    // Efeito principal para buscar dados quando filtros, paginação ou permissões mudam
    useEffect(() => {
        // Só busca dados DEPOIS que as permissões foram carregadas
         if (!isLoadingPermissions) {
             // Usa o estado atual de 'filters' que já foi ajustado no useEffect das permissões
            fetchData(pagination.current, pagination.pageSize, filters);
        }
     // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingPermissions, pagination.current, pagination.pageSize, filters]); // Re-busca se a página/tamanho mudar ou filtros mudarem

    // --- Manipuladores de Filtro e Paginação ---
    const handleFilterChange = (key, value) => {
        // Branch admin não pode mudar o filtro de filial
        if (key === 'branchId' && userRole === 'branch_admin') return;

        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, current: 1 })); // Reseta página ao mudar filtro
        // O useEffect acima vai detectar a mudança em 'filters' e chamar fetchData
    };

     const handleTableChange = (newPagination) => {
        // Atualiza o estado da paginação, o useEffect acima tratará da busca
         setPagination(prev => ({
            ...prev,
            current: newPagination.current,
            pageSize: newPagination.pageSize
        }));
    };

    const clearFilters = () => {
        // Reset padrão para superadmin
        let resetFilters = { search: '', branchId: null, paymentStatus: null, dateRange: [null, null] };

         // Para branch admin, mantém o branchId fixo
        if (userRole === 'branch_admin' && userManagedBranchIds.length > 0) {
            resetFilters.branchId = userManagedBranchIds[0];
             console.log("Reservas: Limpando filtros (Branch Admin), mantendo filial ID:", resetFilters.branchId);
        } else {
            console.log("Reservas: Limpando filtros (Super Admin)");
        }

        setFilters(resetFilters);
        setPagination(prev => ({ ...prev, current: 1 }));
         // O useEffect acima vai detectar a mudança em 'filters' e chamar fetchData
    };


    // --- Manipuladores de Modal Detalhes (Mantido) ---
    const showDetailModal = (record) => { /* ...código sem alteração... */ setSelectedReservation(record); setIsDetailModalVisible(true); };
    const handleDetailModalClose = () => { /* ...código sem alteração... */ setIsDetailModalVisible(false); setSelectedReservation(null); };

    // --- Lógica de Cancelamento (API) (Mantido) ---
    const handleConfirmCancel = async (record) => { /* ...código sem alteração... */  if (!record) return; console.log(`Cancelando reserva ID: ${record.id}`); setLoading(true); try { const response = await fetch(`${API_BASE_URL}/reservations/${record.id}/cancel`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, }); if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 409) { throw new Error(errorData.message || 'Não é possível cancelar a reserva neste status.'); } if (response.status === 404) { throw new Error('Reserva não encontrada para cancelamento.'); } throw new Error(errorData.message || `Falha ao cancelar reserva (${response.status})`); } message.success(`Reserva ${record.id} cancelada com sucesso.`); fetchData(pagination.current, pagination.pageSize, filters); } catch (error) { console.error("Falha no cancelamento:", error); message.error(`Falha ao cancelar reserva: ${error.message}`); } finally { setLoading(false); } };


    // --- Definição das Colunas da Tabela (Mantido) ---
    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id },
        {
            title: 'Usuário', dataIndex: ['user', 'name'], key: 'userName',
            render: (name, record) => (<><div>{name || 'N/D'}</div><small>{record.user?.whatsappNumber || '-'}</small></>),
            sorter: (a, b) => (a.user?.name || '').localeCompare(b.user?.name || ''),
        },
        { title: 'Filial', dataIndex: ['branch', 'name'], key: 'branchName', sorter: (a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || '') },
        { title: 'Armários', dataIndex: 'lockers', key: 'lockers', render: (lockers) => lockers?.map(l => l.lockerIdentifier).join(', ') || 'N/D' },
        {
            title: 'Status', dataIndex: 'paymentStatus', key: 'status',
            render: (status) => <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>,
            sorter: (a, b) => (a.paymentStatus || '').localeCompare(b.paymentStatus || ''),
             // Filtro de status ainda funciona para ambos os roles
            filters: Object.keys(statusTextMap).map(s => ({ text: getStatusText(s), value: s })),
            filteredValue: filters.paymentStatus ? [filters.paymentStatus] : null,
            // A filtragem real acontece via API ou pode ser feita no frontend (API é melhor)
             // onFilter: (value, record) => record.paymentStatus === value, // Removido - API filtra
        },
        { title: 'Código Retirada', dataIndex: 'retrievalCode', key: 'retrievalCode' },
        { title: 'Criado Em', dataIndex: 'createdAt', key: 'createdAt', render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/D', sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(), },
        { title: 'Prazo Final', dataIndex: 'dueTime', key: 'dueTime', render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : 'N/D', sorter: (a, b) => dayjs(a.dueTime).unix() - dayjs(b.dueTime).unix(), },
        {
            title: 'Ações', key: 'actions', align: 'center', fixed: 'right', width: 180,
            render: (_, record) => {
                 const canCancel = ['pending_payment', 'active'].includes(record.paymentStatus);
                 return (
                    <Space size="small">
                        {/* <Tooltip title="Ver Detalhes"> */}
                            <Button icon={<EyeOutlined />} onClick={() => showDetailModal(record)} size="small">Detalhes</Button>
                        {/* </Tooltip> */}
                        <Popconfirm title={`Cancelar reserva ID ${record.id}?`} description="Ação definirá status como 'Cancelada'." onConfirm={() => handleConfirmCancel(record)} okText="Sim, Cancelar" cancelText="Não" okButtonProps={{ danger: true }} disabled={!canCancel} icon={<QuestionCircleOutlined style={{ color: 'red' }} />} >
                             <Tooltip title={canCancel ? "Cancelar Reserva" : "Não pode cancelar neste status"}>
                                <span style={{ display: 'inline-block', cursor: !canCancel ? 'not-allowed' : 'pointer' }}>
                                    <Button icon={<StopOutlined />} size="small" danger disabled={!canCancel} style={!canCancel ? { pointerEvents: 'none' } : {}}>Cancelar</Button>
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
                 {/* Título Dinâmico */}
                 <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                     <Col>
                         <Title level={2} style={{ margin: 0 }}>
                             {userRole === 'branch_admin' && userManagedBranchNames.length === 1 ? `Reservas: ${userManagedBranchNames[0]}` : 'Gerenciamento de Reservas'}
                         </Title>
                     </Col>
                     {/* Adicionar botão só faz sentido se o fluxo permitir admin criar reserva */}
                 </Row>

                 {/* Mostra Loading ou Erro inicial */}
                 {isLoadingPermissions && (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}><Spin tip="Verificando permissões..." /></div>
                 )}
                  {!isLoadingPermissions && !userRole && ( // Caso de erro ao carregar permissões
                      <div style={{ padding: '40px 0' }}><Text type="danger">Erro ao carregar dados de permissão. Tente recarregar a página.</Text></div>
                  )}


                {/* Conteúdo Principal (Filtros e Tabela) - Renderiza apenas após carregar permissões */}
                {!isLoadingPermissions && userRole && (
                    <>
                        {/* Barra de Filtros */}
                        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                             {/* Filtro de Busca (Mantido) */}
                             <Col xs={24} sm={12} md={8} lg={6}>
                                <Input.Search placeholder="Buscar Usuário, Código..." allowClear enterButton={<SearchOutlined />}
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    onSearch={(value) => handleFilterChange('search', value)}
                                    disabled={loading} // Desabilita durante carregamento de dados
                                />
                             </Col>
                             {/* Filtro de Filial (Condicional/Desabilitado) */}
                             <Col xs={24} sm={12} md={8} lg={5}>
                                <Tooltip title={userRole === 'branch_admin' ? `Visualizando apenas filial ${userManagedBranchNames.join(', ')}` : 'Filtrar por filial'}>
                                    <Select
                                        placeholder="Filtrar por Filial"
                                        allowClear={userRole === 'superadmin'} // Só permite limpar se for superadmin
                                        style={{ width: '100%' }}
                                        value={filters.branchId} // Controlado pelo estado
                                        onChange={(value) => handleFilterChange('branchId', value)}
                                        loading={branches.length === 0 && loading && userRole === 'superadmin'} // Loading só se superadmin busca
                                        disabled={isLoadingPermissions || loading || userRole === 'branch_admin'} // Desabilita nas condições certas
                                        aria-label={userRole === 'branch_admin' ? `Filial: ${userManagedBranchNames[0]}`: 'Selecionar Filial'}
                                    >
                                        {/* Opção "Todas" apenas para SuperAdmin */}
                                        {userRole === 'superadmin' && (
                                             <Option value={null}>Todas as Filiais</Option>
                                        )}
                                        {/* Popula com todas as filiais (SuperAdmin) ou apenas a gerenciada (BranchAdmin, mas desabilitado) */}
                                         {branches.map(branch => (
                                            <Option key={branch.id} value={branch.id}>{branch.name}</Option>
                                        ))}
                                    </Select>
                                </Tooltip>
                            </Col>
                             {/* Filtro de Status (Mantido) */}
                             <Col xs={24} sm={12} md={8} lg={5}>
                                <Select placeholder="Filtrar por Status" allowClear style={{ width: '100%' }}
                                    value={filters.paymentStatus}
                                    onChange={(value) => handleFilterChange('paymentStatus', value)}
                                    disabled={loading}
                                >
                                    {Object.keys(statusTextMap).map(s => (<Option key={s} value={s}>{getStatusText(s)}</Option>))}
                                </Select>
                            </Col>
                             {/* Filtro de Data (Mantido) */}
                            <Col xs={24} sm={12} md={12} lg={6}>
                                <RangePicker style={{ width: '100%' }} value={filters.dateRange}
                                    onChange={(dates) => handleFilterChange('dateRange', dates)}
                                    format="DD/MM/YYYY"
                                    placeholder={['Início (Criação)', 'Fim (Criação)']}
                                    disabled={loading}
                                />
                            </Col>
                             {/* Botão Limpar */}
                             <Col xs={24} sm={12} md={4} lg={2}>
                                 <Button icon={<ClearOutlined />} onClick={clearFilters} disabled={loading}>Limpar</Button>
                             </Col>
                        </Row>

                        {/* Tabela */}
                         <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                            <Spin spinning={loading} tip="Carregando reservas...">
                                <Table
                                    dataSource={reservations}
                                    columns={columns}
                                    rowKey="id"
                                    scroll={{ x: 'max-content', y: 'calc(100vh - 350px)' }} // Ajustar altura conforme necessidade
                                    pagination={pagination}
                                    onChange={handleTableChange} // Lida com mudança de página/tamanho
                                    style={{ height: '100%' }}
                                    locale={{ emptyText: isLoadingPermissions ? 'Carregando permissões...' : 'Nenhuma reserva encontrada para os filtros selecionados.' }} // Mensagem de vazio
                                />
                            </Spin>
                        </div>
                    </>
                )}
            </div>

            {/* Modal de Detalhes (Mantido) */}
            <Modal title={`Detalhes da Reserva (ID: ${selectedReservation?.id})`} open={isDetailModalVisible} onCancel={handleDetailModalClose} footer={[<Button key="close" onClick={handleDetailModalClose}>Fechar</Button>]} width={800}>
                 {selectedReservation && ( <Descriptions bordered column={{ xxl: 2, xl: 2, lg: 2, md: 1, sm: 1, xs: 1 }} size="small"> <Descriptions.Item label="Nome do Usuário">{selectedReservation.user?.name || 'N/D'}</Descriptions.Item> <Descriptions.Item label="WhatsApp">{selectedReservation.user?.whatsappNumber || 'N/D'}</Descriptions.Item> <Descriptions.Item label="Filial">{selectedReservation.branch?.name || 'N/D'}</Descriptions.Item> <Descriptions.Item label="Armários">{selectedReservation.lockers?.map(l => l.lockerIdentifier).join(', ') || 'N/D'}</Descriptions.Item> <Descriptions.Item label="Status"><Tag color={getStatusColor(selectedReservation.paymentStatus)}>{getStatusText(selectedReservation.paymentStatus)}</Tag></Descriptions.Item> <Descriptions.Item label="Código de Retirada">{selectedReservation.retrievalCode}</Descriptions.Item> <Descriptions.Item label="Criado Em">{dayjs(selectedReservation.createdAt).format('DD/MM/YYYY HH:mm:ss')}</Descriptions.Item> <Descriptions.Item label="Hora Depósito">{selectedReservation.depositTime ? dayjs(selectedReservation.depositTime).format('DD/MM/YYYY HH:mm:ss') : 'N/D'}</Descriptions.Item> <Descriptions.Item label="Prazo Final">{dayjs(selectedReservation.dueTime).format('DD/MM/YYYY HH:mm:ss')}</Descriptions.Item> <Descriptions.Item label="Hora Retirada">{selectedReservation.retrievalTime ? dayjs(selectedReservation.retrievalTime).format('DD/MM/YYYY HH:mm:ss') : 'N/D'}</Descriptions.Item> <Descriptions.Item label="Custo Inicial">{`R$ ${selectedReservation.initialCost?.toFixed(2)}`}</Descriptions.Item> <Descriptions.Item label="Taxa Extra">{`R$ ${selectedReservation.extraFee?.toFixed(2)}`}</Descriptions.Item> <Descriptions.Item label="Total Pago">{`R$ ${selectedReservation.totalPaid?.toFixed(2)}`}</Descriptions.Item> </Descriptions> )}
                 {selectedReservation?.payments && selectedReservation.payments.length > 0 && (<> <Title level={5} style={{marginTop: 20}}>Histórico de Pagamentos</Title> <Table size="small" dataSource={selectedReservation.payments} rowKey="id" pagination={false} columns={[ { title: 'ID Pag.', dataIndex: 'id', key: 'id'}, { title: 'Valor', dataIndex: 'amount', key: 'amount', render: val => `R$ ${val?.toFixed(2)}`}, { title: 'Tipo', dataIndex: 'paymentType', key: 'paymentType', render: type => type === 'initial' ? 'Inicial' : 'Taxa Extra'}, { title: 'Método', dataIndex: 'paymentMethod', key: 'paymentMethod'}, { title: 'Status', dataIndex: 'status', key: 'status'}, { title: 'Gateway ID', dataIndex: 'paymentGatewayId', key: 'paymentGatewayId'}, { title: 'Data', dataIndex: 'createdAt', key: 'createdAt', render: date => dayjs(date).format('DD/MM/YY HH:mm')}, ]} /> </>)}
            </Modal>

        </ConfigProvider>
    );
};

export default ReservationsPage;