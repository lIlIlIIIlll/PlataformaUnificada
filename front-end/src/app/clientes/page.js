// app/clientes/page.js
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
    DatePicker, // Mantém DatePicker
    Switch,
    message,
    Spin,
    Tag,
    Space,
    Tooltip,
    Row,
    Col,
    Avatar,
    Popconfirm,
    ConfigProvider
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    LockOutlined,
    UnlockOutlined,
    SearchOutlined,
    ClearOutlined,
    UserOutlined,
    QuestionCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR';
import { API_BASE_URL } from '../config/apiConfig'; // <-- Importa a URL base

dayjs.locale('pt-br');

const { Title } = Typography;
const { Option } = Select;

// --- Funções Auxiliares ---
const formatCPF = (cpf) => {
    if (!cpf) return '';
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11) return cpf; // Retorna original se não tiver 11 dígitos
    return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
};

// Validação de CPF básica (digitos verificadores)
const validateCPF = (cpf) => {
    if (!cpf) return false;
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false; // Verifica tamanho e se todos os dígitos são iguais

    let sum = 0;
    let remainder;

    for (let i = 1; i <= 9; i++) {
        sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(9, 10))) return false;

    sum = 0;
    for (let i = 1; i <= 10; i++) {
        sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i);
    }
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned.substring(10, 11))) return false;

    return true;
};

// Função para aplicar máscara de CPF durante a digitação
const applyCpfMask = (value) => {
    if (!value) return '';
    let cleaned = value.replace(/\D/g, ''); // Remove não dígitos
    cleaned = cleaned.slice(0, 11); // Limita a 11 dígitos

    // Aplica a máscara
    if (cleaned.length > 9) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (cleaned.length > 6) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3');
    } else if (cleaned.length > 3) {
        return cleaned.replace(/(\d{3})(\d{3})/, '$1.$2');
    } else {
        return cleaned;
    }
};

