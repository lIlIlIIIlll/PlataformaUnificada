// app/administracao/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Tabs, Typography, Button, Modal, Form, Input, message, Spin, Space,
    Tooltip, Popconfirm, Table, Descriptions, ConfigProvider, Row, Col, InputNumber,
    Select, Tag, List, Image as AntImage // Importar List e Image do Antd
} from 'antd';
import {
    EditOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, SettingOutlined,
    ShopOutlined, UsergroupAddOutlined, QuestionCircleOutlined, VideoCameraOutlined,
    LoadingOutlined, WhatsAppOutlined, PlayCircleOutlined, StopOutlined, ClearOutlined,
    SyncOutlined, QrcodeOutlined // Ícones para WhatsApp
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR';
import { API_BASE_URL } from '../../config/apiConfig';

dayjs.locale('pt-br');

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;
const { Option } = Select;

// Status do Hikvision (mantido)
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

// Papéis de Administrador
const adminRoleMap = {
    superadmin: { text: 'Super Admin', color: 'purple' },
    branch_admin: { text: 'Admin de Filial', color: 'blue' },
};
const getAdminRoleTag = (role) => {
    const roleInfo = adminRoleMap[role] || { text: role, color: 'default' };
    return <Tag color={roleInfo.color}>{roleInfo.text}</Tag>;
};

// --- NOVO: Status do WhatsApp ---
const whatsAppStatusMap = {
    disconnected: { text: 'Desconectado', color: 'red', icon: <StopOutlined /> },
    connecting: { text: 'Conectando...', color: 'blue', icon: <LoadingOutlined /> },
    qr_pending: { text: 'Aguardando QR Code', color: 'gold', icon: <QrcodeOutlined /> },
    connected: { text: 'Conectado', color: 'green', icon: <WhatsAppOutlined /> },
    auth_failure: { text: 'Falha na Autenticação', color: 'red', icon: <StopOutlined /> },
    error: { text: 'Erro na Conexão', color: 'red', icon: <StopOutlined /> },
    initializing: { text: 'Inicializando...', color: 'cyan', icon: <LoadingOutlined /> },
    destroying: { text: 'Desconectando...', color: 'orange', icon: <LoadingOutlined /> },
    unknown: { text: 'Desconhecido', color: 'default', icon: <QuestionCircleOutlined /> }
};

const getWhatsAppStatusTag = (status) => {
    const statusInfo = whatsAppStatusMap[status] || whatsAppStatusMap.unknown;
    return <Tag icon={statusInfo.icon} color={statusInfo.color}>{statusInfo.text}</Tag>;
};


const AdministrationPage = () => {
    // --- State ---
    const [settings, setSettings] = useState([]);
    const [branches, setBranches] = useState([]);
    const [administrators, setAdministrators] = useState([]);
    const [hikvisions, setHikvisions] = useState([]);
    const [loading, setLoading] = useState({ settings: false, branches: false, admins: false, hikvisions: false, whatsapp: false });
    const [loadingAdminDetails, setLoadingAdminDetails] = useState(false);

    // --- NOVO: State para WhatsApp por Filial ---
    const [branchWhatsAppStatuses, setBranchWhatsAppStatuses] = useState({}); // { branchId: { status, qrCode, error, number, loading } }
    const [isQrModalVisible, setIsQrModalVisible] = useState(false);
    const [currentQrCode, setCurrentQrCode] = useState('');
    const [qrModalBranchName, setQrModalBranchName] = useState('');
    const [pollingIntervalId, setPollingIntervalId] = useState(null);


    // --- Modal States ---
    const [isSettingModalVisible, setIsSettingModalVisible] = useState(false);
    const [editingSetting, setEditingSetting] = useState(null);
    const [settingForm] = Form.useForm();

    const [isAddSettingModalVisible, setIsAddSettingModalVisible] = useState(false);
    const [addSettingForm] = Form.useForm();

    const [isBranchModalVisible, setIsBranchModalVisible] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [branchForm] = Form.useForm();

    const [isAdminModalVisible, setIsAdminModalVisible] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState(null);
    const [adminForm] = Form.useForm();

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

    const fetchBranchesInternal = useCallback(async () => { // Renomeado para evitar conflito de nome
        setLoading(prev => ({ ...prev, branches: true, whatsapp: true })); // Ativa loading de whatsapp também
        try {
            const response = await fetch(`${API_BASE_URL}/branches`);
            if (!response.ok) throw new Error('Falha ao carregar filiais');
            const data = await response.json();
            setBranches(data);

            // --- NOVO: Inicializa o status do WhatsApp para cada filial ---
            const initialStatuses = {};
            for (const branch of data) {
                initialStatuses[branch.id] = {
                    status: branch.whatsappStatus || 'disconnected', // Pega do DB
                    qrCode: branch.whatsappQrCode || null,
                    error: branch.whatsappLastError || null,
                    number: branch.whatsappNumber || null,
                    loading: false, // Loading individual por filial
                };
            }
            setBranchWhatsAppStatuses(initialStatuses);
            // --- FIM NOVO ---

        } catch (error) {
             message.error(`Erro ao carregar filiais: ${error.message}`);
        } finally {
            setLoading(prev => ({ ...prev, branches: false, whatsapp: false }));
        }
    }, []);

    const fetchAdmins = useCallback(async () => {
        setLoading(prev => ({ ...prev, admins: true }));
        try {
            const response = await fetch(`${API_BASE_URL}/administrators?include=branches`);
            if (!response.ok) throw new Error('Falha ao carregar administradores');
            const data = await response.json();
            setAdministrators(data);
        } catch (error) {
            message.error(`Erro ao carregar administradores: ${error.message}`);
        } finally {
            setLoading(prev => ({ ...prev, admins: false }));
        }
    }, []);
    const fetchHikvisions = useCallback(async () => {
        setLoading(prev => ({ ...prev, hikvisions: true }));
        try {
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
        fetchBranchesInternal(); // Usa a função renomeada
        fetchAdmins();
        fetchHikvisions();
    }, [fetchSettings, fetchBranchesInternal, fetchAdmins, fetchHikvisions]);
    // --- Fim do Fetch Data ---

    // --- Settings Modal Handlers (API) ---
    const showEditSettingModal = (setting) => { setEditingSetting(setting); let formValue=setting.value; if(setting.name.includes('horas')||setting.name.includes('dias')||setting.name.includes('valor')||setting.name.includes('port')){const parsed=parseFloat(setting.value); formValue=isNaN(parsed)?setting.value:parsed;} settingForm.setFieldsValue({value:formValue}); setIsSettingModalVisible(true); };
    const handleSettingCancel = () => { setIsSettingModalVisible(false); setEditingSetting(null); settingForm.resetFields(); };
    const handleSettingOk = async () => { try{const values=await settingForm.validateFields(); setLoading(prev=>({...prev,settings:true})); const url=`${API_BASE_URL}/settings/${editingSetting.name}`; const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:String(values.value),description:editingSetting.description})}); if(!response.ok){const errorData=await response.json().catch(()=>({})); throw new Error(errorData.message||`Falha ao atualizar config.`);} message.success(`Configuração "${editingSetting.name}" atualizada.`); handleSettingCancel(); fetchSettings();}catch(errorInfo){console.error('Falha API config:',errorInfo); if(errorInfo?.errorFields)console.log('Erro form:',errorInfo.errorFields); else message.error(`Erro salvar config: ${errorInfo.message}`);} finally{setLoading(prev=>({...prev,settings:false}));} };
    const showAddSettingModal = () => { addSettingForm.resetFields(); setIsAddSettingModalVisible(true); };
    const handleAddSettingCancel = () => { setIsAddSettingModalVisible(false); addSettingForm.resetFields(); };
    const handleAddSettingOk = async () => { try{const values=await addSettingForm.validateFields(); setLoading(prev=>({...prev,settings:true})); const url=`${API_BASE_URL}/settings`; const body={name:values.name,value:String(values.value),description:values.description||''}; const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===409)throw new Error(errorData.message||'Nome já existe.'); if(response.status===400)throw new Error(errorData.message||'Dados inválidos.'); throw new Error(errorData.message||`Falha criar config.`);} message.success(`Configuração "${values.name}" criada.`); handleAddSettingCancel(); fetchSettings();}catch(errorInfo){console.error('Falha criar config:',errorInfo); if(errorInfo?.errorFields)console.log('Erro form:',errorInfo.errorFields); else message.error(`Erro criar config: ${errorInfo.message}`);} finally{setLoading(prev=>({...prev,settings:false}));} };
    const handleDeleteSetting = async (name) => { setLoading(prev=>({...prev,settings:true})); try{const response=await fetch(`${API_BASE_URL}/settings/${name}`,{method:'DELETE'}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===404)throw new Error('Config não encontrada.'); throw new Error(errorData.message||`Falha excluir config.`);} message.success(`Configuração "${name}" excluída.`); fetchSettings();}catch(error){message.error(`Erro excluir config: ${error.message}`);} finally{setLoading(prev=>({...prev,settings:false}));} };
    // --- Fim Settings ---

    // --- Branch Modal Handlers (API) ---
    const showAddBranchModal = () => { setEditingBranch(null); branchForm.resetFields(); setIsBranchModalVisible(true); };
    const showEditBranchModal = (branch) => { setEditingBranch(branch); branchForm.setFieldsValue({ name: branch.name, address: branch.address, openaiAssistantIdOverride: branch.openaiAssistantIdOverride }); setIsBranchModalVisible(true); };
    const handleBranchCancel = () => { setIsBranchModalVisible(false); setEditingBranch(null); branchForm.resetFields(); };
    const handleBranchOk = async () => { try{const values=await branchForm.validateFields(); setLoading(prev=>({...prev,branches:true})); const url=editingBranch?`${API_BASE_URL}/branches/${editingBranch.id}`:`${API_BASE_URL}/branches`; const method=editingBranch?'PUT':'POST'; const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(values)}); if(!response.ok){const errorData=await response.json().catch(()=>({})); throw new Error(errorData.message||`Falha ${editingBranch?'atualizar':'criar'} filial.`);} const result=await response.json(); message.success(`Filial "${result.name}" ${editingBranch?'atualizada':'criada'}.`); handleBranchCancel(); fetchBranchesInternal();}catch(errorInfo){console.error('Falha API filial:',errorInfo); if(errorInfo?.errorFields)console.log('Erro form:',errorInfo.errorFields); else message.error(`Erro salvar filial: ${errorInfo.message}`);} finally{setLoading(prev=>({...prev,branches:false}));} };
    const handleDeleteBranch = async (id) => { setLoading(prev=>({...prev,branches:true})); try{const response=await fetch(`${API_BASE_URL}/branches/${id}`,{method:'DELETE'}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===409)throw new Error(errorData.message||'Filial possui dependências.'); if(response.status===404)throw new Error('Filial não encontrada.'); throw new Error(errorData.message||`Falha excluir filial.`);} message.success(`Filial ID ${id} excluída.`); fetchBranchesInternal();}catch(error){message.error(`Erro excluir filial: ${error.message}`);} finally{setLoading(prev=>({...prev,branches:false}));} };
    // --- Fim Branch ---

    // --- Admin Modal Handlers (API) ---
    const showAddAdminModal = () => { setEditingAdmin(null); adminForm.resetFields(); adminForm.setFieldsValue({ role: 'branch_admin', branchIds: [] }); setIsAdminModalVisible(true); };
    const showEditAdminModal = async (adminRecord) => { console.log("Abrindo modal para editar:", adminRecord); setIsAdminModalVisible(true); setLoadingAdminDetails(true); setEditingAdmin(null); adminForm.resetFields(); try { const response = await fetch(`${API_BASE_URL}/administrators/${adminRecord.id}?include=branches`); if (!response.ok) { const errorData = await response.json().catch(() => ({})); throw new Error(errorData.message || `Falha ao buscar detalhes do administrador (${response.status})`); } const adminWithDetails = await response.json(); setEditingAdmin(adminWithDetails); adminForm.setFieldsValue({ name: adminWithDetails.name, email: adminWithDetails.email, role: adminWithDetails.role, branchIds: adminWithDetails.branches ? adminWithDetails.branches.map(branch => branch.id) : [], }); console.log("Form preenchido com:", adminForm.getFieldsValue()); } catch (error) { console.error("Erro ao buscar detalhes do admin para edição:", error); message.error(`Não foi possível carregar os detalhes do administrador: ${error.message}`); setIsAdminModalVisible(false); } finally { setLoadingAdminDetails(false); } };
    const handleAdminCancel = () => { setIsAdminModalVisible(false); setEditingAdmin(null); adminForm.resetFields(); };
    const manageBranchAssociations = async (adminId, targetBranchIds = [], originalBranchIds = []) => { const branchesToAdd = targetBranchIds.filter(id => !originalBranchIds.includes(id)); const branchesToRemove = originalBranchIds.filter(id => !targetBranchIds.includes(id)); const addPromises = branchesToAdd.map(branchId => fetch(`${API_BASE_URL}/branches/${branchId}/administrators/${adminId}`, { method: 'POST' }).then(res => { if (!res.ok) throw new Error(`Falha ao associar à filial ${branchId}`); }) ); const removePromises = branchesToRemove.map(branchId => fetch(`${API_BASE_URL}/branches/${branchId}/administrators/${adminId}`, { method: 'DELETE' }).then(res => { if (!res.ok && res.status !== 404) throw new Error(`Falha ao desassociar da filial ${branchId}`); }) ); await Promise.all([...addPromises, ...removePromises]); };
    const handleAdminOk = async () => { try { const values = await adminForm.validateFields(); setLoading(prev => ({ ...prev, admins: true })); const isAdminCreation = !editingAdmin; const url = isAdminCreation ? `${API_BASE_URL}/administrators` : `${API_BASE_URL}/administrators/${editingAdmin.id}`; const method = isAdminCreation ? 'POST' : 'PUT'; let body = { name: values.name, email: values.email, role: values.role, }; if (isAdminCreation) { body.password = values.password; } const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }); if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 409) throw new Error(errorData.message || 'Email já cadastrado.'); if (response.status === 400) throw new Error(errorData.message || 'Dados inválidos.'); throw new Error(errorData.message || `Falha ao ${isAdminCreation ? 'criar' : 'atualizar'} admin.`); } const savedAdmin = await response.json(); const adminId = savedAdmin.id; const successMessage = `Admin "${savedAdmin.name}" ${isAdminCreation ? 'criado' : 'atualizado'}.`; if (values.role === 'branch_admin') { const targetBranchIds = values.branchIds || []; const originalBranchIds = editingAdmin?.branches?.map(b => b.id) || []; try { await manageBranchAssociations(adminId, targetBranchIds, originalBranchIds); message.success(successMessage + ' Associações de filial atualizadas.'); } catch (assocError) { console.error("Erro ao gerenciar associações:", assocError); message.warning(`${successMessage} Ocorreu um erro ao atualizar as associações de filial: ${assocError.message}`); } } else if (values.role === 'superadmin' && !isAdminCreation) { const originalBranchIds = editingAdmin?.branches?.map(b => b.id) || []; if (originalBranchIds.length > 0) { try { await manageBranchAssociations(adminId, [], originalBranchIds); message.success(successMessage + ' Associações de filial removidas devido à mudança para Super Admin.'); } catch (assocError) { console.error("Erro ao remover associações na mudança para superadmin:", assocError); message.warning(`${successMessage} Ocorreu um erro ao remover associações de filial: ${assocError.message}`); } } else { message.success(successMessage); } } else { message.success(successMessage); } handleAdminCancel(); fetchAdmins(); } catch (errorInfo) { console.error('Falha na validação ou API admin:', errorInfo); if (errorInfo?.errorFields) { console.log('Erro de validação do formulário:', errorInfo.errorFields); } else { message.error(`Erro ao salvar administrador: ${errorInfo.message}`); } } finally { setLoading(prev => ({ ...prev, admins: false })); } };
    const handleDeleteAdmin = async (id) => { setLoading(prev=>({...prev,admins:true})); try{const response=await fetch(`${API_BASE_URL}/administrators/${id}`,{method:'DELETE'}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===404)throw new Error('Admin não encontrado.'); throw new Error(errorData.message||`Falha excluir admin.`);} message.success(`Administrador ID ${id} excluído.`); fetchAdmins();}catch(error){message.error(`Erro excluir admin: ${error.message}`);} finally{setLoading(prev=>({...prev,admins:false}));} };
    // --- Fim Admin ---

    // --- Hikvision Modal Handlers (API) ---
    const showAddHikvisionModal = () => { setEditingHikvision(null); hikvisionForm.resetFields(); hikvisionForm.setFieldsValue({ status: 'active', port: 80 }); setIsHikvisionModalVisible(true); };
    const showEditHikvisionModal = (hikvision) => { setEditingHikvision(hikvision); hikvisionForm.setFieldsValue({ branchId: hikvision.branchId, name: hikvision.name, ipAddress: hikvision.ipAddress, port: hikvision.port, username: hikvision.username, serialNumber: hikvision.serialNumber, status: hikvision.status, }); setIsHikvisionModalVisible(true); };
    const handleHikvisionCancel = () => { setIsHikvisionModalVisible(false); setEditingHikvision(null); hikvisionForm.resetFields(); };
    const handleHikvisionOk = async () => { try{const values=await hikvisionForm.validateFields(); setLoading(prev=>({...prev,hikvisions:true})); const url=editingHikvision?`${API_BASE_URL}/hikvisions/${editingHikvision.id}`:`${API_BASE_URL}/hikvisions`; const method=editingHikvision?'PUT':'POST'; let body={...values}; if(editingHikvision){if(!values.password||values.password.trim()===''){delete body.password;} delete body.confirmPassword;}else{delete body.confirmPassword;} const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===409)throw new Error(errorData.message||'Número de série já cadastrado.'); if(response.status===400)throw new Error(errorData.message||'Dados inválidos (verifique filial, IP, porta, status).'); throw new Error(errorData.message||`Falha ao ${editingHikvision?'atualizar':'criar'} dispositivo Hikvision.`);} const result=await response.json(); message.success(`Dispositivo Hikvision "${result.name}" ${editingHikvision?'atualizado':'criado'}.`); handleHikvisionCancel(); fetchHikvisions();}catch(errorInfo){console.error('Falha API Hikvision:',errorInfo); if(errorInfo?.errorFields){console.log('Erro form:',errorInfo.errorFields);} else{message.error(`Erro ao salvar dispositivo Hikvision: ${errorInfo.message}`);}} finally{setLoading(prev=>({...prev,hikvisions:false}));} };
    const handleDeleteHikvision = async (id, name) => { setLoading(prev=>({...prev,hikvisions:true})); try{const response=await fetch(`${API_BASE_URL}/hikvisions/${id}`,{method:'DELETE'}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===404)throw new Error('Dispositivo Hikvision não encontrado.'); if(response.status===409)throw new Error(errorData.message||'Não é possível excluir (pode ter dependências).'); throw new Error(errorData.message||`Falha ao excluir dispositivo Hikvision.`);} message.success(`Dispositivo Hikvision "${name}" (ID: ${id}) excluído.`); fetchHikvisions();}catch(error){message.error(`Erro ao excluir dispositivo Hikvision: ${error.message}`);} finally{setLoading(prev=>({...prev,hikvisions:false}));} };
    // --- Fim Hikvision ---

    // --- NOVO: WhatsApp Handlers ---
    const updateLocalBranchWhatsAppStatus = (branchId, updates) => {
        setBranchWhatsAppStatuses(prev => ({
            ...prev,
            [branchId]: {
                ...(prev[branchId] || {}),
                ...updates,
            }
        }));
    };

    const fetchBranchWhatsAppStatus = useCallback(async (branchId, branchName) => {
        updateLocalBranchWhatsAppStatus(branchId, { loading: true });
        try {
            const response = await fetch(`${API_BASE_URL}/branches/${branchId}/whatsapp/status`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao buscar status do WhatsApp (${response.status})`);
            }
            const data = await response.json();
            updateLocalBranchWhatsAppStatus(branchId, {
                status: data.status,
                qrCode: data.qrCode,
                error: data.lastError,
                number: data.connectedNumber,
                loading: false,
            });

            if (data.status === 'qr_pending' && data.qrCode) {
                setCurrentQrCode(data.qrCode);
                setQrModalBranchName(branchName);
                setIsQrModalVisible(true);
                // Inicia polling se não estiver já ativo para este QR
                if (pollingIntervalId) clearInterval(pollingIntervalId); // Limpa anterior
                const newIntervalId = setInterval(() => fetchBranchWhatsAppStatus(branchId, branchName), 5000); // Polling a cada 5s
                setPollingIntervalId(newIntervalId);
            } else if (data.status === 'connected' || data.status === 'disconnected' || data.status === 'error' || data.status === 'auth_failure') {
                // Se conectou ou desconectou/erro, para o polling e fecha o modal de QR
                if (pollingIntervalId) clearInterval(pollingIntervalId);
                setPollingIntervalId(null);
                setIsQrModalVisible(false);
            }
            return data.status; // Retorna o status para quem chamou
        } catch (error) {
            message.error(`Erro ao buscar status do WhatsApp para filial ${branchName || branchId}: ${error.message}`);
            updateLocalBranchWhatsAppStatus(branchId, { loading: false, error: error.message, status: 'error' });
            if (pollingIntervalId) clearInterval(pollingIntervalId); // Para polling em caso de erro
            setPollingIntervalId(null);
            setIsQrModalVisible(false);
            return 'error';
        }
    }, [pollingIntervalId]); // Adiciona pollingIntervalId às dependências

    const handleConnectWhatsApp = async (branchId, branchName) => {
        updateLocalBranchWhatsAppStatus(branchId, { loading: true, qrCode: null, error: null });
        if (pollingIntervalId) clearInterval(pollingIntervalId); // Limpa polling anterior
        setPollingIntervalId(null);
        setIsQrModalVisible(false); // Fecha modal de QR se estiver aberto

        try {
            const response = await fetch(`${API_BASE_URL}/branches/${branchId}/whatsapp/connect`, { method: 'POST' });
            const resData = await response.json();

            if (!response.ok) {
                throw new Error(resData.message || `Falha ao iniciar conexão (${response.status})`);
            }
            message.info(resData.message || 'Solicitação de conexão enviada. Aguardando status...');
            // Após a solicitação, começa a buscar o status para pegar o QR ou a confirmação
            await fetchBranchWhatsAppStatus(branchId, branchName);
        } catch (error) {
            message.error(`Erro ao conectar WhatsApp para ${branchName}: ${error.message}`);
            updateLocalBranchWhatsAppStatus(branchId, { loading: false, error: error.message, status: 'error' });
        }
    };

    const handleDisconnectWhatsApp = async (branchId, branchName) => {
        updateLocalBranchWhatsAppStatus(branchId, { loading: true });
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setIsQrModalVisible(false);
        try {
            const response = await fetch(`${API_BASE_URL}/branches/${branchId}/whatsapp/disconnect`, { method: 'POST' });
            const resData = await response.json();
            if (!response.ok) {
                throw new Error(resData.message || `Falha ao desconectar (${response.status})`);
            }
            message.success(resData.message || `WhatsApp para ${branchName} desconectado.`);
            updateLocalBranchWhatsAppStatus(branchId, { status: 'disconnected', loading: false, qrCode: null, number: null, error: null });
        } catch (error) {
            message.error(`Erro ao desconectar WhatsApp para ${branchName}: ${error.message}`);
            updateLocalBranchWhatsAppStatus(branchId, { loading: false, error: error.message });
            // Mesmo em erro, tenta buscar o status atual do backend
            fetchBranchWhatsAppStatus(branchId, branchName);
        }
    };

    const handleClearWhatsAppSession = async (branchId, branchName) => {
        updateLocalBranchWhatsAppStatus(branchId, { loading: true });
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setIsQrModalVisible(false);
        try {
            const response = await fetch(`${API_BASE_URL}/branches/${branchId}/whatsapp/session/clear`, { method: 'DELETE' });
            const resData = await response.json();
            if (!response.ok) {
                throw new Error(resData.message || `Falha ao limpar sessão (${response.status})`);
            }
            message.success(resData.message || `Sessão WhatsApp para ${branchName} limpa.`);
            updateLocalBranchWhatsAppStatus(branchId, { status: 'disconnected', loading: false, qrCode: null, number: null, error: null, sessionId: null });
        } catch (error) {
            message.error(`Erro ao limpar sessão WhatsApp para ${branchName}: ${error.message}`);
            updateLocalBranchWhatsAppStatus(branchId, { loading: false, error: error.message });
            fetchBranchWhatsAppStatus(branchId, branchName);
        }
    };

    const handleQrModalCancel = () => {
        setIsQrModalVisible(false);
        setCurrentQrCode('');
        setQrModalBranchName('');
        if (pollingIntervalId) {
            clearInterval(pollingIntervalId);
            setPollingIntervalId(null);
        }
    };

    // Limpa o intervalo de polling quando o componente é desmontado
    useEffect(() => {
        return () => {
            if (pollingIntervalId) {
                clearInterval(pollingIntervalId);
            }
        };
    }, [pollingIntervalId]);
    // --- FIM WhatsApp Handlers ---


    // --- Table Columns ---
    const branchColumns = [ { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id }, { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) }, { title: 'Endereço', dataIndex: 'address', key: 'address', render: text => text || '-' }, { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() }, { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() }, { title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right', render: (_, r) => (<Space><Tooltip title="Editar"><Button type="link" icon={<EditOutlined />} onClick={() => showEditBranchModal(r)} /></Tooltip><Popconfirm title={`Excluir filial "${r.name}"?`} description="Ação irreversível." onConfirm={() => handleDeleteBranch(r.id)} okText="Sim" cancelText="Não" okButtonProps={{ danger: true }} icon={<Q color='red'/>}> <Tooltip title="Excluir"><Button type="link" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm></Space>), }, ];
    const adminColumns = [ { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id }, { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) }, { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a, b) => a.email.localeCompare(b.email) }, { title: 'Papel', dataIndex: 'role', key: 'role', width: 150, align: 'center', render: getAdminRoleTag, filters: [ { text: adminRoleMap.superadmin.text, value: 'superadmin' }, { text: adminRoleMap.branch_admin.text, value: 'branch_admin' }, ], onFilter: (value, record) => record.role === value, }, { title: 'Filiais Associadas', dataIndex: 'branches', key: 'branches', render: (associatedBranches, record) => { if (record.role === 'superadmin') { return <Text type="secondary">Todas</Text>; } if (!associatedBranches || associatedBranches.length === 0) { return <Text type="secondary">-</Text>; } const branchNames = associatedBranches.map(b => b.name).join(', '); return ( <Tooltip title={branchNames}> <span>{associatedBranches.length} {associatedBranches.length === 1 ? 'filial' : 'filiais'}</span> </Tooltip> ); }, }, { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() }, { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() }, { title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right', render: (_, r) => (<Space><Tooltip title="Editar"><Button type="link" icon={<EditOutlined />} onClick={() => showEditAdminModal(r)} /></Tooltip><Popconfirm title={`Excluir admin "${r.name}"?`} description="Ação irreversível." onConfirm={() => handleDeleteAdmin(r.id)} okText="Sim" cancelText="Não" okButtonProps={{ danger: true }} disabled={r.id===1} icon={<Q color='red'/>}> <Tooltip title={r.id===1?"Não pode excluir admin principal":"Excluir"}><span style={{cursor: r.id===1?'not-allowed':'pointer'}}><Button type="link" danger icon={<DeleteOutlined />} disabled={r.id===1} style={r.id===1?{pointerEvents:'none',color:'rgba(0,0,0,0.25)'}:{}}/></span></Tooltip></Popconfirm></Space>), }, ];
    const hikvisionColumns = [ { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id }, { title: 'Nome Disp.', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name), ellipsis: true, render: (text) => <Tooltip title={text}>{text}</Tooltip> }, { title: 'Filial', dataIndex: ['branch', 'name'], key: 'branchName', render: (branchName) => branchName || <Text type="secondary">N/D</Text>, sorter: (a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || ''), }, { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress' }, { title: 'Porta', dataIndex: 'port', key: 'port', width: 80, align: 'center' }, { title: 'Usuário', dataIndex: 'username', key: 'username', ellipsis: true, render: (text) => <Tooltip title={text}>{text}</Tooltip> }, { title: 'S/N', dataIndex: 'serialNumber', key: 'serialNumber', ellipsis: true, render: (text) => <Tooltip title={text}>{text}</Tooltip> }, { title: 'Status', dataIndex: 'status', key: 'status', width: 120, align: 'center', render: getHikvisionStatusTag, filters: Object.keys(hikvisionStatusMap).map(s => ({ text: hikvisionStatusMap[s].text, value: s })), onFilter: (value, record) => record.status === value, }, { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() }, { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() }, { title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right', render: (_, record) => ( <Space size="middle"> <Tooltip title="Editar Dispositivo"> <Button type="link" icon={<EditOutlined />} onClick={() => showEditHikvisionModal(record)} /> </Tooltip> <Popconfirm title={`Excluir dispositivo "${record.name}"?`} description="Ação irreversível." onConfirm={() => handleDeleteHikvision(record.id, record.name)} okText="Sim, Excluir" cancelText="Não" okButtonProps={{ danger: true }} icon={<QuestionCircleOutlined style={{ color: 'red' }}/>} > <Tooltip title="Excluir Dispositivo"> <Button type="link" danger icon={<DeleteOutlined />} /> </Tooltip> </Popconfirm> </Space> ), }, ];
    // --- Fim Columns ---

    // --- NOVO: Colunas para Tabela WhatsApp por Filial ---
    const whatsAppBranchColumns = [
        { title: 'ID Filial', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id },
        { title: 'Nome da Filial', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        {
            title: 'Status WhatsApp',
            key: 'whatsappStatus',
            width: 220,
            align: 'center',
            render: (_, branch) => {
                const statusInfo = branchWhatsAppStatuses[branch.id] || { status: 'unknown', loading: false };
                return statusInfo.loading ? <Spin size="small" /> : getWhatsAppStatusTag(statusInfo.status);
            }
        },
        {
            title: 'Número Conectado',
            key: 'whatsappNumber',
            render: (_, branch) => {
                const statusInfo = branchWhatsAppStatuses[branch.id] || {};
                return statusInfo.number || <Text type="secondary">-</Text>;
            }
        },
        {
            title: 'Último Erro',
            key: 'whatsappError',
            ellipsis: true,
            render: (_, branch) => {
                const statusInfo = branchWhatsAppStatuses[branch.id] || {};
                return statusInfo.error ? <Tooltip title={statusInfo.error}><Text type="danger">{statusInfo.error}</Text></Tooltip> : <Text type="secondary">-</Text>;
            }
        },
        {
            title: 'Ações WhatsApp',
            key: 'whatsappActions',
            width: 300,
            align: 'center',
            render: (_, branch) => {
                const statusInfo = branchWhatsAppStatuses[branch.id] || { status: 'unknown', loading: false };
                const isConnected = statusInfo.status === 'connected';
                const isQrPending = statusInfo.status === 'qr_pending';
                const isDisconnected = statusInfo.status === 'disconnected' || statusInfo.status === 'error' || statusInfo.status === 'auth_failure';

                return (
                    <Space>
                        <Tooltip title={isConnected ? "Desconectar WhatsApp" : "Conectar WhatsApp"}>
                            <Button
                                icon={isConnected ? <StopOutlined /> : <PlayCircleOutlined />}
                                onClick={() => isConnected ? handleDisconnectWhatsApp(branch.id, branch.name) : handleConnectWhatsApp(branch.id, branch.name)}
                                loading={statusInfo.loading && !isQrPending} // Não mostra loading no botão principal se estiver esperando QR
                                danger={isConnected}
                                type={isConnected ? "default" : "primary"}
                            >
                                {isConnected ? "Desconectar" : "Conectar"}
                            </Button>
                        </Tooltip>
                        <Tooltip title="Verificar Status / QR Code">
                            <Button
                                icon={<SyncOutlined />}
                                onClick={() => fetchBranchWhatsAppStatus(branch.id, branch.name)}
                                loading={statusInfo.loading && isQrPending} // Mostra loading aqui se estiver buscando QR
                            />
                        </Tooltip>
                        <Popconfirm
                            title={`Limpar sessão WhatsApp de "${branch.name}"?`}
                            description="Isso removerá a autenticação e exigirá um novo QR Code."
                            onConfirm={() => handleClearWhatsAppSession(branch.id, branch.name)}
                            okText="Sim, Limpar"
                            cancelText="Não"
                            okButtonProps={{ danger: true }}
                            icon={<QuestionCircleOutlined style={{ color: 'red' }}/>}
                        >
                            <Tooltip title="Limpar Sessão (Logout Total)">
                                <Button icon={<ClearOutlined />} danger loading={statusInfo.loading} />
                            </Tooltip>
                        </Popconfirm>
                    </Space>
                );
            }
        }
    ];
    // --- FIM Colunas WhatsApp ---


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
                            {settings.map(s => (<Descriptions.Item key={s.id||s.name} label={<Tooltip title={s.description||s.name}>{s.name}</Tooltip>} labelStyle={{width:'30%'}}><Row justify="space-between" align="middle"><Col style={{flex:1,marginRight:'8px',overflow:'hidden'}}><Text style={{wordBreak:'break-all'}}>{s.value}</Text>{s.updatedAt&&<><br/><Text type="secondary" style={{fontSize:'12px'}}>Atualizado: {dayjs(s.updatedAt).format('DD/MM/YY HH:mm')}</Text></>}</Col><Col><Space size="small"><Tooltip title="Editar"><Button type="link" icon={<EditOutlined/>} onClick={()=>showEditSettingModal(s)} size="small"/></Tooltip><Popconfirm title={`Excluir "${s.name}"?`} onConfirm={()=>handleDeleteSetting(s.name)} okText="Sim" cancelText="Não" okButtonProps={{danger:true}} icon={<Q color='red'/>}> <Tooltip title="Excluir"><Button type="link" danger icon={<DeleteOutlined/>} size="small"/></Tooltip></Popconfirm></Space></Col></Row></Descriptions.Item>))}
                        </Descriptions>
                        {settings.length===0&&!loading.settings&&<Paragraph style={{marginTop:16}}>Nenhuma configuração encontrada.</Paragraph>}
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

                 {/* Aba Hikvision */}
                <TabPane tab={<span><VideoCameraOutlined /> Gerenciar Hikvisions</span>} key="4">
                    <Row justify="end" style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={showAddHikvisionModal}>Adicionar Dispositivo</Button></Row>
                    <Spin spinning={loading.hikvisions}>
                        <Table dataSource={hikvisions} columns={hikvisionColumns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }}/>
                    </Spin>
                </TabPane>

                {/* --- NOVO: Aba WhatsApp por Filial --- */}
                <TabPane tab={<span><WhatsAppOutlined /> WhatsApp por Filial</span>} key="5">
                    <Spin spinning={loading.whatsapp}> {/* Loading geral da aba */}
                        <Table
                            dataSource={branches} // Usa a mesma lista de filiais
                            columns={whatsAppBranchColumns}
                            rowKey="id"
                            pagination={{ pageSize: 10 }}
                            scroll={{ x: 'max-content' }}
                        />
                    </Spin>
                </TabPane>
                {/* --- FIM Aba WhatsApp --- */}

            </Tabs>

            {/* --- Modais --- */}
            <Modal title="Adicionar Configuração" open={isAddSettingModalVisible} onOk={handleAddSettingOk} onCancel={handleAddSettingCancel} confirmLoading={loading.settings} okText="Criar" cancelText="Cancelar" destroyOnClose ><Form form={addSettingForm} layout="vertical" name="addSettingForm"><Form.Item name="name" label="Nome (Chave)" rules={[{ required: true, message: 'Insira nome!' }, { pattern: /^[a-z0-9_]+$/, message: 'Use a-z, 0-9, _.' }]} tooltip="Identificador único."><Input placeholder="exemplo_nome_config" /></Form.Item><Form.Item name="value" label="Valor" rules={[{ required: true, message: 'Insira valor!' }]} tooltip="Valor da config."><Input.TextArea rows={2} /></Form.Item><Form.Item name="description" label="Descrição (Opcional)" tooltip="Explicação."><Input.TextArea rows={3} /></Form.Item></Form></Modal>
            <Modal title={`Editar: ${editingSetting?.name}`} open={isSettingModalVisible} onOk={handleSettingOk} onCancel={handleSettingCancel} confirmLoading={loading.settings} okText="Salvar" cancelText="Cancelar" destroyOnClose><Form form={settingForm} layout="vertical" name="settingForm"><Paragraph type="secondary">{editingSetting?.description}</Paragraph><Form.Item name="value" label="Valor" rules={[{ required: true, message: 'Insira valor!' }]}>{editingSetting?.name.includes('horas')||editingSetting?.name.includes('dias')||editingSetting?.name.includes('port')?(<InputNumber min={0} style={{width:'100%'}}/>):editingSetting?.name.includes('valor')?(<InputNumber min={0} step="0.01" formatter={v=>`R$ ${v}`.replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')} parser={v=>v?.replace(/R\$\s?|\./g,'').replace(',','.')??''} style={{width:'100%'}}/>):(<Input.TextArea rows={2}/>)}</Form.Item></Form></Modal>
            <Modal title={editingBranch?`Editar: ${editingBranch.name}`:'Adicionar Filial'} open={isBranchModalVisible} onOk={handleBranchOk} onCancel={handleBranchCancel} confirmLoading={loading.branches} okText={editingBranch?'Salvar':'Criar'} cancelText="Cancelar" destroyOnClose>
                <Form form={branchForm} layout="vertical" name="branchForm">
                    <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Insira nome!' }]}><Input placeholder="Filial Centro" /></Form.Item>
                    <Form.Item name="address" label="Endereço (Opcional)"><Input.TextArea rows={3} placeholder="Rua..." /></Form.Item>
                    <Form.Item name="openaiAssistantIdOverride" label="ID do Assistente OpenAI (Opcional)" tooltip="Deixe em branco para usar o ID do assistente global padrão.">
                        <Input placeholder="asst_xxxxxxxxxxxxxxx" />
                    </Form.Item>
                </Form>
            </Modal>
            <Modal title={editingHikvision?`Editar Dispositivo: ${editingHikvision.name}`:'Adicionar Novo Dispositivo Hikvision'} open={isHikvisionModalVisible} onOk={handleHikvisionOk} onCancel={handleHikvisionCancel} confirmLoading={loading.hikvisions} okText={editingHikvision?'Salvar Alterações':'Criar Dispositivo'} cancelText="Cancelar" width={600} destroyOnClose maskClosable={false}><Form form={hikvisionForm} layout="vertical" name="hikvisionForm"><Row gutter={16}><Col span={12}><Form.Item name="name" label="Nome do Dispositivo" rules={[{ required: true, message: 'Insira o nome!' }]} tooltip="Nome para identificar o dispositivo (Ex: Entrada Principal, Câmera Corredor 1)"><Input placeholder="Entrada Principal" /></Form.Item></Col><Col span={12}><Form.Item name="branchId" label="Filial" rules={[{ required: true, message: 'Selecione a filial!' }]}><Select placeholder="Selecione a filial" loading={branches.length === 0 && loading.branches} allowClear>{branches.map(branch => (<Option key={branch.id} value={branch.id}>{branch.name}</Option>))}</Select></Form.Item></Col></Row><Row gutter={16}><Col span={12}><Form.Item name="ipAddress" label="Endereço IP" rules={[{ required: true, message: 'Insira o IP!' }, ]}><Input placeholder="192.168.1.100" /></Form.Item></Col><Col span={12}><Form.Item name="port" label="Porta" rules={[{ required: true, message: 'Insira a porta!' }]} initialValue={80}><InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="80" /></Form.Item></Col></Row><Row gutter={16}><Col span={12}><Form.Item name="username" label="Usuário Hikvision" rules={[{ required: true, message: 'Insira o usuário!' }]}><Input placeholder="admin" /></Form.Item></Col><Col span={12}><Form.Item name="serialNumber" label="Número de Série" rules={[{ required: true, message: 'Insira o número de série!' }]} tooltip="Número de série único do dispositivo."><Input placeholder="DS-ABC123XYZ" /></Form.Item></Col></Row><Row gutter={16}><Col span={12}><Form.Item name="password" label={editingHikvision?"Nova Senha (Opcional)":"Senha Hikvision"} rules={editingHikvision?[]:[{ required: true, message: 'Insira a senha!' }]} tooltip={editingHikvision?"Deixe em branco para não alterar a senha.":"Senha de acesso ao dispositivo."} hasFeedback={!editingHikvision}><Input.Password placeholder={editingHikvision?'Deixe em branco se não mudar':'Senha do dispositivo'} /></Form.Item></Col>{!editingHikvision && (<Col span={12}><Form.Item name="confirmPassword" label="Confirmar Senha" dependencies={['password']} hasFeedback rules={[{ required: true, message: 'Confirme a senha!' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error('As senhas não coincidem!')); }, }), ]}><Input.Password placeholder="Repita a senha" /></Form.Item></Col>)}</Row><Form.Item name="status" label="Status" rules={[{ required: true, message: 'Selecione o status!' }]} initialValue={'active'}><Select placeholder="Selecione o status operacional">{Object.keys(hikvisionStatusMap).map(statusKey => (<Option key={statusKey} value={statusKey}>{hikvisionStatusMap[statusKey].text}</Option>))}</Select></Form.Item></Form></Modal>
            <Modal title={editingAdmin ? `Editar Administrador: ${editingAdmin.name}` : 'Adicionar Novo Administrador'} open={isAdminModalVisible} onOk={handleAdminOk} onCancel={handleAdminCancel} confirmLoading={loading.admins || loadingAdminDetails} okText={editingAdmin ? 'Salvar Alterações' : 'Criar Administrador'} cancelText="Cancelar" destroyOnClose maskClosable={false} width={600} > <Spin spinning={loadingAdminDetails} tip="Carregando detalhes..."> <Form form={adminForm} layout="vertical" name="adminForm"> <Row gutter={16}> <Col span={12}> <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Por favor, insira o nome!' }]}> <Input placeholder="Nome completo do administrador"/> </Form.Item> </Col> <Col span={12}> <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Por favor, insira o email!' }, { type: 'email', message: 'Formato de email inválido!' }]}> <Input type="email" placeholder="email@exemplo.com"/> </Form.Item> </Col> </Row> {!editingAdmin && ( <Row gutter={16}> <Col span={12}> <Form.Item name="password" label="Senha" rules={[{ required: true, message: 'Por favor, insira a senha!' }, { min: 6, message: 'A senha deve ter no mínimo 6 caracteres.'}]} hasFeedback > <Input.Password placeholder="Mínimo 6 caracteres"/> </Form.Item> </Col> <Col span={12}> <Form.Item name="confirmPassword" label="Confirmar Senha" dependencies={['password']} hasFeedback rules={[ { required: true, message: 'Por favor, confirme sua senha!' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) { return Promise.resolve(); } return Promise.reject(new Error('As senhas não coincidem!')); }, }), ]} > <Input.Password placeholder="Repita a senha criada"/> </Form.Item> </Col> </Row> )} {editingAdmin && ( <Paragraph type="secondary" style={{ marginBottom: '16px' }}> A alteração de senha deve ser feita através de um processo dedicado (ex: recuperação de senha ou perfil do usuário). </Paragraph> )} <Form.Item name="role" label="Papel do Administrador" rules={[{ required: true, message: 'Por favor, selecione o papel!' }]}> <Select placeholder="Selecione o nível de acesso"> <Option value="superadmin">{adminRoleMap.superadmin.text}</Option> <Option value="branch_admin">{adminRoleMap.branch_admin.text}</Option> </Select> </Form.Item> <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role} > {({ getFieldValue }) => getFieldValue('role') === 'branch_admin' ? ( <Form.Item name="branchIds" label="Filiais Gerenciadas" tooltip="Selecione as filiais que este administrador poderá gerenciar." rules={[{ required: true, message: 'Selecione pelo menos uma filial para este papel!' }]} > <Select mode="multiple" allowClear style={{ width: '100%' }} placeholder="Selecione as filiais" loading={loading.branches} filterOption={(input, option) => (option?.label ?? '').toLowerCase().includes(input.toLowerCase()) } options={branches.map(branch => ({ label: branch.name, value: branch.id, }))} /> </Form.Item> ) : null } </Form.Item> </Form> </Spin> </Modal>

            {/* --- NOVO: Modal para QR Code --- */}
            <Modal
                title={`QR Code para Conectar WhatsApp - ${qrModalBranchName}`}
                open={isQrModalVisible}
                onCancel={handleQrModalCancel}
                footer={[
                    <Button key="refresh" icon={<SyncOutlined />} onClick={() => fetchBranchWhatsAppStatus(branches.find(b => b.name === qrModalBranchName)?.id, qrModalBranchName)} loading={(branchWhatsAppStatuses[branches.find(b => b.name === qrModalBranchName)?.id] || {}).loading}>
                        Atualizar QR/Status
                    </Button>,
                    <Button key="cancel" onClick={handleQrModalCancel}>
                        Fechar
                    </Button>,
                ]}
                width={350} // Ajustar largura para o QR code
            >
                {currentQrCode ? (
                    <div style={{ textAlign: 'center' }}>
                        <Paragraph>Escaneie este QR Code com o aplicativo WhatsApp no celular que será o bot desta filial.</Paragraph>
                        <AntImage
                            width={280}
                            src={`data:image/png;base64,${currentQrCode}`}
                            alt="QR Code WhatsApp"
                            preview={false}
                        />
                        <Paragraph style={{ marginTop: 10 }}>
                            Status atual: {getWhatsAppStatusTag((branchWhatsAppStatuses[branches.find(b => b.name === qrModalBranchName)?.id] || {}).status)}
                        </Paragraph>
                        {(branchWhatsAppStatuses[branches.find(b => b.name === qrModalBranchName)?.id] || {}).loading && <Spin tip="Verificando status..." style={{ marginTop: 10 }}/>}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                        <Spin tip="Gerando QR Code ou verificando status..." size="large" />
                    </div>
                )}
            </Modal>
            {/* --- FIM Modal QR Code --- */}

        </ConfigProvider>
    );
};

// Helper para popconfirm (evitar repetição)
const Q = ({color}) => <QuestionCircleOutlined style={{ color: color || 'red' }}/>;

export default AdministrationPage;