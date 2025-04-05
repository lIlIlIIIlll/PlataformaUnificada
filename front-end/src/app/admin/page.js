// app/administracao/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Tabs, Typography, Button, Modal, Form, Input, message, Spin, Space,
    Tooltip, Popconfirm, Table, Descriptions, ConfigProvider, Row, Col, InputNumber
} from 'antd';
import {
    EditOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, SettingOutlined,
    ShopOutlined, UsergroupAddOutlined, QuestionCircleOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR';
import { API_BASE_URL } from '../config/apiConfig'; // <-- Importa a URL base

dayjs.locale('pt-br');

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

const AdministrationPage = () => {
    // --- State ---
    const [settings, setSettings] = useState([]);
    const [branches, setBranches] = useState([]);
    const [administrators, setAdministrators] = useState([]);
    const [loading, setLoading] = useState({ settings: false, branches: false, admins: false }); // Loading por seção

    // --- Modal States ---
    // Edit Setting Modal
    const [isSettingModalVisible, setIsSettingModalVisible] = useState(false);
    const [editingSetting, setEditingSetting] = useState(null);
    const [settingForm] = Form.useForm();

    // Add Setting Modal (NOVO)
    const [isAddSettingModalVisible, setIsAddSettingModalVisible] = useState(false);
    const [addSettingForm] = Form.useForm();

    // Branch Modal
    const [isBranchModalVisible, setIsBranchModalVisible] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [branchForm] = Form.useForm();

    // Admin Modal
    const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [adminForm] = Form.useForm();

    // --- Fetch Data (API) ---
    const fetchSettings = useCallback(async () => {
        setLoading(prev => ({ ...prev, settings: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/settings`);
            if (!response.ok) throw new Error('Falha ao carregar configurações');
            const data = await response.json();
            // Ordena as configurações pelo nome (opcional)
            data.sort((a, b) => a.name.localeCompare(b.name));
            setSettings(data);
        } catch (error) {
            message.error(`Erro ao carregar configurações: ${error.message}`);
        } finally {
            setLoading(prev => ({ ...prev, settings: false }));
        }
    }, []);

    const fetchBranches = useCallback(async () => {
        setLoading(prev => ({ ...prev, branches: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/branches`);
            if (!response.ok) throw new Error('Falha ao carregar filiais');
            const data = await response.json();
            setBranches(data);
        } catch (error) {
             message.error(`Erro ao carregar filiais: ${error.message}`);
        } finally {
            setLoading(prev => ({ ...prev, branches: false }));
        }
    }, []);

    const fetchAdmins = useCallback(async () => {
        setLoading(prev => ({ ...prev, admins: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/administrators`);
            if (!response.ok) throw new Error('Falha ao carregar administradores');
            const data = await response.json();
            setAdministrators(data); // API já deve excluir senha
        } catch (error) {
            message.error(`Erro ao carregar administradores: ${error.message}`);
        } finally {
            setLoading(prev => ({ ...prev, admins: false }));
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchBranches();
        fetchAdmins();
    }, [fetchSettings, fetchBranches, fetchAdmins]);

    // --- Settings Modal Handlers (API) ---

    // ----> EDITAR Configuração
    const showEditSettingModal = (setting) => {
        setEditingSetting(setting);
        let formValue = setting.value;
        if (setting.name.includes('horas') || setting.name.includes('dias') || setting.name.includes('valor')) {
            formValue = parseFloat(setting.value) || 0;
        }
        settingForm.setFieldsValue({ value: formValue });
        setIsSettingModalVisible(true);
    };
    const handleSettingCancel = () => {
        setIsSettingModalVisible(false);
        setEditingSetting(null);
        settingForm.resetFields();
    };
    const handleSettingOk = async () => {
        try {
            const values = await settingForm.validateFields();
            setLoading(prev => ({ ...prev, settings: true }));
            const url = `${API_BASE_URL}/settings/${editingSetting.name}`; // API usa 'name' como ID
            const response = await fetch(url, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                // Envia 'value' como string e 'description' se existir
                body: JSON.stringify({ value: String(values.value), description: editingSetting.description }),
            });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao atualizar configuração (${response.status})`);
            }
            message.success(`Configuração "${editingSetting.name}" atualizada.`);
            handleSettingCancel();
            fetchSettings();
        } catch (errorInfo) {
            console.error('Falha na API de configuração:', errorInfo);
             if(errorInfo && errorInfo.errorFields) {
                 console.log('Erro de validação do formulário:', errorInfo.errorFields);
             } else {
                message.error(`Erro ao salvar configuração: ${errorInfo.message}`);
             }
        } finally {
             setLoading(prev => ({ ...prev, settings: false }));
        }
    };

    // ----> ADICIONAR Configuração (NOVO)
    const showAddSettingModal = () => {
        addSettingForm.resetFields();
        setIsAddSettingModalVisible(true);
    };
    const handleAddSettingCancel = () => {
        setIsAddSettingModalVisible(false);
        addSettingForm.resetFields();
    };
    const handleAddSettingOk = async () => {
        try {
            const values = await addSettingForm.validateFields();
            setLoading(prev => ({ ...prev, settings: true }));
            const url = `${API_BASE_URL}/settings`;
            const body = {
                name: values.name,
                value: String(values.value), // API espera string
                description: values.description || '' // Garante que description seja enviado (vazio se não preenchido)
            };

            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 if (response.status === 409) { // Conflito - Nome já existe
                     throw new Error(errorData.message || 'Já existe uma configuração com este nome.');
                 }
                 if (response.status === 400) { // Bad Request - Dados inválidos
                     throw new Error(errorData.message || 'Dados inválidos. Verifique o nome e o valor.');
                 }
                throw new Error(errorData.message || `Falha ao criar configuração (${response.status})`);
            }

            // const newSetting = await response.json(); // Pega o objeto criado se precisar
            message.success(`Configuração "${values.name}" criada com sucesso.`);
            handleAddSettingCancel(); // Fecha e limpa o modal
            fetchSettings(); // Atualiza a lista de configurações

        } catch (errorInfo) {
            console.error('Falha ao criar configuração:', errorInfo);
             if(errorInfo && errorInfo.errorFields) {
                 // Erro de validação do Ant Design, não precisa de message.error
                 console.log('Erro de validação do formulário:', errorInfo.errorFields);
             } else {
                // Erro da API ou outro erro
                message.error(`Erro ao criar configuração: ${errorInfo.message}`);
             }
        } finally {
            setLoading(prev => ({ ...prev, settings: false }));
        }
    };

     // ----> EXCLUIR Configuração (NOVO - Opcional mas recomendado)
     const handleDeleteSetting = async (name) => {
        setLoading(prev => ({ ...prev, settings: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/settings/${name}`, { method: 'DELETE' });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 if (response.status === 404) throw new Error('Configuração não encontrada.');
                throw new Error(errorData.message || `Falha ao excluir configuração (${response.status})`);
            }
            message.success(`Configuração "${name}" excluída.`);
            fetchSettings(); // Atualiza a lista
        } catch (error) {
             message.error(`Erro ao excluir configuração: ${error.message}`);
        } finally {
             setLoading(prev => ({ ...prev, settings: false }));
        }
    };


    // --- Branch Modal Handlers (API) ---
    const showAddBranchModal = () => {
        setEditingBranch(null);
        branchForm.resetFields();
        setIsBranchModalVisible(true);
    };
    const showEditBranchModal = (branch) => {
        setEditingBranch(branch);
        branchForm.setFieldsValue({ name: branch.name, address: branch.address });
        setIsBranchModalVisible(true);
    };
    const handleBranchCancel = () => {
        setIsBranchModalVisible(false);
        setEditingBranch(null);
        branchForm.resetFields();
    };
    const handleBranchOk = async () => {
        try {
            const values = await branchForm.validateFields();
            setLoading(prev => ({ ...prev, branches: true }));
            const url = editingBranch ? `${API_BASE_URL}/branches/${editingBranch.id}` : `${API_BASE_URL}/branches`;
            const method = editingBranch ? 'PUT' : 'POST';
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao ${editingBranch ? 'atualizar' : 'criar'} filial (${response.status})`);
            }
            const result = await response.json();
            message.success(`Filial "${result.name}" ${editingBranch ? 'atualizada' : 'criada'}.`);
            handleBranchCancel();
            fetchBranches();
        } catch (errorInfo) {
             console.error('Falha na API de filial:', errorInfo);
             if(errorInfo && errorInfo.errorFields) {
                 console.log('Erro de validação do formulário:', errorInfo.errorFields);
             } else {
                message.error(`Erro ao salvar filial: ${errorInfo.message}`);
             }
        } finally {
             setLoading(prev => ({ ...prev, branches: false }));
        }
    };
    const handleDeleteBranch = async (id) => {
        setLoading(prev => ({ ...prev, branches: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/branches/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 if (response.status === 409) throw new Error(errorData.message || 'Filial possui dependências (armários, usuários, etc.).');
                 if (response.status === 404) throw new Error('Filial não encontrada.');
                throw new Error(errorData.message || `Falha ao excluir filial (${response.status})`);
            }
            message.success(`Filial ID ${id} excluída.`);
            fetchBranches();
        } catch (error) {
             message.error(`Erro ao excluir filial: ${error.message}`);
        } finally {
             setLoading(prev => ({ ...prev, branches: false }));
        }
    };

    // --- Admin Modal Handlers (API) ---
    const showAddAdminModal = () => {
        setEditingAdmin(null);
        adminForm.resetFields();
        setIsAdminModalVisible(true);
    };
    const showEditAdminModal = (admin) => {
        setEditingAdmin(admin);
        adminForm.setFieldsValue({ name: admin.name, email: admin.email }); // Não preenche a senha
        setIsAdminModalVisible(true);
    };
    const handleAdminCancel = () => {
        setIsAdminModalVisible(false);
        setEditingAdmin(null);
        adminForm.resetFields();
    };
    const handleAdminOk = async () => {
        try {
            const values = await adminForm.validateFields();
            setLoading(prev => ({ ...prev, admins: true }));
            const url = editingAdmin ? `${API_BASE_URL}/administrators/${editingAdmin.id}` : `${API_BASE_URL}/administrators`;
            const method = editingAdmin ? 'PUT' : 'POST';

            // Para POST: envia { name, email, password }
            // Para PUT: envia { name, email } (sem password, conforme API doc/decisão)
            const body = editingAdmin
                ? { name: values.name, email: values.email }
                // Remove confirmPassword antes de enviar para POST
                : (({ confirmPassword, ...rest }) => rest)(values);


            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                  if (response.status === 409) throw new Error(errorData.message || 'Email já cadastrado.');
                  if (response.status === 400) throw new Error(errorData.message || 'Dados inválidos.');
                throw new Error(errorData.message || `Falha ao ${editingAdmin ? 'atualizar' : 'criar'} administrador (${response.status})`);
            }
            const result = await response.json();
            message.success(`Administrador "${result.name}" ${editingAdmin ? 'atualizado' : 'criado'}.`);
            handleAdminCancel();
            fetchAdmins();
        } catch (errorInfo) {
             console.error('Falha na API de admin:', errorInfo);
             if(errorInfo && errorInfo.errorFields) {
                console.log('Erro de validação do formulário:', errorInfo.errorFields);
             } else {
                message.error(`Erro ao salvar administrador: ${errorInfo.message}`);
             }
        } finally {
             setLoading(prev => ({ ...prev, admins: false }));
        }
    };
    const handleDeleteAdmin = async (id) => {
        // if (id === 1) { message.warn("Não é possível excluir o administrador principal."); return; } // Validação frontend opcional
        setLoading(prev => ({ ...prev, admins: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/administrators/${id}`, { method: 'DELETE' });
             if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 if (response.status === 404) throw new Error('Administrador não encontrado.');
                 if (response.status === 409) throw new Error(errorData.message || 'Não é possível excluir o administrador (pode ter dependências).');
                throw new Error(errorData.message || `Falha ao excluir administrador (${response.status})`);
            }
            message.success(`Administrador ID ${id} excluído.`);
            fetchAdmins();
        } catch (error) {
             message.error(`Erro ao excluir administrador: ${error.message}`);
        } finally {
             setLoading(prev => ({ ...prev, admins: false }));
        }
    };

    // --- Table Columns ---
    const branchColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id },
        { title: 'Nome da Filial', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'Endereço', dataIndex: 'address', key: 'address', render: text => text || '-' },
        {
            title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center',
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix()
        },
        {
            title: 'Atualizado em', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center',
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
            sorter: (a, b) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix()
        },
        {
            title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Editar Filial">
                        <Button type="link" icon={<EditOutlined />} onClick={() => showEditBranchModal(record)} />
                    </Tooltip>
                    <Popconfirm title={`Tem certeza que deseja excluir a filial "${record.name}"?`}
                        description="A filial será excluída permanentemente."
                        onConfirm={() => handleDeleteBranch(record.id)} okText="Sim, Excluir" cancelText="Não"
                        okButtonProps={{ danger: true }} icon={<QuestionCircleOutlined style={{ color: 'red' }}/>}>
                        <Tooltip title="Excluir Filial">
                            <Button type="link" danger icon={<DeleteOutlined />} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const adminColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id },
        { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a, b) => a.email.localeCompare(b.email) },
        {
            title: 'Criado em', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center',
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
            sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix()
        },
        {
            title: 'Atualizado em', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center',
            render: (text) => dayjs(text).format('DD/MM/YYYY HH:mm'),
            sorter: (a, b) => dayjs(a.updatedAt).unix() - dayjs(b.updatedAt).unix()
        },
        {
            title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Editar Administrador">
                        <Button type="link" icon={<EditOutlined />} onClick={() => showEditAdminModal(record)} />
                    </Tooltip>
                     <Popconfirm title={`Tem certeza que deseja excluir o admin "${record.name}"?`}
                        description="O administrador será excluído permanentemente."
                        onConfirm={() => handleDeleteAdmin(record.id)} okText="Sim, Excluir" cancelText="Não"
                        okButtonProps={{ danger: true }} disabled={record.id === 1}
                        icon={<QuestionCircleOutlined style={{ color: 'red' }}/>}>
                        <Tooltip title={record.id === 1 ? "Não é possível excluir o admin principal" : "Excluir Administrador"}>
                             <span style={{ display: 'inline-block', cursor: record.id === 1 ? 'not-allowed' : 'pointer' }}>
                                <Button type="link" danger icon={<DeleteOutlined />} disabled={record.id === 1} style={record.id === 1 ? { pointerEvents: 'none', color: 'rgba(0, 0, 0, 0.25)' } : {}}/>
                             </span>
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // --- Render ---
    return (
        <ConfigProvider locale={ptBR}>
            <Head><title>Administração</title></Head>
            <Title level={2} style={{ marginBottom: '24px' }}>Administração</Title>

            <Tabs defaultActiveKey="1">
                {/* Aba Configurações */}
                <TabPane tab={<span><SettingOutlined /> Configurações Gerais</span>} key="1">
                    {/* Botão Adicionar Configuração */}
                    <Row justify="end" style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={showAddSettingModal}>
                            Adicionar Configuração
                        </Button>
                    </Row>
                    <Spin spinning={loading.settings}>
                        <Descriptions bordered column={1} size="small">
                            {settings.map(setting => (
                                <Descriptions.Item
                                    key={setting.id || setting.name} // Usa name como fallback key
                                    label={<Tooltip title={setting.description || setting.name}>{setting.name}</Tooltip>}
                                    labelStyle={{ width: '30%'}}
                                >
                                    <Row justify="space-between" align="middle">
                                        <Col style={{ flex: 1, marginRight: '8px', overflow: 'hidden' }}> {/* Coluna para valor e data */}
                                            <Text style={{ wordBreak: 'break-all' }}>{setting.value}</Text>
                                            {setting.updatedAt && <><br/><Text type="secondary" style={{ fontSize: '12px' }}>Última atualização: {dayjs(setting.updatedAt).format('DD/MM/YYYY HH:mm')}</Text></>}
                                        </Col>
                                        <Col> {/* Coluna para botões */}
                                            <Space size="small">
                                                <Tooltip title="Editar Valor">
                                                    <Button type="link" icon={<EditOutlined />} onClick={() => showEditSettingModal(setting)} size="small" />
                                                </Tooltip>
                                                <Popconfirm
                                                    title={`Excluir configuração "${setting.name}"?`}
                                                    description="Esta ação não pode ser desfeita."
                                                    onConfirm={() => handleDeleteSetting(setting.name)}
                                                    okText="Sim, Excluir" cancelText="Não"
                                                    okButtonProps={{ danger: true }} icon={<QuestionCircleOutlined style={{ color: 'red' }}/>}
                                                >
                                                    <Tooltip title="Excluir Configuração">
                                                        <Button type="link" danger icon={<DeleteOutlined />} size="small" />
                                                    </Tooltip>
                                                </Popconfirm>
                                            </Space>
                                        </Col>
                                    </Row>
                                </Descriptions.Item>
                            ))}
                        </Descriptions>
                        {settings.length === 0 && !loading.settings && <Paragraph style={{ marginTop: 16 }}>Nenhuma configuração encontrada.</Paragraph>}
                    </Spin>
                </TabPane>

                {/* Aba Filiais */}
                <TabPane tab={<span><ShopOutlined /> Gerenciar Filiais</span>} key="2">
                    <Row justify="end" style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={showAddBranchModal}>Adicionar Filial</Button></Row>
                    <Spin spinning={loading.branches}>
                        <Table dataSource={branches} columns={branchColumns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
                    </Spin>
                </TabPane>

                {/* Aba Administradores */}
                <TabPane tab={<span><UsergroupAddOutlined /> Gerenciar Administradores</span>} key="3">
                     <Row justify="end" style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={showAddAdminModal}>Adicionar Administrador</Button></Row>
                     <Spin spinning={loading.admins}>
                        <Table dataSource={administrators} columns={adminColumns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
                    </Spin>
                </TabPane>
            </Tabs>

            {/* --- Modais --- */}

            {/* Modal Adicionar Configuração (NOVO) */}
            <Modal
                title="Adicionar Nova Configuração"
                open={isAddSettingModalVisible}
                onOk={handleAddSettingOk}
                onCancel={handleAddSettingCancel}
                confirmLoading={loading.settings}
                okText="Criar Configuração"
                cancelText="Cancelar"
                destroyOnClose // Limpa o estado do form ao fechar
            >
                <Form form={addSettingForm} layout="vertical" name="addSettingForm">
                    <Form.Item
                        name="name"
                        label="Nome (Chave)"
                        rules={[
                            { required: true, message: 'Por favor, insira o nome (chave) da configuração!' },
                            { pattern: /^[a-z0-9_]+$/, message: 'Use apenas letras minúsculas, números e underscore (_).' }
                        ]}
                        tooltip="Identificador único da configuração (ex: max_reservation_hours, default_branch_id)."
                    >
                        <Input placeholder="exemplo_nome_configuracao" />
                    </Form.Item>
                    <Form.Item
                        name="value"
                        label="Valor"
                        rules={[{ required: true, message: 'Por favor, insira o valor da configuração!' }]}
                        tooltip="O valor associado à chave."
                    >
                        <Input.TextArea rows={2} placeholder="Valor da configuração" />
                    </Form.Item>
                     <Form.Item
                        name="description"
                        label="Descrição (Opcional)"
                        tooltip="Uma breve explicação sobre para que serve esta configuração."
                    >
                        <Input.TextArea rows={3} placeholder="Explicação sobre esta configuração" />
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal Editar Configuração */}
            <Modal title={`Editar Configuração: ${editingSetting?.name}`} open={isSettingModalVisible} onOk={handleSettingOk} onCancel={handleSettingCancel} confirmLoading={loading.settings} okText="Salvar" cancelText="Cancelar" destroyOnClose>
                <Form form={settingForm} layout="vertical" name="settingForm">
                    <Paragraph type="secondary">{editingSetting?.description}</Paragraph>
                    <Form.Item name="value" label="Valor" rules={[{ required: true, message: 'Por favor, insira o valor!' }]}>
                         {/* Adaptação do Input baseado no nome */}
                         {editingSetting?.name.includes('horas') || editingSetting?.name.includes('dias') ? (<InputNumber min={0} style={{ width: '100%' }} />)
                         : editingSetting?.name.includes('valor') ? (<InputNumber min={0} step="0.01" formatter={value => `R$ ${value}`.replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')} parser={value => value?.replace(/R\$\s?|\./g, '').replace(',', '.') ?? ''} style={{ width: '100%' }} />)
                         : (<Input.TextArea rows={2} />)} {/* Usa TextArea para edição também */}
                    </Form.Item>
                </Form>
            </Modal>

            {/* Modal Adicionar/Editar Filial */}
            <Modal title={editingBranch ? `Editar Filial: ${editingBranch.name}` : 'Adicionar Nova Filial'} open={isBranchModalVisible} onOk={handleBranchOk} onCancel={handleBranchCancel} confirmLoading={loading.branches} okText={editingBranch ? 'Salvar Alterações' : 'Criar Filial'} cancelText="Cancelar" destroyOnClose>
                <Form form={branchForm} layout="vertical" name="branchForm">
                    <Form.Item name="name" label="Nome da Filial" rules={[{ required: true, message: 'Por favor, insira o nome!' }]}><Input placeholder="Ex: Filial Centro Expandido" /></Form.Item>
                    <Form.Item name="address" label="Endereço (Opcional)"><Input.TextArea rows={3} placeholder="Rua, Número, Bairro..." /></Form.Item>
                </Form>
            </Modal>

             {/* Modal Adicionar/Editar Administrador */}
            <Modal title={editingAdmin ? `Editar Administrador: ${editingAdmin.name}` : 'Adicionar Novo Administrador'} open={isAdminModalVisible} onOk={handleAdminOk} onCancel={handleAdminCancel} confirmLoading={loading.admins} okText={editingAdmin ? 'Salvar Alterações' : 'Criar Administrador'} cancelText="Cancelar" destroyOnClose>
                <Form form={adminForm} layout="vertical" name="adminForm">
                    <Form.Item name="name" label="Nome Completo" rules={[{ required: true, message: 'Por favor, insira o nome!' }]}><Input placeholder="Nome do Administrador" /></Form.Item>
                    <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Por favor, insira o email!' }, { type: 'email', message: 'Email inválido!' }]}><Input placeholder="admin@seudominio.com" /></Form.Item>
                    {/* Campos de senha só aparecem na criação */}
                    {!editingAdmin && (<>
                        <Form.Item name="password" label="Senha" rules={[{ required: true, message: 'Por favor, insira a senha!' }, { min: 6, message: 'A senha deve ter no mínimo 6 caracteres.'}]} hasFeedback><Input.Password placeholder="Senha forte (mínimo 6 caracteres)"/></Form.Item>
                        <Form.Item name="confirmPassword" label="Confirmar Senha" dependencies={['password']} hasFeedback rules={[{ required: true, message: 'Por favor, confirme a senha!' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) { return Promise.resolve(); } return Promise.reject(new Error('As senhas não coincidem!')); }, })]}><Input.Password placeholder="Repita a senha"/></Form.Item>
                    </>)}
                     {/* Mensagem informativa na edição */}
                     {editingAdmin && (<Paragraph type="secondary">A alteração de senha não é feita por este formulário.</Paragraph>)}
                </Form>
            </Modal>

        </ConfigProvider>
    );
};

export default AdministrationPage;