// Função para aplicar máscara de WhatsApp durante a digitação (+55 (XX) XXXXX-XXXX)
const applyWhatsAppMask = (value) => {
    if (!value) return '';
    let cleaned = value.replace(/\D/g, ''); // Remove não dígitos

    // Limita o tamanho total (2 DDI + 2 DDD + 9 Número = 13)
    cleaned = cleaned.slice(0, 13);

    // Aplica a máscara progressivamente
    if (cleaned.length > 11) {
        // +55 (XX) XXXXX-XXXX
        return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length > 9) {
        // +55 (XX) XXXXX-XXX...
         return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    } else if (cleaned.length > 4) {
        // +55 (XX) XXXXX
        return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4)}`;
    } else if (cleaned.length > 2) {
        // +55 (XX)
        return `+${cleaned.slice(0, 2)} (${cleaned.slice(2)}`;
    } else if (cleaned.length > 0) {
        // +55
        return `+${cleaned}`;
    } else {
        return '';
    }
};


const UsersPage = () => {
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    const [filters, setFilters] = useState({
        search: '',
        branchId: null,
        status: null, // 'active', 'blocked'
    });
    const [pagination, setPagination] = useState({
        current: 1, pageSize: 10, total: 0,
        showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} usuários`,
    });

    // --- Busca de Dados (API) ---
    const fetchUsers = useCallback(async (page = pagination.current, pageSize = pagination.pageSize, currentFilters = filters) => {
        setLoading(true);
        console.log("Buscando usuários da API:", currentFilters, `Page: ${page}, Size: ${pageSize}`);

        const params = new URLSearchParams({
            // page: page,
            // pageSize: pageSize,
            include: 'branch' // Inclui dados da filial na resposta
        });
        if (currentFilters.search) params.append('search', currentFilters.search); // 'search' precisa ser implementado na API
        if (currentFilters.branchId) params.append('branchId', currentFilters.branchId);
        if (currentFilters.status !== null && currentFilters.status !== undefined) {
            params.append('isBlocked', currentFilters.status === 'blocked'); // API espera boolean 'isBlocked'
        }


        try {
            const response = await fetch(`${API_BASE_URL}/users?${params.toString()}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao buscar usuários (${response.status})`);
            }
            let data = await response.json();

            // --- Filtragem Manual (remover se a API já fizer a filtragem!) ---
            if (currentFilters.search) {
                 const searchTerm = currentFilters.search.toLowerCase();
                 const searchDigits = searchTerm.replace(/\D/g, '');
                 data = data.filter(user =>
                    user.name.toLowerCase().includes(searchTerm) ||
                    user.cpf?.replace(/\D/g, '').includes(searchDigits) ||
                    user.whatsappNumber?.toLowerCase().includes(searchTerm) ||
                    user.whatsappNumber?.replace(/\D/g, '').includes(searchDigits)
                );
            }
             if (currentFilters.status !== null && currentFilters.status !== undefined) {
                 const isBlockedFilter = currentFilters.status === 'blocked';
                 data = data.filter(user => user.isBlocked === isBlockedFilter);
             }
             if (currentFilters.branchId) {
                data = data.filter(user => (user.branchId || user.branch?.id) === currentFilters.branchId);
             }
            // --- Fim da Filtragem Manual ---


            setUsers(data);
            setPagination(prev => ({ ...prev, total: data.length, current: page, pageSize }));

        } catch (error) {
            console.error("Falha ao buscar usuários:", error);
            message.error(`Falha ao carregar usuários: ${error.message}`);
            setUsers([]);
            setPagination(prev => ({ ...prev, total: 0 }));
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [filters]);

    const fetchBranches = useCallback(async () => {
        console.log("Buscando filiais da API para filtro/modal...");
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
        }
    }, []);

    useEffect(() => {
        fetchBranches();
        fetchUsers(1, pagination.pageSize, filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [fetchUsers, fetchBranches]);

    // --- Manipuladores de Filtro e Paginação ---
    const handleFilterChange = (key, value) => {
        const newFilters = { ...filters, [key]: value };
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleTableChange = (newPagination, tableFilters, sorter) => {
         setPagination(prev => ({
             ...prev,
             current: newPagination.current,
             pageSize: newPagination.pageSize
         }));
    };

    const clearFilters = () => {
        const resetFilters = { search: '', branchId: null, status: null };
        setFilters(resetFilters);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    // --- Manipuladores do Modal ---
    const showAddModal = () => {
        setEditingUser(null);
        form.resetFields();
        form.setFieldsValue({ isBlocked: false, whatsappNumber: '+55' }); // Valor padrão para criação, já inicia com +55
        setIsModalVisible(true);
    };
    const showEditModal = (record) => {
        setEditingUser(record);
        form.setFieldsValue({
            name: record.name,
            whatsappNumber: record.whatsappNumber ? applyWhatsAppMask(record.whatsappNumber) : '',
            cpf: record.cpf ? formatCPF(record.cpf) : '', // Formata CPF para exibição
            dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null, // Mantém dayjs object
            gender: record.gender,
            id_filial: record.branchId || record.branch?.id,
            address: record.address,
            photoPath: record.photoPath,
            isBlocked: record.isBlocked,
        });
        setIsModalVisible(true);
    };
    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingUser(null);
        form.resetFields();
    };

    // --- Lógica de Criação/Edição (API) ---
    const handleOk = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            // Formatar dados antes de enviar para a API
            const userData = {
                ...values,
                // Formata o objeto dayjs para string YYYY-MM-DD
                dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
                cpf: values.cpf.replace(/\D/g, ''),
                whatsappNumber: values.whatsappNumber.replace(/\D/g, ''),
                branchId: values.id_filial,
            };
            delete userData.id_filial;

            if (!userData.whatsappNumber.startsWith('+')) {
                userData.whatsappNumber = '+' + userData.whatsappNumber;
            }

            console.log('Dados formatados para API:', userData);

            const url = editingUser
                ? `${API_BASE_URL}/users/${editingUser.id}`
                : `${API_BASE_URL}/users`;
            const method = editingUser ? 'PUT' : 'POST';

             let bodyToSend = userData;
             if (editingUser) {
                 const { cpf, whatsappNumber, ...updateData } = userData;
                 bodyToSend = updateData;
                 console.log('Dados para PUT (sem CPF/WhatsApp):', bodyToSend);
             }


            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyToSend),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 if (response.status === 409) {
                     throw new Error(errorData.message || 'CPF ou WhatsApp já cadastrado.');
                 }
                  if (response.status === 400) {
                      throw new Error(errorData.message || 'Dados inválidos. Verifique os campos e a filial selecionada.');
                 }
                throw new Error(errorData.message || `Falha ao ${editingUser ? 'atualizar' : 'criar'} usuário (${response.status})`);
            }

            const result = await response.json();

            message.success(`Usuário ${result.name} ${editingUser ? 'atualizado' : 'criado'} com sucesso!`);
            handleCancel();
            fetchUsers(1, pagination.pageSize, filters);

        } catch (errorInfo) {
            console.error('Falha na validação ou API:', errorInfo);
             if(errorInfo && errorInfo.errorFields) {
                console.log('Erro de validação do formulário:', errorInfo.errorFields);
             } else {
                 message.error(`Ocorreu um erro: ${errorInfo.message || 'Erro desconhecido ao salvar.'}`);
             }
        } finally {
            setLoading(false);
        }
    };

    // --- Lógica de Bloqueio/Desbloqueio (API) ---
    const handleToggleBlock = async (record) => {
        const actionText = record.isBlocked ? 'Desbloquear' : 'Bloquear';
        console.log(`${actionText} usuário ID: ${record.id}`);
        setLoading(true);
        try {
             const response = await fetch(`${API_BASE_URL}/users/${record.id}`, {
                 method: 'PUT',
                 headers: { 'Content-Type': 'application/json' },
                 body: JSON.stringify({ isBlocked: !record.isBlocked }),
             });

             if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                  if (response.status === 404) {
                     throw new Error('Usuário não encontrado para atualização.');
                 }
                 throw new Error(errorData.message || `Falha ao ${actionText.toLowerCase()} usuário (${response.status})`);
             }

            message.success(`Usuário ${record.name} ${record.isBlocked ? 'desbloqueado' : 'bloqueado'} com sucesso.`);
            fetchUsers(pagination.current, pagination.pageSize, filters);

        } catch (error) {
            console.error(`Erro ao ${actionText.toLowerCase()} usuário:`, error);
            message.error(`Falha ao ${actionText.toLowerCase()} o usuário: ${error.message}`);
        } finally {
            setLoading(false);
        }
    };

    // --- Handlers para máscaras nos Inputs ---
    const handleCpfInputChange = (e) => {
        const maskedValue = applyCpfMask(e.target.value);
        form.setFieldsValue({ cpf: maskedValue });
    };

    const handleWhatsAppInputChange = (e) => {
        const maskedValue = applyWhatsAppMask(e.target.value);
        form.setFieldsValue({ whatsappNumber: maskedValue });
    };


    // --- Definição das Colunas da Tabela ---
    const columns = [
        {
            title: 'Foto', dataIndex: 'photoPath', key: 'photo', width: 60, align: 'center',
            render: (path, record) => <Avatar src={path || undefined} icon={<UserOutlined />} alt={record.name} />
        },
        { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id, width: 80 },
        { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'WhatsApp', dataIndex: 'whatsappNumber', key: 'whatsappNumber', render: (num) => num ? applyWhatsAppMask(num) : '-' }, // Formata na tabela tbm
        { title: 'CPF', dataIndex: 'cpf', key: 'cpf', render: formatCPF },
        {
            title: 'Filial', dataIndex: ['branch', 'name'], key: 'branchName',
            render: (branchName) => branchName || 'N/D',
            sorter: (a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || ''),
            filters: branches.map(b => ({ text: b.name, value: b.id })),
             onFilter: (value, record) => (record.branchId || record.branch?.id) === value,
        },
        {
            title: 'Status', dataIndex: 'isBlocked', key: 'status', width: 100, align: 'center',
            render: (isBlocked) => <Tag color={isBlocked ? 'red' : 'green'}>{isBlocked ? 'Bloqueado' : 'Ativo'}</Tag>,
            filters: [{ text: 'Ativo', value: false }, { text: 'Bloqueado', value: true }],
            onFilter: (value, record) => record.isBlocked === value,
        },
        {
            title: 'Data Cadastro', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center',
            render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-',
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(),
        },
        {
            title: 'Ações', key: 'actions', align: 'center', fixed: 'right', width: 120,
            render: (_, record) => (
                <Space size="small">
                    <Tooltip title="Editar Usuário">
                        <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} size="small" />
                    </Tooltip>
                    <Popconfirm
                        title={`Tem certeza que deseja ${record.isBlocked ? 'desbloquear' : 'bloquear'} ${record.name}?`}
                        onConfirm={() => handleToggleBlock(record)}
                        okText="Sim" cancelText="Não" okButtonProps={{ danger: !record.isBlocked }}
                        icon={<QuestionCircleOutlined style={{ color: record.isBlocked ? 'green' : 'red' }} />}
                    >
                        <Tooltip title={record.isBlocked ? 'Desbloquear Usuário' : 'Bloquear Usuário'}>
                            <Button icon={record.isBlocked ? <UnlockOutlined /> : <LockOutlined />} size="small" danger={!record.isBlocked} />
                        </Tooltip>
                    </Popconfirm>
                    {/* Botão de Excluir Opcional */}
                </Space>
            ),
        },
    ];

    // --- Renderização ---
    return (
        <ConfigProvider locale={ptBR}>
            <Head>
                <title>Gerenciamento de Clientes</title>
            </Head>
             <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                {/* Cabeçalho */}
                <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
                    <Col><Title level={2} style={{ margin: 0 }}>Gerenciamento de Clientes</Title></Col>
                    <Col><Button type="primary" icon={<PlusOutlined />} onClick={showAddModal}>Adicionar Cliente</Button></Col>
                </Row>

                {/* Barra de Filtros */}
                <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
                    <Col xs={24} sm={12} md={8} lg={8}>
                        <Input.Search placeholder="Buscar por Nome, CPF, WhatsApp..." allowClear enterButton={<SearchOutlined />}
                            value={filters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                        />
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={5}>
                        <Select placeholder="Filtrar por Filial" allowClear style={{ width: '100%' }} value={filters.branchId}
                            onChange={(value) => handleFilterChange('branchId', value)} loading={branches.length === 0 && loading}>
                            {branches.map(branch => (<Option key={branch.id} value={branch.id}>{branch.name}</Option>))}
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={6} lg={5}>
                        <Select placeholder="Filtrar por Status" allowClear style={{ width: '100%' }} value={filters.status}
                            onChange={(value) => handleFilterChange('status', value)}>
                            <Option value="active">Ativo</Option>
                            <Option value="blocked">Bloqueado</Option>
                        </Select>
                    </Col>
                    <Col xs={24} sm={12} md={4} lg={3}>
                        <Button icon={<ClearOutlined />} onClick={clearFilters} style={{ width: '100%' }}>Limpar</Button>
                    </Col>
                </Row>

                {/* Tabela */}
                <div style={{ flex: '1 1 auto', overflow: 'hidden' }}>
                    <Spin spinning={loading} tip="Carregando clientes...">
                        <Table dataSource={users} columns={columns} rowKey="id"
                            scroll={{ x: 'max-content', y: 'calc(100vh - 350px)' }}
                            pagination={pagination} onChange={handleTableChange} style={{ height: '100%' }} />
                    </Spin>
                </div>
            </div>

            {/* Modal de Criação/Edição */}
            <Modal
                title={editingUser ? `Editar Cliente (ID: ${editingUser.id})` : 'Adicionar Novo Cliente'}
                open={isModalVisible} onOk={handleOk} onCancel={handleCancel} confirmLoading={loading}
                okText={editingUser ? 'Salvar Alterações' : 'Criar Cliente'} cancelText="Cancelar"
                destroyOnClose maskClosable={false} width={700}
            >
                <Form form={form} layout="vertical" name="userForm">
                     <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Nome Completo" rules={[{ required: true, message: 'Por favor, insira o nome completo!' }]}>
                                <Input placeholder="Nome do Cliente" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="whatsappNumber" label="Número WhatsApp" rules={[{ required: true, message: 'Por favor, insira o número do WhatsApp!' },
                                { validator: (_, value) => value && value.replace(/\D/g, '').length >= 12 ? Promise.resolve() : Promise.reject(new Error('Número inválido ou incompleto!')) }
                            ]}>
                                <Input
                                    placeholder="+55 (XX) XXXXX-XXXX"
                                    onChange={handleWhatsAppInputChange} // Aplica máscara
                                    disabled={!!editingUser}
                                    maxLength={19}
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="cpf" label="CPF"
                                rules={[
                                    { required: true, message: 'Por favor, insira o CPF!' },
                                    { validator: (_, value) => validateCPF(value?.replace(/\D/g, '')) ? Promise.resolve() : Promise.reject(new Error('CPF inválido!')) }
                                ]}
                            >
                                <Input
                                    placeholder="000.000.000-00"
                                    onChange={handleCpfInputChange} // Aplica máscara
                                    disabled={!!editingUser}
                                    maxLength={14}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            {/* DatePicker não terá máscara de digitação, mas usa placeholder e format */}
                            <Form.Item name="dateOfBirth" label="Data de Nascimento" rules={[{ required: true, message: 'Por favor, selecione a data de nascimento!' }]}>
                                <DatePicker
                                    style={{ width: '100%' }}
                                    format="DD/MM/YYYY"
                                    placeholder="DD/MM/AAAA"
                                    // picker="date" // Garante que é seleção de data, não tempo
                                />
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="gender" label="Gênero" rules={[{ required: true, message: 'Por favor, selecione o gênero!' }]}>
                                <Select placeholder="Selecione o gênero">
                                    <Option value="Masculino">Masculino</Option>
                                    <Option value="Feminino">Feminino</Option>
                                    <Option value="Outro">Outro</Option>
                                    <Option value="Prefiro não informar">Prefiro não informar</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                         <Col span={12}>
                            <Form.Item name="id_filial" label="Filial Principal" rules={[{ required: true, message: 'Por favor, selecione a filial!' }]}>
                                <Select placeholder="Selecione a filial" allowClear loading={branches.length === 0 && loading}>
                                    {branches.map(branch => (<Option key={branch.id} value={branch.id}>{branch.name}</Option>))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                     <Row gutter={16}>
                         <Col span={24}>
                             <Form.Item name="address" label="Endereço" rules={[{ required: true, message: 'Por favor, insira o endereço!' }]}>
                                <Input placeholder="Rua, Número, Bairro, Cidade - Estado" />
                            </Form.Item>
                         </Col>
                     </Row>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="photoPath" label="Caminho da Foto" tooltip="URL ou caminho relativo da foto do usuário. Ex: /uploads/foto.jpg">
                                <Input placeholder="/uploads/foto.jpg ou URL" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="isBlocked" label="Status" valuePropName="checked" initialValue={false}>
                                <Switch checkedChildren="Bloqueado" unCheckedChildren="Ativo" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </ConfigProvider>
    );
};

export default UsersPage;