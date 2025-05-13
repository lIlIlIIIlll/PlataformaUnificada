// app/administracao/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Tabs, Typography, Button, Modal, Form, Input, message, Spin, Space,
    Tooltip, Popconfirm, Table, Descriptions, ConfigProvider, Row, Col, InputNumber,
    Select, Tag, List // Importar List para exibir filiais no modal
} from 'antd';
import {
    EditOutlined, DeleteOutlined, PlusOutlined, SaveOutlined, SettingOutlined,
    ShopOutlined, UsergroupAddOutlined, QuestionCircleOutlined, VideoCameraOutlined,
    LoadingOutlined // Ícone para loading específico
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


const AdministrationPage = () => {
    // --- State ---
    const [settings, setSettings] = useState([]);
    const [branches, setBranches] = useState([]); // Lista de todas as filiais disponíveis
    const [administrators, setAdministrators] = useState([]);
    const [hikvisions, setHikvisions] = useState([]);
    const [loading, setLoading] = useState({ settings: false, branches: false, admins: false, hikvisions: false });
    const [loadingAdminDetails, setLoadingAdminDetails] = useState(false); // Loading específico para detalhes do admin no modal

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
    const [editingAdmin, setEditingAdmin] = useState(null); // Guardará o admin e suas filiais originais ao editar
    const [adminForm] = Form.useForm();

    const [isHikvisionModalVisible, setIsHikvisionModalVisible] = useState(false);
    const [editingHikvision, setEditingHikvision] = useState(null);
    const [hikvisionForm] = Form.useForm();

    // --- Fetch Data (API) ---
    const fetchSettings = useCallback(async () => { /* ...código sem alteração... */
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
    const fetchBranches = useCallback(async () => { /* ...código sem alteração... */
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
    const fetchAdmins = useCallback(async () => { /* ...código sem alteração... */
        setLoading(prev => ({ ...prev, admins: true }));
        try {
            // Inclui filiais para exibir na tabela
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
    const fetchHikvisions = useCallback(async () => { /* ...código sem alteração... */
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
    // --- Fim do Fetch Data ---

    useEffect(() => {
        fetchSettings();
        fetchBranches();
        fetchAdmins();
        fetchHikvisions();
    }, [fetchSettings, fetchBranches, fetchAdmins, fetchHikvisions]);

    // --- Settings Modal Handlers (API) --- (sem alteração)
    const showEditSettingModal = (setting) => { /* ...código sem alteração... */ setEditingSetting(setting); let formValue=setting.value; if(setting.name.includes('horas')||setting.name.includes('dias')||setting.name.includes('valor')||setting.name.includes('port')){const parsed=parseFloat(setting.value); formValue=isNaN(parsed)?setting.value:parsed;} settingForm.setFieldsValue({value:formValue}); setIsSettingModalVisible(true); };
    const handleSettingCancel = () => { /* ...código sem alteração... */ setIsSettingModalVisible(false); setEditingSetting(null); settingForm.resetFields(); };
    const handleSettingOk = async () => { /* ...código sem alteração... */ try{const values=await settingForm.validateFields(); setLoading(prev=>({...prev,settings:true})); const url=`${API_BASE_URL}/settings/${editingSetting.name}`; const response=await fetch(url,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:String(values.value),description:editingSetting.description})}); if(!response.ok){const errorData=await response.json().catch(()=>({})); throw new Error(errorData.message||`Falha ao atualizar config.`);} message.success(`Configuração "${editingSetting.name}" atualizada.`); handleSettingCancel(); fetchSettings();}catch(errorInfo){console.error('Falha API config:',errorInfo); if(errorInfo?.errorFields)console.log('Erro form:',errorInfo.errorFields); else message.error(`Erro salvar config: ${errorInfo.message}`);} finally{setLoading(prev=>({...prev,settings:false}));} };
    const showAddSettingModal = () => { /* ...código sem alteração... */ addSettingForm.resetFields(); setIsAddSettingModalVisible(true); };
    const handleAddSettingCancel = () => { /* ...código sem alteração... */ setIsAddSettingModalVisible(false); addSettingForm.resetFields(); };
    const handleAddSettingOk = async () => { /* ...código sem alteração... */ try{const values=await addSettingForm.validateFields(); setLoading(prev=>({...prev,settings:true})); const url=`${API_BASE_URL}/settings`; const body={name:values.name,value:String(values.value),description:values.description||''}; const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===409)throw new Error(errorData.message||'Nome já existe.'); if(response.status===400)throw new Error(errorData.message||'Dados inválidos.'); throw new Error(errorData.message||`Falha criar config.`);} message.success(`Configuração "${values.name}" criada.`); handleAddSettingCancel(); fetchSettings();}catch(errorInfo){console.error('Falha criar config:',errorInfo); if(errorInfo?.errorFields)console.log('Erro form:',errorInfo.errorFields); else message.error(`Erro criar config: ${errorInfo.message}`);} finally{setLoading(prev=>({...prev,settings:false}));} };
    const handleDeleteSetting = async (name) => { /* ...código sem alteração... */ setLoading(prev=>({...prev,settings:true})); try{const response=await fetch(`${API_BASE_URL}/settings/${name}`,{method:'DELETE'}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===404)throw new Error('Config não encontrada.'); throw new Error(errorData.message||`Falha excluir config.`);} message.success(`Configuração "${name}" excluída.`); fetchSettings();}catch(error){message.error(`Erro excluir config: ${error.message}`);} finally{setLoading(prev=>({...prev,settings:false}));} };
    // --- Fim Settings ---

    // --- Branch Modal Handlers (API) --- (sem alteração)
    const showAddBranchModal = () => { /* ...código sem alteração... */ setEditingBranch(null); branchForm.resetFields(); setIsBranchModalVisible(true); };
    const showEditBranchModal = (branch) => { /* ...código sem alteração... */ setEditingBranch(branch); branchForm.setFieldsValue({ name: branch.name, address: branch.address }); setIsBranchModalVisible(true); };
    const handleBranchCancel = () => { /* ...código sem alteração... */ setIsBranchModalVisible(false); setEditingBranch(null); branchForm.resetFields(); };
    const handleBranchOk = async () => { /* ...código sem alteração... */ try{const values=await branchForm.validateFields(); setLoading(prev=>({...prev,branches:true})); const url=editingBranch?`${API_BASE_URL}/branches/${editingBranch.id}`:`${API_BASE_URL}/branches`; const method=editingBranch?'PUT':'POST'; const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(values)}); if(!response.ok){const errorData=await response.json().catch(()=>({})); throw new Error(errorData.message||`Falha ${editingBranch?'atualizar':'criar'} filial.`);} const result=await response.json(); message.success(`Filial "${result.name}" ${editingBranch?'atualizada':'criada'}.`); handleBranchCancel(); fetchBranches();}catch(errorInfo){console.error('Falha API filial:',errorInfo); if(errorInfo?.errorFields)console.log('Erro form:',errorInfo.errorFields); else message.error(`Erro salvar filial: ${errorInfo.message}`);} finally{setLoading(prev=>({...prev,branches:false}));} };
    const handleDeleteBranch = async (id) => { /* ...código sem alteração... */ setLoading(prev=>({...prev,branches:true})); try{const response=await fetch(`${API_BASE_URL}/branches/${id}`,{method:'DELETE'}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===409)throw new Error(errorData.message||'Filial possui dependências.'); if(response.status===404)throw new Error('Filial não encontrada.'); throw new Error(errorData.message||`Falha excluir filial.`);} message.success(`Filial ID ${id} excluída.`); fetchBranches();}catch(error){message.error(`Erro excluir filial: ${error.message}`);} finally{setLoading(prev=>({...prev,branches:false}));} };
    // --- Fim Branch ---

    // --- Admin Modal Handlers (API) - *** MODIFICADOS *** ---
    const showAddAdminModal = () => {
        setEditingAdmin(null); // Limpa o admin em edição
        adminForm.resetFields(); // Limpa campos do formulário
        adminForm.setFieldsValue({ role: 'branch_admin', branchIds: [] }); // Define papel padrão e zera filiais selecionadas
        setIsAdminModalVisible(true); // Abre o modal
    };

    const showEditAdminModal = async (adminRecord) => {
        console.log("Abrindo modal para editar:", adminRecord);
        setIsAdminModalVisible(true); // Abre o modal imediatamente com loading
        setLoadingAdminDetails(true); // Ativa loading *dentro* do modal
        setEditingAdmin(null);      // Limpa dados anteriores enquanto carrega
        adminForm.resetFields();    // Reseta o form

        try {
            // Busca os dados completos do admin, incluindo as filiais associadas
            const response = await fetch(`${API_BASE_URL}/administrators/${adminRecord.id}?include=branches`);
            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao buscar detalhes do administrador (${response.status})`);
            }
            const adminWithDetails = await response.json();

            // Guarda o admin completo (com filiais) no estado para referência posterior
            setEditingAdmin(adminWithDetails);

            // Preenche o formulário com os dados buscados
            adminForm.setFieldsValue({
                name: adminWithDetails.name,
                email: adminWithDetails.email,
                role: adminWithDetails.role,
                // Extrai os IDs das filiais associadas para o Select múltiplo
                branchIds: adminWithDetails.branches ? adminWithDetails.branches.map(branch => branch.id) : [],
                // Senha não é preenchida na edição
            });
             console.log("Form preenchido com:", adminForm.getFieldsValue());


        } catch (error) {
            console.error("Erro ao buscar detalhes do admin para edição:", error);
            message.error(`Não foi possível carregar os detalhes do administrador: ${error.message}`);
            setIsAdminModalVisible(false); // Fecha o modal se não conseguir carregar
        } finally {
            setLoadingAdminDetails(false); // Desativa loading do modal
        }
    };

    const handleAdminCancel = () => {
        setIsAdminModalVisible(false);
        setEditingAdmin(null);
        adminForm.resetFields();
    };

    // Função auxiliar para gerenciar associações de filiais
    const manageBranchAssociations = async (adminId, targetBranchIds = [], originalBranchIds = []) => {
        const branchesToAdd = targetBranchIds.filter(id => !originalBranchIds.includes(id));
        const branchesToRemove = originalBranchIds.filter(id => !targetBranchIds.includes(id));

        const addPromises = branchesToAdd.map(branchId =>
            fetch(`${API_BASE_URL}/branches/${branchId}/administrators/${adminId}`, { method: 'POST' })
                .then(res => { if (!res.ok) throw new Error(`Falha ao associar à filial ${branchId}`); })
        );

        const removePromises = branchesToRemove.map(branchId =>
            fetch(`${API_BASE_URL}/branches/${branchId}/administrators/${adminId}`, { method: 'DELETE' })
                 .then(res => { if (!res.ok && res.status !== 404) throw new Error(`Falha ao desassociar da filial ${branchId}`); }) // Ignora 404 (já removido?)
        );

        await Promise.all([...addPromises, ...removePromises]);
    };


    const handleAdminOk = async () => {
        try {
            const values = await adminForm.validateFields();
            setLoading(prev => ({ ...prev, admins: true })); // Loading geral da aba

            const isAdminCreation = !editingAdmin;
            const url = isAdminCreation ? `${API_BASE_URL}/administrators` : `${API_BASE_URL}/administrators/${editingAdmin.id}`;
            const method = isAdminCreation ? 'POST' : 'PUT';

            // Prepara corpo da requisição principal (sem branchIds)
            let body = {
                name: values.name,
                email: values.email,
                role: values.role,
            };

            // Adiciona senha apenas na criação
            if (isAdminCreation) {
                body.password = values.password; // Senha já validada pelo form
            }
            // Nota: Edição de senha não está implementada neste modal

            // 1. Criar ou Atualizar o Administrador
            const response = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                if (response.status === 409) throw new Error(errorData.message || 'Email já cadastrado.');
                if (response.status === 400) throw new Error(errorData.message || 'Dados inválidos.');
                throw new Error(errorData.message || `Falha ao ${isAdminCreation ? 'criar' : 'atualizar'} admin.`);
            }

            const savedAdmin = await response.json();
            const adminId = savedAdmin.id;
            const successMessage = `Admin "${savedAdmin.name}" ${isAdminCreation ? 'criado' : 'atualizado'}.`;

            // 2. Gerenciar Associações de Filial (Apenas se for branch_admin)
            if (values.role === 'branch_admin') {
                const targetBranchIds = values.branchIds || [];
                const originalBranchIds = editingAdmin?.branches?.map(b => b.id) || []; // Filiais originais (vazio na criação)

                 try {
                    await manageBranchAssociations(adminId, targetBranchIds, originalBranchIds);
                    message.success(successMessage + ' Associações de filial atualizadas.');
                 } catch (assocError) {
                     console.error("Erro ao gerenciar associações:", assocError);
                     // Informa sucesso parcial e erro nas associações
                     message.warning(`${successMessage} Ocorreu um erro ao atualizar as associações de filial: ${assocError.message}`);
                 }

            } else if (values.role === 'superadmin' && !isAdminCreation) {
                 // Se mudou para superadmin na edição, remove associações existentes
                  const originalBranchIds = editingAdmin?.branches?.map(b => b.id) || [];
                   if (originalBranchIds.length > 0) {
                       try {
                           await manageBranchAssociations(adminId, [], originalBranchIds); // Passa array vazio como alvo
                           message.success(successMessage + ' Associações de filial removidas devido à mudança para Super Admin.');
                       } catch (assocError) {
                            console.error("Erro ao remover associações na mudança para superadmin:", assocError);
                            message.warning(`${successMessage} Ocorreu um erro ao remover associações de filial: ${assocError.message}`);
                       }
                   } else {
                        message.success(successMessage);
                   }
            }
             else {
                // Caso de criação de superadmin ou edição sem mudar associações relevantes
                 message.success(successMessage);
            }


            handleAdminCancel(); // Fecha o modal
            fetchAdmins(); // Rebusca a lista principal

        } catch (errorInfo) {
            console.error('Falha na validação ou API admin:', errorInfo);
            if (errorInfo?.errorFields) { console.log('Erro de validação do formulário:', errorInfo.errorFields); }
            else { message.error(`Erro ao salvar administrador: ${errorInfo.message}`); }
        } finally {
            setLoading(prev => ({ ...prev, admins: false }));
        }
    };
    // --- Fim Admin ---

    // --- Hikvision Modal Handlers (API) --- (sem alteração)
    const showAddHikvisionModal = () => { /* ...código sem alteração... */ setEditingHikvision(null); hikvisionForm.resetFields(); hikvisionForm.setFieldsValue({ status: 'active', port: 80 }); setIsHikvisionModalVisible(true); };
    const showEditHikvisionModal = (hikvision) => { /* ...código sem alteração... */ setEditingHikvision(hikvision); hikvisionForm.setFieldsValue({ branchId: hikvision.branchId, name: hikvision.name, ipAddress: hikvision.ipAddress, port: hikvision.port, username: hikvision.username, serialNumber: hikvision.serialNumber, status: hikvision.status, }); setIsHikvisionModalVisible(true); };
    const handleHikvisionCancel = () => { /* ...código sem alteração... */ setIsHikvisionModalVisible(false); setEditingHikvision(null); hikvisionForm.resetFields(); };
    const handleHikvisionOk = async () => { /* ...código sem alteração... */ try{const values=await hikvisionForm.validateFields(); setLoading(prev=>({...prev,hikvisions:true})); const url=editingHikvision?`${API_BASE_URL}/hikvisions/${editingHikvision.id}`:`${API_BASE_URL}/hikvisions`; const method=editingHikvision?'PUT':'POST'; let body={...values}; if(editingHikvision){if(!values.password||values.password.trim()===''){delete body.password;} delete body.confirmPassword;}else{delete body.confirmPassword;} const response=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===409)throw new Error(errorData.message||'Número de série já cadastrado.'); if(response.status===400)throw new Error(errorData.message||'Dados inválidos (verifique filial, IP, porta, status).'); throw new Error(errorData.message||`Falha ao ${editingHikvision?'atualizar':'criar'} dispositivo Hikvision.`);} const result=await response.json(); message.success(`Dispositivo Hikvision "${result.name}" ${editingHikvision?'atualizado':'criado'}.`); handleHikvisionCancel(); fetchHikvisions();}catch(errorInfo){console.error('Falha API Hikvision:',errorInfo); if(errorInfo?.errorFields){console.log('Erro form:',errorInfo.errorFields);} else{message.error(`Erro ao salvar dispositivo Hikvision: ${errorInfo.message}`);}} finally{setLoading(prev=>({...prev,hikvisions:false}));} };
    const handleDeleteHikvision = async (id, name) => { /* ...código sem alteração... */ setLoading(prev=>({...prev,hikvisions:true})); try{const response=await fetch(`${API_BASE_URL}/hikvisions/${id}`,{method:'DELETE'}); if(!response.ok){const errorData=await response.json().catch(()=>({})); if(response.status===404)throw new Error('Dispositivo Hikvision não encontrado.'); if(response.status===409)throw new Error(errorData.message||'Não é possível excluir (pode ter dependências).'); throw new Error(errorData.message||`Falha ao excluir dispositivo Hikvision.`);} message.success(`Dispositivo Hikvision "${name}" (ID: ${id}) excluído.`); fetchHikvisions();}catch(error){message.error(`Erro ao excluir dispositivo Hikvision: ${error.message}`);} finally{setLoading(prev=>({...prev,hikvisions:false}));} };
    // --- Fim Hikvision ---

    // --- Table Columns ---
    const branchColumns = [ /* ...definição mantida... */ { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id }, { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) }, { title: 'Endereço', dataIndex: 'address', key: 'address', render: text => text || '-' }, { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() }, { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() }, { title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right', render: (_, r) => (<Space><Tooltip title="Editar"><Button type="link" icon={<EditOutlined />} onClick={() => showEditBranchModal(r)} /></Tooltip><Popconfirm title={`Excluir filial "${r.name}"?`} description="Ação irreversível." onConfirm={() => handleDeleteBranch(r.id)} okText="Sim" cancelText="Não" okButtonProps={{ danger: true }} icon={<Q color='red'/>}> <Tooltip title="Excluir"><Button type="link" danger icon={<DeleteOutlined />} /></Tooltip></Popconfirm></Space>), }, ];
    const adminColumns = [ // *** COLUNAS MODIFICADAS ***
        { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id },
        { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
        { title: 'Email', dataIndex: 'email', key: 'email', sorter: (a, b) => a.email.localeCompare(b.email) },
        { // Nova Coluna Papel
            title: 'Papel', dataIndex: 'role', key: 'role', width: 150, align: 'center',
            render: getAdminRoleTag, // Usa a função auxiliar para renderizar o Tag
            filters: [
                { text: adminRoleMap.superadmin.text, value: 'superadmin' },
                { text: adminRoleMap.branch_admin.text, value: 'branch_admin' },
            ],
            onFilter: (value, record) => record.role === value,
        },
        { // Nova Coluna Filiais Associadas
            title: 'Filiais Associadas', dataIndex: 'branches', key: 'branches',
            render: (associatedBranches, record) => {
                if (record.role === 'superadmin') {
                    return <Text type="secondary">Todas</Text>;
                }
                if (!associatedBranches || associatedBranches.length === 0) {
                    return <Text type="secondary">-</Text>;
                }
                const branchNames = associatedBranches.map(b => b.name).join(', ');
                return (
                    <Tooltip title={branchNames}>
                        <span>{associatedBranches.length} {associatedBranches.length === 1 ? 'filial' : 'filiais'}</span>
                    </Tooltip>
                );
            },
            // Não é prático filtrar/ordenar diretamente por aqui no frontend
        },
        { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() },
        { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() },
        { title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right', render: (_, r) => (<Space><Tooltip title="Editar"><Button type="link" icon={<EditOutlined />} onClick={() => showEditAdminModal(r)} /></Tooltip><Popconfirm title={`Excluir admin "${r.name}"?`} description="Ação irreversível." onConfirm={() => handleDeleteAdmin(r.id)} okText="Sim" cancelText="Não" okButtonProps={{ danger: true }} disabled={r.id===1} icon={<Q color='red'/>}> <Tooltip title={r.id===1?"Não pode excluir admin principal":"Excluir"}><span style={{cursor: r.id===1?'not-allowed':'pointer'}}><Button type="link" danger icon={<DeleteOutlined />} disabled={r.id===1} style={r.id===1?{pointerEvents:'none',color:'rgba(0,0,0,0.25)'}:{}}/></span></Tooltip></Popconfirm></Space>), },
    ];
    const hikvisionColumns = [ /* ...definição mantida... */ { title: 'ID', dataIndex: 'id', key: 'id', width: 80, sorter: (a,b) => a.id - b.id }, { title: 'Nome Disp.', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name), ellipsis: true, render: (text) => <Tooltip title={text}>{text}</Tooltip> }, { title: 'Filial', dataIndex: ['branch', 'name'], key: 'branchName', render: (branchName) => branchName || <Text type="secondary">N/D</Text>, sorter: (a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || ''), }, { title: 'IP', dataIndex: 'ipAddress', key: 'ipAddress' }, { title: 'Porta', dataIndex: 'port', key: 'port', width: 80, align: 'center' }, { title: 'Usuário', dataIndex: 'username', key: 'username', ellipsis: true, render: (text) => <Tooltip title={text}>{text}</Tooltip> }, { title: 'S/N', dataIndex: 'serialNumber', key: 'serialNumber', ellipsis: true, render: (text) => <Tooltip title={text}>{text}</Tooltip> }, { title: 'Status', dataIndex: 'status', key: 'status', width: 120, align: 'center', render: getHikvisionStatusTag, filters: Object.keys(hikvisionStatusMap).map(s => ({ text: hikvisionStatusMap[s].text, value: s })), onFilter: (value, record) => record.status === value, }, { title: 'Criado', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.createdAt).unix()-dayjs(b.createdAt).unix() }, { title: 'Atualizado', dataIndex: 'updatedAt', key: 'updatedAt', width: 160, align: 'center', render: (t) => dayjs(t).format('DD/MM/YY HH:mm'), sorter: (a,b) => dayjs(a.updatedAt).unix()-dayjs(b.updatedAt).unix() }, { title: 'Ações', key: 'action', width: 100, align: 'center', fixed: 'right', render: (_, record) => ( <Space size="middle"> <Tooltip title="Editar Dispositivo"> <Button type="link" icon={<EditOutlined />} onClick={() => showEditHikvisionModal(record)} /> </Tooltip> <Popconfirm title={`Excluir dispositivo "${record.name}"?`} description="Ação irreversível." onConfirm={() => handleDeleteHikvision(record.id, record.name)} okText="Sim, Excluir" cancelText="Não" okButtonProps={{ danger: true }} icon={<QuestionCircleOutlined style={{ color: 'red' }}/>} > <Tooltip title="Excluir Dispositivo"> <Button type="link" danger icon={<DeleteOutlined />} /> </Tooltip> </Popconfirm> </Space> ), }, ];
    // --- Fim Columns ---

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

                {/* Aba Administradores *** MODIFICADA *** */}
                <TabPane tab={<span><UsergroupAddOutlined /> Gerenciar Administradores</span>} key="3">
                     <Row justify="end" style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={showAddAdminModal}>Adicionar Administrador</Button></Row>
                     <Spin spinning={loading.admins}>
                        {/* Passando as colunas atualizadas */}
                        <Table dataSource={administrators} columns={adminColumns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }} />
                    </Spin>
                </TabPane>

                 {/* Aba Hikvision *** MODIFICADA *** */}
                <TabPane tab={<span><VideoCameraOutlined /> Gerenciar Hikvisions</span>} key="4">
                    <Row justify="end" style={{ marginBottom: 16 }}><Button type="primary" icon={<PlusOutlined />} onClick={showAddHikvisionModal}>Adicionar Dispositivo</Button></Row>
                    <Spin spinning={loading.hikvisions}>
                        {/* Passando as colunas atualizadas */}
                        <Table dataSource={hikvisions} columns={hikvisionColumns} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: 'max-content' }}/>
                    </Spin>
                </TabPane>

            </Tabs>

            {/* --- Modais --- */}
            {/* Modais: Settings, Branch, Hikvision (mantidos) */}
            <Modal title="Adicionar Configuração" open={isAddSettingModalVisible} onOk={handleAddSettingOk} onCancel={handleAddSettingCancel} confirmLoading={loading.settings} okText="Criar" cancelText="Cancelar" destroyOnClose ><Form form={addSettingForm} layout="vertical" name="addSettingForm"><Form.Item name="name" label="Nome (Chave)" rules={[{ required: true, message: 'Insira nome!' }, { pattern: /^[a-z0-9_]+$/, message: 'Use a-z, 0-9, _.' }]} tooltip="Identificador único."><Input placeholder="exemplo_nome_config" /></Form.Item><Form.Item name="value" label="Valor" rules={[{ required: true, message: 'Insira valor!' }]} tooltip="Valor da config."><Input.TextArea rows={2} /></Form.Item><Form.Item name="description" label="Descrição (Opcional)" tooltip="Explicação."><Input.TextArea rows={3} /></Form.Item></Form></Modal>
            <Modal title={`Editar: ${editingSetting?.name}`} open={isSettingModalVisible} onOk={handleSettingOk} onCancel={handleSettingCancel} confirmLoading={loading.settings} okText="Salvar" cancelText="Cancelar" destroyOnClose><Form form={settingForm} layout="vertical" name="settingForm"><Paragraph type="secondary">{editingSetting?.description}</Paragraph><Form.Item name="value" label="Valor" rules={[{ required: true, message: 'Insira valor!' }]}>{editingSetting?.name.includes('horas')||editingSetting?.name.includes('dias')||editingSetting?.name.includes('port')?(<InputNumber min={0} style={{width:'100%'}}/>):editingSetting?.name.includes('valor')?(<InputNumber min={0} step="0.01" formatter={v=>`R$ ${v}`.replace('.',',').replace(/\B(?=(\d{3})+(?!\d))/g,'.')} parser={v=>v?.replace(/R\$\s?|\./g,'').replace(',','.')??''} style={{width:'100%'}}/>):(<Input.TextArea rows={2}/>)}</Form.Item></Form></Modal>
            <Modal title={editingBranch?`Editar: ${editingBranch.name}`:'Adicionar Filial'} open={isBranchModalVisible} onOk={handleBranchOk} onCancel={handleBranchCancel} confirmLoading={loading.branches} okText={editingBranch?'Salvar':'Criar'} cancelText="Cancelar" destroyOnClose><Form form={branchForm} layout="vertical" name="branchForm"><Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Insira nome!' }]}><Input placeholder="Filial Centro" /></Form.Item><Form.Item name="address" label="Endereço (Opcional)"><Input.TextArea rows={3} placeholder="Rua..." /></Form.Item></Form></Modal>
            <Modal title={editingHikvision?`Editar Dispositivo: ${editingHikvision.name}`:'Adicionar Novo Dispositivo Hikvision'} open={isHikvisionModalVisible} onOk={handleHikvisionOk} onCancel={handleHikvisionCancel} confirmLoading={loading.hikvisions} okText={editingHikvision?'Salvar Alterações':'Criar Dispositivo'} cancelText="Cancelar" width={600} destroyOnClose maskClosable={false}><Form form={hikvisionForm} layout="vertical" name="hikvisionForm"><Row gutter={16}><Col span={12}><Form.Item name="name" label="Nome do Dispositivo" rules={[{ required: true, message: 'Insira o nome!' }]} tooltip="Nome para identificar o dispositivo (Ex: Entrada Principal, Câmera Corredor 1)"><Input placeholder="Entrada Principal" /></Form.Item></Col><Col span={12}><Form.Item name="branchId" label="Filial" rules={[{ required: true, message: 'Selecione a filial!' }]}><Select placeholder="Selecione a filial" loading={branches.length === 0 && loading.branches} allowClear>{branches.map(branch => (<Option key={branch.id} value={branch.id}>{branch.name}</Option>))}</Select></Form.Item></Col></Row><Row gutter={16}><Col span={12}><Form.Item name="ipAddress" label="Endereço IP" rules={[{ required: true, message: 'Insira o IP!' }, ]}><Input placeholder="192.168.1.100" /></Form.Item></Col><Col span={12}><Form.Item name="port" label="Porta" rules={[{ required: true, message: 'Insira a porta!' }]} initialValue={80}><InputNumber min={1} max={65535} style={{ width: '100%' }} placeholder="80" /></Form.Item></Col></Row><Row gutter={16}><Col span={12}><Form.Item name="username" label="Usuário Hikvision" rules={[{ required: true, message: 'Insira o usuário!' }]}><Input placeholder="admin" /></Form.Item></Col><Col span={12}><Form.Item name="serialNumber" label="Número de Série" rules={[{ required: true, message: 'Insira o número de série!' }]} tooltip="Número de série único do dispositivo."><Input placeholder="DS-ABC123XYZ" /></Form.Item></Col></Row><Row gutter={16}><Col span={12}><Form.Item name="password" label={editingHikvision?"Nova Senha (Opcional)":"Senha Hikvision"} rules={editingHikvision?[]:[{ required: true, message: 'Insira a senha!' }]} tooltip={editingHikvision?"Deixe em branco para não alterar a senha.":"Senha de acesso ao dispositivo."} hasFeedback={!editingHikvision}><Input.Password placeholder={editingHikvision?'Deixe em branco se não mudar':'Senha do dispositivo'} /></Form.Item></Col>{!editingHikvision && (<Col span={12}><Form.Item name="confirmPassword" label="Confirmar Senha" dependencies={['password']} hasFeedback rules={[{ required: true, message: 'Confirme a senha!' }, ({ getFieldValue }) => ({ validator(_, value) { if (!value || getFieldValue('password') === value) return Promise.resolve(); return Promise.reject(new Error('As senhas não coincidem!')); }, }), ]}><Input.Password placeholder="Repita a senha" /></Form.Item></Col>)}</Row><Form.Item name="status" label="Status" rules={[{ required: true, message: 'Selecione o status!' }]} initialValue={'active'}><Select placeholder="Selecione o status operacional">{Object.keys(hikvisionStatusMap).map(statusKey => (<Option key={statusKey} value={statusKey}>{hikvisionStatusMap[statusKey].text}</Option>))}</Select></Form.Item></Form></Modal>

             {/* Modal Adicionar/Editar Admin *** MODIFICADO *** */}
            <Modal
                title={editingAdmin ? `Editar Administrador: ${editingAdmin.name}` : 'Adicionar Novo Administrador'}
                open={isAdminModalVisible}
                onOk={handleAdminOk}
                onCancel={handleAdminCancel}
                 // Usando loading geral da aba ou loading específico se preferir
                confirmLoading={loading.admins || loadingAdminDetails}
                okText={editingAdmin ? 'Salvar Alterações' : 'Criar Administrador'}
                cancelText="Cancelar"
                destroyOnClose // Recria o form a cada abertura
                maskClosable={false}
                width={600} // Aumentar um pouco a largura
            >
                <Spin spinning={loadingAdminDetails} tip="Carregando detalhes...">
                    <Form form={adminForm} layout="vertical" name="adminForm">
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Por favor, insira o nome!' }]}>
                                    <Input placeholder="Nome completo do administrador"/>
                                </Form.Item>
                            </Col>
                             <Col span={12}>
                                <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Por favor, insira o email!' }, { type: 'email', message: 'Formato de email inválido!' }]}>
                                    <Input type="email" placeholder="email@exemplo.com"/>
                                </Form.Item>
                            </Col>
                        </Row>

                        {/* Campos de Senha (apenas na criação) */}
                        {!editingAdmin && (
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item
                                        name="password"
                                        label="Senha"
                                        rules={[{ required: true, message: 'Por favor, insira a senha!' }, { min: 6, message: 'A senha deve ter no mínimo 6 caracteres.'}]}
                                        hasFeedback // Mostra ícone de validação
                                    >
                                        <Input.Password placeholder="Mínimo 6 caracteres"/>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                     <Form.Item
                                        name="confirmPassword"
                                        label="Confirmar Senha"
                                        dependencies={['password']} // Depende do campo 'password'
                                        hasFeedback
                                        rules={[
                                            { required: true, message: 'Por favor, confirme sua senha!' },
                                            // Validador customizado para verificar se as senhas coincidem
                                            ({ getFieldValue }) => ({
                                                validator(_, value) {
                                                    if (!value || getFieldValue('password') === value) {
                                                        return Promise.resolve(); // Sucesso
                                                    }
                                                    return Promise.reject(new Error('As senhas não coincidem!')); // Erro
                                                },
                                            }),
                                        ]}
                                    >
                                        <Input.Password placeholder="Repita a senha criada"/>
                                    </Form.Item>
                                </Col>
                            </Row>
                        )}
                        {/* Mensagem na edição indicando como alterar senha */}
                        {editingAdmin && (
                             <Paragraph type="secondary" style={{ marginBottom: '16px' }}>
                                A alteração de senha deve ser feita através de um processo dedicado (ex: recuperação de senha ou perfil do usuário).
                             </Paragraph>
                        )}

                        {/* Seleção de Papel */}
                        <Form.Item name="role" label="Papel do Administrador" rules={[{ required: true, message: 'Por favor, selecione o papel!' }]}>
                            <Select placeholder="Selecione o nível de acesso">
                                <Option value="superadmin">{adminRoleMap.superadmin.text}</Option>
                                <Option value="branch_admin">{adminRoleMap.branch_admin.text}</Option>
                            </Select>
                        </Form.Item>

                         {/* Seleção de Filiais (Condicional ao Papel) */}
                         {/* Usa Form.useWatch para reatividade */}
                        <Form.Item
                            noStyle // Evita renderizar div extra e margens padrão
                            shouldUpdate={(prevValues, currentValues) => prevValues.role !== currentValues.role}
                        >
                            {({ getFieldValue }) =>
                                getFieldValue('role') === 'branch_admin' ? (
                                    <Form.Item
                                        name="branchIds"
                                        label="Filiais Gerenciadas"
                                        tooltip="Selecione as filiais que este administrador poderá gerenciar."
                                        rules={[{ required: true, message: 'Selecione pelo menos uma filial para este papel!' }]}
                                    >
                                        <Select
                                            mode="multiple"
                                            allowClear
                                            style={{ width: '100%' }}
                                            placeholder="Selecione as filiais"
                                            loading={loading.branches} // Usa loading das filiais
                                            filterOption={(input, option) =>
                                                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                            options={branches.map(branch => ({
                                                label: branch.name,
                                                value: branch.id,
                                            }))}
                                        />
                                    </Form.Item>
                                ) : null // Não mostra o campo se o papel for 'superadmin'
                            }
                        </Form.Item>
                    </Form>
                </Spin>
            </Modal>

        </ConfigProvider>
    );
};

// Helper para popconfirm (evitar repetição)
const Q = ({color}) => <QuestionCircleOutlined style={{ color: color || 'red' }}/>;

export default AdministrationPage;