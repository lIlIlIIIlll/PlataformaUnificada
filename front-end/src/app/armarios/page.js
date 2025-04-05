// app/armarios/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Table,
    Typography,
    Button,
    Modal,
    Form,
    Input,
    Select,
    message,
    Spin,
    Tag,
    Space,
    Tooltip,
    Row,
    Col,
    Popconfirm,
    ConfigProvider // Para locale ptBR
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, QuestionCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR'; // Locale para Ant Design
import { API_BASE_URL } from '../config/apiConfig'; // <-- Importa a URL base

dayjs.locale('pt-br');

const { Title } = Typography;
const { Option } = Select;

// Mapeamento de status (pode vir da API ou ser mantido no frontend)
const lockerStatusMap = {
    available: { text: 'Disponível', color: 'green' },
    occupied: { text: 'Ocupado', color: 'red' },
    maintenance: { text: 'Manutenção', color: 'orange' },
    reserved: { text: 'Reservado', color: 'blue' }, // Adicionado
};

const getLockerStatusTag = (status) => {
    const statusInfo = lockerStatusMap[status] || { text: status, color: 'default' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
};

const LockersPage = () => {
    const [lockers, setLockers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingLocker, setEditingLocker] = useState(null);
    const [form] = Form.useForm();
    const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 }); // Estado de paginação

    // --- Busca de Dados da API ---
    const fetchLockers = useCallback(async (page = pagination.current, pageSize = pagination.pageSize) => {
        setLoading(true);
        console.log(`Buscando armários da API: page=${page}, pageSize=${pageSize}`);
        try {
            // Adicionar parâmetros de paginação e include se a API suportar
            // const params = new URLSearchParams({ page: page, pageSize: pageSize, include: 'branch' });
            const params = new URLSearchParams({ include: 'branch' }); // Inclui filial
            const response = await fetch(`${API_BASE_URL}/lockers?${params.toString()}`);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})); // Tenta pegar corpo do erro
                throw new Error(errorData.message || `Falha ao buscar armários (${response.status})`);
            }
            const data = await response.json();
            setLockers(data);
            // Atualizar total da paginação se a API retornar
            // setPagination(prev => ({ ...prev, total: data.totalCount || data.length })); // Ajustar conforme API
            setPagination(prev => ({ ...prev, total: data.length, current: page, pageSize })); // Simples para frontend

        } catch (error) {
            console.error("Falha ao buscar armários:", error);
            message.error(`Falha ao carregar armários: ${error.message}`);
            setLockers([]); // Limpa em caso de erro
            setPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setLoading(false);
        }
    }, [pagination.current, pagination.pageSize]); // Dependências

    const fetchBranches = useCallback(async () => {
        // setLoading(true); // Pode ter loading separado
        console.log("Buscando filiais da API...");
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
            message.error(`Falha ao carregar lista de filiais: ${error.message}`);
        } finally {
            // setLoading(false);
        }
    }, []); // Sem dependências, busca uma vez

    useEffect(() => {
        fetchBranches();
        fetchLockers(pagination.current, pagination.pageSize);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchBranches, fetchLockers]); // Depende das funções memoizadas

    // --- Manipuladores de Paginação ---
     const handleTableChange = (newPagination) => {
        fetchLockers(newPagination.current, newPagination.pageSize);
    };


    // --- Manipuladores do Modal ---
    const showAddModal = () => {
        setEditingLocker(null);
        form.resetFields();
        form.setFieldsValue({ status: 'available' }); // Valor padrão para criação
        setIsModalVisible(true);
    };

    const showEditModal = (record) => {
        setEditingLocker(record);
        form.setFieldsValue({
            lockerIdentifier: record.lockerIdentifier,
            branchId: record.branchId, // API usa branchId
            status: record.status,
            deviceId: record.deviceId,
        });
        setIsModalVisible(true);
    }

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingLocker(null);
    };

    // --- Lógica de Criação/Edição (API) ---
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);
            const url = editingLocker
                ? `${API_BASE_URL}/lockers/${editingLocker.id}`
                : `${API_BASE_URL}/lockers`;
            const method = editingLocker ? 'PUT' : 'POST';

            console.log(`Enviando para ${method} ${url}:`, values);

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 // Tratar erros específicos da API
                 if (response.status === 409) { // Conflito (identificador duplicado)
                     throw new Error(errorData.message || 'Identificador de armário já existe nesta filial.');
                 }
                 if (response.status === 400) { // Bad Request (validação, filial não existe)
                      throw new Error(errorData.message || 'Dados inválidos. Verifique a filial e o status.');
                 }
                throw new Error(errorData.message || `Falha ao ${editingLocker ? 'atualizar' : 'criar'} armário (${response.status})`);
            }

            const result = await response.json(); // Pega o armário criado/atualizado

            message.success(`Armário ${result.lockerIdentifier} ${editingLocker ? 'atualizado' : 'criado'} com sucesso!`);
            setIsModalVisible(false);
            fetchLockers(pagination.current, pagination.pageSize); // Rebusca a lista

        } catch (errorInfo) {
            console.error('Falha na validação ou API:', errorInfo);
            message.error(`Ocorreu um erro: ${errorInfo.message || 'Erro desconhecido ao salvar.'}`);
        } finally {
             setLoading(false);
        }
    };

    // --- Lógica de Exclusão (API) ---
    const handleDelete = async (record) => {
         console.log(`Excluindo armário ID: ${record.id}`);
         setLoading(true);
         try {
             const response = await fetch(`${API_BASE_URL}/lockers/${record.id}`, {
                 method: 'DELETE',
             });

             if (!response.ok) {
                  const errorData = await response.json().catch(() => ({}));
                  if (response.status === 404) {
                     throw new Error('Armário não encontrado para exclusão.');
                  }
                   if (response.status === 409) { // Conflito (reservas associadas)
                     throw new Error(errorData.message || 'Não é possível excluir o armário pois ele possui reservas.');
                 }
                 throw new Error(errorData.message || `Falha ao excluir armário (${response.status})`);
             }

             // Status 204 (No Content) é sucesso para DELETE
             message.success(`Armário ${record.lockerIdentifier} excluído com sucesso.`);
             // Rebusca a lista, ajustando a página se a atual ficar vazia
             const newTotal = pagination.total - 1;
             const newCurrent = (lockers.length === 1 && pagination.current > 1) ? pagination.current - 1 : pagination.current;
             fetchLockers(newCurrent, pagination.pageSize);

         } catch (error) {
             console.error("Erro ao excluir:", error);
             message.error(`Falha ao excluir o armário: ${error.message}`);
         } finally {
             setLoading(false);
         }
     }


    // --- Definição das Colunas da Tabela ---
    const columns = [
        { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id, width: 80 },
        {
            title: 'Identificador',
            dataIndex: 'lockerIdentifier',
            key: 'lockerIdentifier',
            sorter: (a, b) => a.lockerIdentifier.localeCompare(b.lockerIdentifier),
        },
        {
            title: 'Filial',
            dataIndex: ['branch', 'name'], // Acessa via include
            key: 'branchName',
            render: (branchName) => branchName || 'N/D',
            sorter: (a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || ''),
            // Filtros podem ser implementados buscando branches e aplicando no fetchLockers
        },
         {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: getLockerStatusTag,
            filters: Object.keys(lockerStatusMap).map(s => ({ text: lockerStatusMap[s].text, value: s })),
            // onFilter: (value, record) => record.status === value, // Filtragem no frontend, ou passar para API
        },
        { title: 'Device ID', dataIndex: 'deviceId', key: 'deviceId', render: (id) => id || '-' },
        {
            title: 'Criado em',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        },
         {
            title: 'Atualizado em',
            dataIndex: 'updatedAt',
            key: 'updatedAt',
            render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
             sorter: (a, b) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix(),
        },
        {
            title: 'Ações',
            key: 'actions',
            align: 'center',
            fixed: 'right',
            width: 100,
            render: (_, record) => (
                <Space size="small">
                     <Tooltip title="Editar Armário">
                        <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} size="small" />
                    </Tooltip>
                     <Popconfirm
                        title={`Excluir armário "${record.lockerIdentifier}"?`}
                        description="Esta ação não pode ser desfeita."
                        onConfirm={() => handleDelete(record)}
                        okText="Sim, Excluir"
                        cancelText="Não"
                        okButtonProps={{ danger: true }}
                        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                    >
                        <Tooltip title="Excluir Armário">
                            <Button icon={<DeleteOutlined />} size="small" danger />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // --- Renderização ---
    return (
        <ConfigProvider locale={ptBR}> {/* Aplica locale PT-BR */}
            <Head>
                <title>Gerenciamento de Armários</title>
            </Head>
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Cabeçalho */}
                 <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                    <Col>
                        <Title level={2} style={{ margin: 0 }}>Gerenciamento de Armários</Title>
                    </Col>
                    <Col>
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={showAddModal}
                        >
                            Adicionar Armário
                        </Button>
                    </Col>
                </Row>

                {/* Tabela */}
                 <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                    <Spin spinning={loading} tip="Carregando armários...">
                        <Table
                            dataSource={lockers}
                            columns={columns}
                            rowKey="id"
                            scroll={{ x: 'max-content', y: 'calc(100vh - 280px)' }} // Ajustar altura do scroll
                            pagination={pagination}
                            onChange={handleTableChange} // Lida com mudança de página
                            style={{ height: '100%' }}
                        />
                    </Spin>
                </div>
            </div>

            {/* Modal de Criação/Edição */}
            <Modal
                title={editingLocker ? `Editar Armário (ID: ${editingLocker.id})` : 'Adicionar Novo Armário'}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                confirmLoading={loading}
                okText={editingLocker ? 'Salvar Alterações' : 'Criar Armário'}
                cancelText="Cancelar"
                destroyOnClose
                maskClosable={false}
            >
                <Form
                    form={form}
                    layout="vertical"
                    name="lockerForm"
                >
                    <Form.Item
                        name="lockerIdentifier"
                        label="Identificador do Armário"
                        rules={[{ required: true, message: 'Por favor, insira o identificador!' }]}
                    >
                        <Input placeholder="Ex: A01, P10, BlocoC-05" />
                    </Form.Item>

                    <Form.Item
                        name="branchId" // Nome do campo esperado pela API
                        label="Filial"
                        rules={[{ required: true, message: 'Por favor, selecione a filial!' }]}
                    >
                        <Select placeholder="Selecione a filial" allowClear loading={branches.length === 0 && loading}>
                            {branches.map(branch => (
                                <Option key={branch.id} value={branch.id}>
                                    {branch.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="status"
                        label="Status"
                        rules={[{ required: true, message: 'Por favor, selecione o status!' }]}
                        initialValue={'available'} // Valor padrão no form
                    >
                        <Select placeholder="Selecione o status">
                             {Object.keys(lockerStatusMap).map(statusKey => (
                                 <Option key={statusKey} value={statusKey}>
                                     {lockerStatusMap[statusKey].text}
                                 </Option>
                             ))}
                        </Select>
                    </Form.Item>

                    <Form.Item
                        name="deviceId"
                        label="Device ID"
                         rules={[{ required: true, message: 'Por favor, insira o Device ID!' }]}
                        tooltip="Identificador do hardware associado (eWeLink ID, etc.)."
                    >
                        {/* Ajustar tipo se necessário (ex: InputNumber) */}
                        <Input placeholder="Ex: 1000123456" />
                    </Form.Item>
                </Form>
            </Modal>
        </ConfigProvider>
    );
};

export default LockersPage;