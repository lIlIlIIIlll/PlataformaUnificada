// app/administracao/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Tabs, Typography, Button, Modal, Form, Input, message, Spin, Space,
    Tooltip, Popconfirm, Table, Descriptions, ConfigProvider, Row, Col, InputNumber,
    Select, Tag // Importar Select
} from 'antd';
import {
    EditOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, SettingOutlined,
    ShopOutlined, UsergroupAddOutlined, QuestionCircleOutlined, VideoCameraOutlined // Ícone para Hikvision
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR';
import { API_BASE_URL } from '../config/apiConfig'; // <-- Importa a URL base

dayjs.locale('pt-br');

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select; // Destruct Option from Select

// Status do Hikvision
const hikvisionStatusMap = {
    active: { text: 'Ativo', color: 'green' },
    inactive: { text: 'Inativo', color: 'grey' },
    maintenance: { text: 'Manutenção', color: 'orange' },
    error: { text: 'Erro', color: 'red' },
};
const getHikvisionStatusTag = (status) => {
    const statusInfo = hikvisionStatusMap[status] || { text: status, color: 'default' };
    return <Tag color={statusInfo.color}>{statusInfo.text}</Tag>;
};

const AdministrationPage = () => {
    // --- State ---
    const [settings, setSettings] = useState([]);
    const [branches, setBranches] = useState([]);
    const [administrators, setAdministrators] = useState([]);
    const [hikvisions, setHikvisions] = useState([]); // <<< NOVO ESTADO para Hikvisions
    const [loading, setLoading] = useState({ settings: false, branches: false, admins: false, hikvisions: false }); // <<< Adicionado loading para Hikvisions

    // --- Modal States ---
    // Edit Setting Modal
    const [isSettingModalVisible, setIsSettingModalVisible] = useState(false);
    const [editingSetting, setEditingSetting] = useState(null);
    const [settingForm] = Form.useForm();

    // Add Setting Modal
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

    // <<< NOVOS ESTADOS para Hikvision Modal >>>
    const [isHikvisionModalVisible, setIsHikvisionModalVisible] = useState(false);
    const [editingHikvision, setEditingHikvision] = useState(null);
    const [hikvisionForm] = Form.useForm();

    // --- Fetch Data (API) ---
    const fetchSettings = useCallback(async () => {
        setLoading(prev => ({ ...prev, settings: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/settings`);
            if (!response.ok) throw new Error('Falha ao carregar configurações');
            const data = await response.json();
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
            setBranches(data); // Guardar filiais para selects
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
            setAdministrators(data);
        } catch (error) {
            message.error(`Erro ao carregar administradores: ${error.message}`);
        } finally {
            setLoading(prev => ({ ...prev, admins: false }));
        }
    }, []);

    // <<< NOVA FUNÇÃO para buscar Hikvisions >>>
    const fetchHikvisions = useCallback(async () => {
        setLoading(prev => ({ ...prev, hikvisions: true }));
        try {
            // Incluir branch para mostrar o nome na tabela
            const response = await fetch(`${API_BASE_URL}/hikvisions?include=branch`);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Falha ao carregar dispositivos Hikvision');
            }
            const data = await response.json();
            setHikvisions(data);
        } catch (error) {
            message.error(`Erro ao carregar dispositivos Hikvision: ${error.message}`);
        } finally {
            setLoading(prev => ({ ...prev, hikvisions: false }));
        }
    }, []);

    useEffect(() => {
        fetchSettings();
        fetchBranches();
        fetchAdmins();
        fetchHikvisions(); // <<< Chamar a busca de Hikvisions
    }, [fetchSettings, fetchBranches, fetchAdmins, fetchHikvisions]); // <<< Adicionar fetchHikvisions às dependências

    // --- Settings Modal Handlers (API) ---
    const showEditSettingModal = (setting) => {
        setEditingSetting(setting);
        let formValue = setting.value;
        // Tenta converter para número se for campo numérico conhecido
        if (setting.name.includes('horas') || setting.name.includes('dias') || setting.name.includes('valor') || setting.name.includes('port')) {
            const parsed = parseFloat(setting.value);
            formValue = isNaN(parsed) ? setting.value : parsed; // Mantém string se não for número válido
        }
        settingForm.setFieldsValue({ value: formValue });
        setIsSettingModalVisible(true);
    };
    const handleSettingCancel = () => {
        setIsSettingModalVisible(false); setEditingSetting(null); settingForm.resetFields();
    };
    const handleSettingOk = async () => {
        try {
            const values = await settingForm.validateFields();
            setLoading(prev => ({ ...prev, settings: true }));
            const url = `${API_BASE_URL}/settings/${editingSetting.name}`;
            const response = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ value: String(values.value), description: editingSetting.description }) });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.message || `Falha ao atualizar config.`); }
            message.success(`Configuração "${editingSetting.name}" atualizada.`);
            handleSettingCancel(); fetchSettings();
        } catch (errorInfo) { console.error('Falha API config:', errorInfo); if (errorInfo?.errorFields) console.log('Erro form:', errorInfo.errorFields); else message.error(`Erro salvar config: ${errorInfo.message}`); }
        finally { setLoading(prev => ({ ...prev, settings: false })); }
    };
    const showAddSettingModal = () => { addSettingForm.resetFields(); setIsAddSettingModalVisible(true); };
    const handleAddSettingCancel = () => { setIsAddSettingModalVisible(false); addSettingForm.resetFields(); };
    const handleAddSettingOk = async () => {
        try {
            const values = await addSettingForm.validateFields();
            setLoading(prev => ({ ...prev, settings: true }));
            const url = `${API_BASE_URL}/settings`;
            const body = { name: values.name, value: String(values.value), description: values.description || '' };
            const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 409) throw new Error(errorData.message || 'Nome já existe.'); if (response.status === 400) throw new Error(errorData.message || 'Dados inválidos.'); throw new Error(errorData.message || `Falha criar config.`); }
            message.success(`Configuração "${values.name}" criada.`); handleAddSettingCancel(); fetchSettings();
        } catch (errorInfo) { console.error('Falha criar config:', errorInfo); if (errorInfo?.errorFields) console.log('Erro form:', errorInfo.errorFields); else message.error(`Erro criar config: ${errorInfo.message}`); }
        finally { setLoading(prev => ({ ...prev, settings: false })); }
    };
    const handleDeleteSetting = async (name) => {
        setLoading(prev => ({ ...prev, settings: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/settings/${name}`, { method: 'DELETE' });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 404) throw new Error('Config não encontrada.'); throw new Error(errorData.message || `Falha excluir config.`); }
            message.success(`Configuração "${name}" excluída.`); fetchSettings();
        } catch (error) { message.error(`Erro excluir config: ${error.message}`); }
        finally { setLoading(prev => ({ ...prev, settings: false })); }
    };

    // --- Branch Modal Handlers (API) ---
    const showAddBranchModal = () => { setEditingBranch(null); branchForm.resetFields(); setIsBranchModalVisible(true); };
    const showEditBranchModal = (branch) => { setEditingBranch(branch); branchForm.setFieldsValue({ name: branch.name, address: branch.address }); setIsBranchModalVisible(true); };
    const handleBranchCancel = () => { setIsBranchModalVisible(false); setEditingBranch(null); branchForm.resetFields(); };
    const handleBranchOk = async () => {
        try {
            const values = await branchForm.validateFields(); setLoading(prev => ({ ...prev, branches: true }));
            const url = editingBranch ? `${API_BASE_URL}/branches/${editingBranch.id}` : `${API_BASE_URL}/branches`; const method = editingBranch ? 'PUT' : 'POST';
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(values) });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.message || `Falha ${editingBranch ? 'atualizar' : 'criar'} filial.`); }
            const result = await response.json(); message.success(`Filial "${result.name}" ${editingBranch ? 'atualizada' : 'criada'}.`); handleBranchCancel(); fetchBranches();
        } catch (errorInfo) { console.error('Falha API filial:', errorInfo); if (errorInfo?.errorFields) console.log('Erro form:', errorInfo.errorFields); else message.error(`Erro salvar filial: ${errorInfo.message}`); }
        finally { setLoading(prev => ({ ...prev, branches: false })); }
    };
    const handleDeleteBranch = async (id) => {
        setLoading(prev => ({ ...prev, branches: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/branches/${id}`, { method: 'DELETE' });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 409) throw new Error(errorData.message || 'Filial possui dependências.'); if (response.status === 404) throw new Error('Filial não encontrada.'); throw new Error(errorData.message || `Falha excluir filial.`); }
            message.success(`Filial ID ${id} excluída.`); fetchBranches();
        } catch (error) { message.error(`Erro excluir filial: ${error.message}`); }
        finally { setLoading(prev => ({ ...prev, branches: false })); }
    };

    // --- Admin Modal Handlers (API) ---
    const showAddAdminModal = () => { setEditingAdmin(null); adminForm.resetFields(); setIsAdminModalVisible(true); };
    const showEditAdminModal = (admin) => { setEditingAdmin(admin); adminForm.setFieldsValue({ name: admin.name, email: admin.email }); setIsAdminModalVisible(true); };
    const handleAdminCancel = () => { setIsAdminModalVisible(false); setEditingAdmin(null); adminForm.resetFields(); };
    const handleAdminOk = async () => {
        try {
            const values = await adminForm.validateFields(); setLoading(prev => ({ ...prev, admins: true }));
            const url = editingAdmin ? `${API_BASE_URL}/administrators/${editingAdmin.id}` : `${API_BASE_URL}/administrators`; const method = editingAdmin ? 'PUT' : 'POST';
            const body = editingAdmin ? { name: values.name, email: values.email } : (({ confirmPassword, ...rest }) => rest)(values); // Remove confirmação para POST
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 409) throw new Error(errorData.message || 'Email já cadastrado.'); if (response.status === 400) throw new Error(errorData.message || 'Dados inválidos.'); throw new Error(errorData.message || `Falha ${editingAdmin ? 'atualizar' : 'criar'} admin.`); }
            const result = await response.json(); message.success(`Admin "${result.name}" ${editingAdmin ? 'atualizado' : 'criado'}.`); handleAdminCancel(); fetchAdmins();
        } catch (errorInfo) { console.error('Falha API admin:', errorInfo); if (errorInfo?.errorFields) console.log('Erro form:', errorInfo.errorFields); else message.error(`Erro salvar admin: ${errorInfo.message}`); }
        finally { setLoading(prev => ({ ...prev, admins: false })); }
    };
    const handleDeleteAdmin = async (id) => {
        setLoading(prev => ({ ...prev, admins: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/administrators/${id}`, { method: 'DELETE' });
            if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 404) throw new Error('Admin não encontrado.'); if (response.status === 409) throw new Error(errorData.message || 'Não é possível excluir admin.'); throw new Error(errorData.message || `Falha excluir admin.`); }
            message.success(`Admin ID ${id} excluído.`); fetchAdmins();
        } catch (error) { message.error(`Erro excluir admin: ${error.message}`); }
        finally { setLoading(prev => ({ ...prev, admins: false })); }
    };

    // <<< NOVOS Handlers para Hikvision Modal (API) >>>
    const showAddHikvisionModal = () => {
        setEditingHikvision(null);
        hikvisionForm.resetFields();
        hikvisionForm.setFieldsValue({ status: 'active', port: 80 }); // Defaults
        setIsHikvisionModalVisible(true);
    };
    const showEditHikvisionModal = (hikvision) => {
        setEditingHikvision(hikvision);
        // Preenche o form com os dados existentes, EXCETO a senha
        hikvisionForm.setFieldsValue({
            branchId: hikvision.branchId,
            name: hikvision.name,
            ipAddress: hikvision.ipAddress,
            port: hikvision.port,
            username: hikvision.username,
            serialNumber: hikvision.serialNumber,
            status: hikvision.status,
            // password: '', // Não preenche a senha no modal de edição
        });
        setIsHikvisionModalVisible(true);
    };
    const handleHikvisionCancel = () => {
        setIsHikvisionModalVisible(false);
        setEditingHikvision(null);
        hikvisionForm.resetFields();
    };
    const handleHikvisionOk = async () => {
        try {
            const values = await hikvisionForm.validateFields();
            setLoading(prev => ({ ...prev, hikvisions: true }));
            const url = editingHikvision ? `${API_BASE_URL}/hikvisions/${editingHikvision.id}` : `${API_BASE_URL}/hikvisions`;
            const method = editingHikvision ? 'PUT' : 'POST';

            // Prepara o corpo da requisição
            let body = { ...values };
            if (editingHikvision) {
                // No modo de edição, só envia a senha se ela foi digitada (não está vazia)
                if (!values.password || values.password.trim() === '') {
                    delete body.password; // Não envia a senha se não foi alterada
                }
                // Remove confirmPassword se existir no form (não deveria, mas por segurança)
                delete body.confirmPassword;
            } else {
                // No modo de criação, remove confirmPassword antes de enviar
                delete body.confirmPassword;
            }

            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 409) throw new Error(errorData.message || 'Número de série já cadastrado.');
                if (response.status === 400) throw new Error(errorData.message || 'Dados inválidos (verifique filial, IP, porta, status).');
                throw new Error(errorData.message || `Falha ao ${editingHikvision ? 'atualizar' : 'criar'} dispositivo Hikvision.`);
            }
            const result = await response.json(); // API retorna o objeto sem a senha
            message.success(`Dispositivo Hikvision "${result.name}" ${editingHikvision ? 'atualizado' : 'criado'}.`);
            handleHikvisionCancel();
            fetchHikvisions(); // Rebusca a lista de Hikvisions
        } catch (errorInfo) {
            console.error('Falha API Hikvision:', errorInfo);
            if (errorInfo?.errorFields) { console.log('Erro form:', errorInfo.errorFields); }
            else { message.error(`Erro ao salvar dispositivo Hikvision: ${errorInfo.message}`); }
        } finally {
            setLoading(prev => ({ ...prev, hikvisions: false }));
        }
    };
    const handleDeleteHikvision = async (id, name) => {
        setLoading(prev => ({ ...prev, hikvisions: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/hikvisions/${id}`, { method: 'DELETE' });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 404) throw new Error('Dispositivo Hikvision não encontrado.');
                if (response.status === 409) throw new Error(errorData.message || 'Não é possível excluir (pode ter dependências).');
                throw new Error(errorData.message || `Falha ao excluir dispositivo Hikvision.`);
            }
            message.success(`Dispositivo Hikvision "${name}" (ID: ${id}) excluído.`);
            fetchHikvisions(); // Rebusca a lista
        } catch (error) {
            message.error(`Erro ao excluir dispositivo Hikvision: ${error.message}`);
        } finally {
            setLoading(prev => ({ ...prev, hikvisions: false }));
        }
    };


    // --- Table Columns ---
    const branchColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id },
        { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'Endereço', dataIndex: 'address', key: 'address', render: text => text || '-' },
        { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() },
        { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() },
        { title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right', render: (_, r) => (<Space><Tooltip title="Editar"><Button type="link" icon={<EditOutlined />} onClick={() => showEditBranchModal(r)} /></Tooltip><Popconfirm title={`Excluir filial "${r.name}"?`} description="Ação irreversível." onConfirm={() => handleDeleteBranch(r.id)} okT="Sim" cancelT="Não" okB={{ danger: true }} icon={<Q color='red'/>}> <Tooltip title="Excluir"><Button type="link" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm></Space>), },
    ];
    const adminColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id },
        { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a, b) => a.email.localeCompare(b.email) },
        { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() },
        { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() },
        { title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right', render: (_, r) => (<Space><Tooltip title="Editar"><Button type="link" icon={<EditOutlined />} onClick={() => showEditAdminModal(r)} /></Tooltip><Popconfirm title={`Excluir admin "${r.name}"?`} description="Ação irreversível." onConfirm={() => handleDeleteAdmin(r.id)} okT="Sim" cancelT="Não" okB={{ danger: true }} disabled={r.id===1} icon={<Q color='red'/>}> <Tooltip title={r.id===1?"Não pode excluir admin principal":"Excluir"}><span style={{cursor: r.id===1?'not-allowed':'pointer'}}><Button type="link" danger icon={<DeleteOutlined />} disabled={r.id===1} style={r.id===1?{pointerEvents:'none',color:'rgba(0,0,0,0.25)'}:{}}/></span></Tooltip></Popconfirm></Space>), },
    ];
    // <<< NOVAS Colunas para Hikvision >>>
    const hikvisionColumns = [
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id },
        {
            title: 'Nome Disp.', dataIndex: 'name', key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            ellipsis: true, // Adiciona '...' se o nome for muito longo
            render: (text) => <Tooltip title={text}>{text}</Tooltip>
        },
        {
            title: 'Filial', dataIndex: ['branch', 'name'], key: 'branchName',
            render: (branchName) => branchName || <Text type="secondary">N/D</Text>,
            sorter: (a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || ''),
            // Filtro pode ser adicionado aqui se necessário
        },
        { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress' },
        { title: 'Porta', dataIndex: 'port', key: 'port', width: 80, align: 'center' },
        { title: 'Usuário', dataIndex: 'username', key: 'username', ellipsis: true, render: (text) => <Tooltip title={text}>{text}</Tooltip> },
        { title: 'S/N', dataIndex: 'serialNumber', key: 'serialNumber', ellipsis: true, render: (text) => <Tooltip title={text}>{text}</Tooltip> },
        {
            title: 'Status', dataIndex: 'status', key: 'status', width: 120, align: 'center',
            render: getHikvisionStatusTag,
            filters: Object.keys(hikvisionStatusMap).map(s => ({ text: hikvisionStatusMap[s].text, value: s })),
            onFilter: (value, record) => record.status === value, // Filtro frontend
        },
        { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() },
        { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() },
        {
            title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right',
            render: (_, record) => (
                <Space size="middle">
                    <Tooltip title="Editar Dispositivo">
                        <Button type="link" icon={<EditOutlined />} onClick={() => showEditHikvisionModal(record)} />
                    </Tooltip>
                    <Popconfirm
                        title={`Excluir dispositivo "${record.name}"?`}
                        description="Ação irreversível."
                        onConfirm={() => handleDeleteHikvision(record.id, record.name)} // Passa nome para msg de sucesso
                        okText="Sim, Excluir" cancelText="Não"
                        okButtonProps={{ danger: true }} icon={<QuestionCircleOutlined style={{ color: 'red' }}/>}
                    >
                        <Tooltip title="Excluir Dispositivo">
                            <Button type="link" danger icon={<DeleteOutlined />} />
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
                    <Row justify="end" style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={showAddSettingModal}>Adicionar Configuração</Button>
                    </Row>
                    <Spin spinning={loading.settings}>
                        <Descriptions bordered column={1} size="small">
                            {settings.map(s => (
                                <Descriptions.Item key={s.id || s.name} label={<Tooltip title={s.description || s.name}>{s.name}</Tooltip>} labelStyle={{ width: '30%'}}>
                                    <Row justify="space-between" align="middle">
                                        <Col style={{ flex: 1, marginRight: '8px', overflow: 'hidden' }}>
                                            <Text style={{ wordBreak: 'break-all' }}>{s.value}</Text>
                                            {s.updatedAt && <><br/><Text type="secondary" style={{ fontSize: '12px' }}>Atualizado: {dayjs(s.updatedAt).format('DD/MM/YY HH:mm')}</Text></>}
                                        </Col>
                                        <Col>
                                            <Space size="small">
                                                <Tooltip title="Editar"><Button type="link" icon={<EditOutlined />} onClick={() => showEditSettingModal(s)} size="small" /></Tooltip>
                                                <Popconfirm title={`Excluir "${s.name}"?`} onConfirm={() => handleDeleteSetting(s.name)} okT="Sim" cancelT="Não" okB={{ danger: true }} icon={<Q color='red'/>}>
                                                    <Tooltip title="Excluir"><Button type="link" danger icon={<DeleteOutlined />} size="small" /></Tooltip>
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

                 {/* <<< NOVA Aba Hikvision >>> */}
                <TabPane tab={<span><VideoCameraOutlined /> Gerenciar Hikvisions</span>} key="4">
                    <Row justify="end" style={{ marginBottom: 16 }}>
                        <Button type="primary" icon={<PlusOutlined />} onClick={showAddHikvisionModal}>
                            Adicionar Dispositivo
                        </Button>
                    </Row>
                    <Spin spinning={loading.hikvisions}>
                        <Table
                            dataSource={hikvisions}
                            columns={hikvisionColumns}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }} // Habilita scroll horizontal
                        />
                    </Spin>
                </TabPane>

            </Tabs>

            {/* --- Modais --- */}
            {/* (Modal de Configurações, Filiais e Admins permanecem os mesmos) */}
            {/* Modal Adicionar Configuração */}
            <Modal title="Adicionar Configuração" open={isAddSettingModalVisible} onOk={handleAddSettingOk} onCancel={handleAddSettingCancel} confirmLoading={loading.settings} okText="Criar" cancelText="Cancelar" destroyOnClose >
                <Form form={addSettingForm} layout="vertical" name="addSettingForm"><Form.Item name="name" label="Nome (Chave)" rules={[{ required: true, message: 'Insira nome!' }, { pattern: /^[a-z0-9_]+$/, message: 'Use a-z, 0-9, _.' }]} tooltip="Identificador único."><Input placeholder="exemplo_nome_config" /></Form.Item><Form.Item name="value" label="Valor" rules={[{ required: true, message: 'Insira valor!' }]} tooltip="Valor da config."><Input.TextArea rows={2} /></Form.Item><Form.Item name="description" label="Descrição (Opcional)" tooltip="Explicação."><Input.TextArea rows={3} /></Form.Item></Form>
            </Modal>
            {/* Modal Editar Configuração */}
            <Modal title={`Editar: ${editingSetting?.name}`} open={isSettingModalVisible} onOk={handleSettingOk} onCancel={handleSettingCancel} confirmLoading={loading.settings} okText="Salvar" cancelText="Cancelar" destroyOnClose>
                <Form form={settingForm} layout="vertical" name="settingForm"><Paragraph type="secondary">{editingSetting?.description}</Paragraph><Form.Item name="value" label="Valor" rules={[{ required: true, message: 'Insira valor!' }]}>{editingSetting?.name.includes('horas')||editingSetting?.name.includes('dias')||editingSetting?.name.includes('port')?(<InputNumber min={0} style={{width:'100%'}}/>):editingSetting?.name.includes('valor')?(<InputNumber min={0} step="0.01" formatter={v=>`R$ ${v}`.replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')} parser={v=>v?.replace(/R\$\s?|\./g,'').replace(',','.')??''} style={{width:'100%'}}/>):(<Input.TextArea rows={2}/>)}</Form.Item></Form>
            </Modal>
            {/* Modal Adicionar/Editar Filial */}
            <Modal title={editingBranch?`Editar: ${editingBranch.name}`:'Adicionar Filial'} open={isBranchModalVisible} onOk={handleBranchOk} onCancel={handleBranchCancel} confirmLoading={loading.branches} okText={editingBranch?'Salvar':'Criar'} cancelText="Cancelar" destroyOnClose>
                <Form form={branchForm} layout="vertical" name="branchForm"><Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Insira nome!' }]}><Input placeholder="Filial Centro" /></Form.Item><Form.Item name="address" label="Endereço (Opcional)"><Input.TextArea rows={3} placeholder="Rua..." /></Form.Item></Form>
            </Modal>
             {/* Modal Adicionar/Editar Admin */}
            <Modal title={editingAdmin?`Editar: ${editingAdmin.name}`:'Adicionar Admin'} open={isAdminModalVisible} onOk={handleAdminOk} onCancel={handleAdminCancel} confirmLoading={loading.admins} okText={editingAdmin?'Salvar':'Criar'} cancelText="Cancelar" destroyOnClose>
                <Form form={adminForm} layout="vertical" name="adminForm"><Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Insira nome!' }]}><Input/></Form.Item><Form.Item name="email" label="Email" rules={[{ required: true, message: 'Insira email!' }, { type: 'email', message: 'Email inválido!' }]}><Input type="email"/></Form.Item>{!editingAdmin && (<><Form.Item name="password" label="Senha" rules={[{ required: true, message: 'Insira senha!' }, { min: 6, message: 'Mínimo 6 caracteres.'}]} hasFeedback><Input.Password/></Form.Item><Form.Item name="confirmPassword" label="Confirmar Senha" dependencies={['password']} hasFeedback rules={[{ required: true, message: 'Confirme senha!' }, ({ getF }) => ({ validator(_, v) { if (!v || getF('password') === v) return Promise.resolve(); return Promise.reject(new Error('Senhas não coincidem!')); }, })]}><Input.Password/></Form.Item></>)}{editingAdmin && (<Paragraph type="secondary">Alteração de senha não disponível aqui.</Paragraph>)}</Form>
            </Modal>

             {/* <<< NOVO Modal para Hikvision >>> */}
            <Modal
                title={editingHikvision ? `Editar Dispositivo: ${editingHikvision.name}` : 'Adicionar Novo Dispositivo Hikvision'}
                open={isHikvisionModalVisible}
                onOk={handleHikvisionOk}
                onCancel={handleHikvisionCancel}
                confirmLoading={loading.hikvisions}
                okText={editingHikvision ? 'Salvar Alterações' : 'Criar Dispositivo'}
                cancelText="Cancelar"
                width={600} // Modal um pouco maior para acomodar campos
                destroyOnClose
                maskClosable={false} // Evita fechar ao clicar fora
            >
                <Form form={hikvisionForm} layout="vertical" name="hikvisionForm">
                    <Row gutter={16}> {/* Divide em colunas */}
                        <Col span={12}>
                            <Form.Item name="name" label="Nome do Dispositivo" rules={[{ required: true, message: 'Insira o nome!' }]} tooltip="Nome para identificar o dispositivo (Ex: Entrada Principal, Câmera Corredor 1)">
                                <Input placeholder="Entrada Principal" />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="branchId" label="Filial" rules={[{ required: true, message: 'Selecione a filial!' }]}>
                                <Select placeholder="Selecione a filial" loading={branches.length === 0 && loading.branches} allowClear>
                                    {branches.map(branch => (
                                        <Option key={branch.id} value={branch.id}>{branch.name}</Option>
                                    ))}
                                </Select>
                            </Form.Item>
                        </Col>
                    </Row>
                    <Row gutter={16}>
                         <Col span={12}>
                             <Form.Item name="ipAddress" label="Endereço IP" rules={[{ required: true, message: 'Insira o IP!' }, /* { pattern: /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/, message: 'Formato IPv4 inválido!'} */ ]}>
                                <Input placeholder="192.168.1.100" />
                            </Form.Item>
                         </Col>
                         <Col span={12}>
                              <Form.Item name="port" label="Porta" rules={[{ required: true, message: 'Insira a porta!' }]} initialValue={80}>
                                <InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="80" />
                            </Form.Item>
                         </Col>
                    </Row>
                     <Row gutter={16}>
                         <Col span={12}>
                              <Form.Item name="username" label="Usuário Hikvision" rules={[{ required: true, message: 'Insira o usuário!' }]}>
                                <Input placeholder="admin" />
                            </Form.Item>
                         </Col>
                         <Col span={12}>
                            <Form.Item name="serialNumber" label="Número de Série" rules={[{ required: true, message: 'Insira o número de série!' }]} tooltip="Número de série único do dispositivo.">
                                <Input placeholder="DS-ABC123XYZ" />
                            </Form.Item>
                         </Col>
                    </Row>

                     {/* Campos de senha só obrigatórios na criação */}
                     <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="password"
                                label={editingHikvision ? "Nova Senha (Opcional)" : "Senha Hikvision"}
                                rules={editingHikvision ? [] : [{ required: true, message: 'Insira a senha!' }]} // Obrigatório só na criação
                                tooltip={editingHikvision ? "Deixe em branco para não alterar a senha." : "Senha de acesso ao dispositivo."}
                                hasFeedback={!editingHikvision} // Feedback só na criação
                            >
                                <Input.Password placeholder={editingHikvision ? 'Deixe em branco se não mudar' : 'Senha do dispositivo'} />
                            </Form.Item>
                        </Col>
                         {/* Confirmação só na criação */}
                        {!editingHikvision && (
                            <Col span={12}>
                                <Form.Item
                                    name="confirmPassword"
                                    label="Confirmar Senha"
                                    dependencies={['password']}
                                    hasFeedback
                                    rules={[
                                        { required: true, message: 'Confirme a senha!' },
                                        ({ getFieldValue }) => ({
                                            validator(_, value) {
                                                if (!value || getFieldValue('password') === value) return Promise.resolve();
                                                return Promise.reject(new Error('As senhas não coincidem!'));
                                            },
                                        }),
                                    ]}
                                >
                                    <Input.Password placeholder="Repita a senha" />
                                </Form.Item>
                            </Col>
                        )}
                     </Row>

                     <Form.Item name="status" label="Status" rules={[{ required: true, message: 'Selecione o status!' }]} initialValue={'active'}>
                        <Select placeholder="Selecione o status operacional">
                            {Object.keys(hikvisionStatusMap).map(statusKey => (
                                <Option key={statusKey} value={statusKey}>
                                    {hikvisionStatusMap[statusKey].text}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>

                    {/* Adicione outros campos se o modelo Hikvision tiver (ex: firmwareVersion, modelName) */}

                </Form>
            </Modal>

        </ConfigProvider>
    );
};

// Helper para popconfirm (evitar repetição) - Opcional
const Q = ({color}) => <QuestionCircleOutlined style={{ color: color || 'red' }}/>;

export default AdministrationPage;