// app/clientes/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation'; // Importar useRouter
import {
    Table,
    Typography,
    Button,
    Modal,
    Form,
    Input,
    Select,
    DatePicker,
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
    ConfigProvider,
    Upload, // <-- Adicionado Upload
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    LockOutlined,
    UnlockOutlined,
    SearchOutlined,
    ClearOutlined,
    UserOutlined,
    QuestionCircleOutlined,
    CloseCircleOutlined,
    ShopOutlined, // Para Tag do admin
    LoadingOutlined, // <-- Adicionado LoadingOutlined
    // UploadOutlined, // Não é mais necessário se usar picture-card com PlusOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR';
import { API_BASE_URL } from '../../config/apiConfig'; // <-- Importa a URL base

dayjs.locale('pt-br');

const { Title, Text } = Typography;
const { Option } = Select;

// --- Funções Auxiliares (Mantidas) ---
const formatCPF = (cpf) => { if (!cpf) return ''; const cleaned = cpf.replace(/\D/g, ''); if (cleaned.length !== 11) return cpf; return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); };
const validateCPF = (cpf) => { if (!cpf) return false; const cleaned = cpf.replace(/\D/g, ''); if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false; let sum = 0; let remainder; for (let i = 1; i <= 9; i++) { sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i); } remainder = (sum * 10) % 11; if (remainder === 10 || remainder === 11) remainder = 0; if (remainder !== parseInt(cleaned.substring(9, 10))) return false; sum = 0; for (let i = 1; i <= 10; i++) { sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i); } remainder = (sum * 10) % 11; if (remainder === 10 || remainder === 11) remainder = 0; if (remainder !== parseInt(cleaned.substring(10, 11))) return false; return true; };
const applyCpfMask = (value) => { if (!value) return ''; let cleaned = value.replace(/\D/g, ''); cleaned = cleaned.slice(0, 11); if (cleaned.length > 9) { return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); } else if (cleaned.length > 6) { return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3'); } else if (cleaned.length > 3) { return cleaned.replace(/(\d{3})(\d{3})/, '$1.$2'); } else { return cleaned; } };
const applyWhatsAppMask = (value) => { if (!value) return ''; let cleaned = value.replace(/\D/g, ''); cleaned = cleaned.slice(0, 13); if (cleaned.length > 11) { return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`; } else if (cleaned.length > 9) { return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`; } else if (cleaned.length > 4) { return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4)}`; } else if (cleaned.length > 2) { return `+${cleaned.slice(0, 2)} (${cleaned.slice(2)}`; } else if (cleaned.length > 0) { return `+${cleaned}`; } else { return ''; } };


const UsersPage = () => {
    const router = useRouter();

    // --- Estados ---
    const [users, setUsers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [loading, setLoading] = useState(false);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingUser, setEditingUser] = useState(null);
    const [form] = Form.useForm();

    const [userRole, setUserRole] = useState(null);
    const [userManagedBranchIds, setUserManagedBranchIds] = useState([]);
    const [userManagedBranchNames, setUserManagedBranchNames] = useState([]);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

    // ** NOVO: Estados para Upload de Imagem **
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState(null); // Para preview da imagem no Upload

    const [filters, setFilters] = useState({
        search: '',
        branchId: null,
        status: null,
    });
    const [pagination, setPagination] = useState({
        current: 1, pageSize: 10, total: 0,
        showSizeChanger: true, pageSizeOptions: ['10', '20', '50', '100'],
        showTotal: (total, range) => `${range[0]}-${range[1]} de ${total} usuários`,
    });

    useEffect(() => {
        console.log("Clientes: Verificando dados do usuário...");
        setIsLoadingPermissions(true);
        let role = null;
        let managedIds = [];
        let managedNames = [];
        let initialBranchFilter = null;

        try {
            const userDataString = sessionStorage.getItem('userData');
            if (!userDataString) throw new Error("Usuário não autenticado.");

            const userData = JSON.parse(userDataString);
            if (!userData || !userData.role) throw new Error("Dados de usuário inválidos.");

            role = userData.role;
            console.log("Clientes: Papel encontrado:", role);
            setUserRole(role);

            if (role === 'branch_admin') {
                if (!userData.branches || !Array.isArray(userData.branches) || userData.branches.length === 0) {
                     console.warn("Clientes: 'branch_admin' sem filiais associadas em userData.");
                     managedIds = [];
                     managedNames = [];
                     initialBranchFilter = -1;
                } else {
                    managedIds = userData.branches.map(b => b.id);
                    managedNames = userData.branches.map(b => b.name);
                    setUserManagedBranchIds(managedIds);
                    setUserManagedBranchNames(managedNames);
                    initialBranchFilter = managedIds[0];
                    console.log("Clientes: Branch Admin - Filtro inicial para filial ID:", initialBranchFilter);
                }
                 setFilters(prev => ({ ...prev, branchId: initialBranchFilter }));
            } else if (role === 'superadmin') {
                setFilters(prev => ({ ...prev, branchId: null }));
            }
             else if (role !== 'superadmin') {
                 throw new Error("Papel de usuário não reconhecido ou não suportado nesta página.");
            }
            fetchBranches();
        } catch (err) {
            console.error("Clientes: Erro ao processar dados do usuário.", err);
            message.error(`Erro ao verificar permissões: ${err.message}. Redirecionando para login.`);
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            router.replace('/login');
        } finally {
            setIsLoadingPermissions(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]);


    const fetchUsers = useCallback(async (page = 1, pageSize = 10, currentFilters) => {
         if (isLoadingPermissions) {
            console.log("Clientes: Aguardando carregamento das permissões...");
            return;
        }
        const effectiveFilters = currentFilters || filters;
        setLoading(true);
        console.log("Clientes: Buscando da API:", effectiveFilters, `Page: ${page}, Size: ${pageSize}`);
        const params = new URLSearchParams({ include: 'branch' });
        if (effectiveFilters.search) params.append('search', effectiveFilters.search);
        if (effectiveFilters.branchId && effectiveFilters.branchId !== -1) {
            params.append('branchId', effectiveFilters.branchId);
        }
        if (effectiveFilters.status !== null && effectiveFilters.status !== undefined) {
            params.append('isBlocked', effectiveFilters.status === 'blocked');
        }

        try {
            const apiUrl = `${API_BASE_URL}/users?${params.toString()}`;
            console.log("Clientes: URL da API:", apiUrl);
            const response = await fetch(apiUrl);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `Falha ao buscar usuários (${response.status})`);
            }
            let data = await response.json();
            setUsers(data);
            setPagination(prev => ({ ...prev, total: data.length, current: page, pageSize }));
        } catch (error) {
            console.error("Clientes: Falha ao buscar:", error);
            message.error(`Falha ao carregar usuários: ${error.message}`);
            setUsers([]);
            setPagination(prev => ({ ...prev, total: 0, current: 1 }));
        } finally {
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingPermissions, filters, API_BASE_URL]);


    const fetchBranches = useCallback(async () => {
        console.log("Clientes: Buscando filiais para selects...");
        try {
            const response = await fetch(`${API_BASE_URL}/branches`);
            if (!response.ok) throw new Error('Falha ao buscar filiais');
            const data = await response.json();
            setBranches(data || []);
        } catch (error) {
            console.error("Clientes: Falha ao buscar filiais:", error);
            message.error(`Falha ao carregar lista de filiais: ${error.message}`);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [API_BASE_URL]);

     useEffect(() => {
         if (!isLoadingPermissions) {
            fetchUsers(pagination.current, pagination.pageSize, filters);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isLoadingPermissions, pagination.current, pagination.pageSize, filters, fetchUsers]);

    const handleFilterChange = (key, value) => {
        if (key === 'branchId' && userRole === 'branch_admin') return;
        const realValue = (key === 'branchId' && value === undefined) ? null : value;
        const newFilters = { ...filters, [key]: realValue };
        setFilters(newFilters);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const handleTableChange = (newPagination, tableFiltersAntd, sorter) => {
         setPagination(prev => ({
             ...prev,
             current: newPagination.current,
             pageSize: newPagination.pageSize
         }));
    };

    const clearFilters = () => {
        let resetFilters = { search: '', branchId: null, status: null };
        if (userRole === 'branch_admin' && userManagedBranchIds.length > 0) {
            resetFilters.branchId = userManagedBranchIds[0];
        }
        setFilters(resetFilters);
        setPagination(prev => ({ ...prev, current: 1 }));
    };

    const showAddModal = () => {
        setEditingUser(null);
        form.resetFields();
        setImageUrl(null); // Limpa preview da imagem
        setUploading(false); // Reseta estado de upload

        let initialValues = {
            name: '',
            whatsappNumber: '+55',
            cpf: '',
            dateOfBirth: null,
            gender: null,
            id_filial: null,
            address: '',
            photoPath: null, // Campo para o caminho da imagem, será preenchido pelo Upload
            isBlocked: false,
        };

        if (userRole === 'branch_admin') {
            if (userManagedBranchIds.length > 0) {
                initialValues.id_filial = userManagedBranchIds[0];
            } else {
                console.warn("Admin de filial sem filial gerenciada ao tentar abrir modal de adição.");
                message.warning("Você não tem uma filial gerenciada associada para criar clientes.", 5);
            }
        }
        form.setFieldsValue(initialValues);
        setIsModalVisible(true);
    };

    const showEditModal = (record) => {
        setEditingUser(record);
        form.resetFields();
        setUploading(false);

        form.setFieldsValue({
            name: record.name,
            dateOfBirth: record.dateOfBirth ? dayjs(record.dateOfBirth) : null,
            gender: record.gender,
            id_filial: record.branchId || record.branch?.id,
            address: record.address,
            photoPath: record.photoPath, // Mantém o caminho relativo no form
            isBlocked: record.isBlocked,
        });

        // Configura a URL para preview da imagem existente
        if (record.photoPath) {
            // Constrói a URL completa para exibição da imagem
            // Ex: API_BASE_URL = http://localhost:3009/api/v1, photoPath = /uploads/images/nome.jpg
            // imageDisplayUrl = http://localhost:3009/uploads/images/nome.jpg
            const imageDisplayUrl = `${API_BASE_URL.replace('/api/v1', '')}${record.photoPath}`;
            setImageUrl(imageDisplayUrl);
        } else {
            setImageUrl(null);
        }
        setIsModalVisible(true);
    };

    const handleCancel = () => {
        setIsModalVisible(false);
        setEditingUser(null);
        form.resetFields();
        setImageUrl(null); // Limpar preview
        setUploading(false); // Resetar estado de upload
    };

    // --- Funções para Upload de Imagem ---
    const beforeUpload = (file) => {
        const isJpgOrPng = file.type === 'image/jpeg' || file.type === 'image/png';
        if (!isJpgOrPng) {
            message.error('Você só pode enviar arquivos JPG/PNG!');
        }
        const isLt200K = file.size / 1024 < 200; // Menor que 200KB
        if (!isLt200K) {
            message.error('A imagem deve ser menor que 200KB!');
        }
        // Só retorna true se ambas as condições forem verdadeiras
        if (!(isJpgOrPng && isLt200K)) {
            return Upload.LIST_IGNORE; // Impede o upload se inválido
        }
        return isJpgOrPng && isLt200K;
    };

    const handleUploadChange = (info) => {
        if (info.file.status === 'uploading') {
            setUploading(true);
            // Não limpar imageUrl aqui para manter a imagem antiga visível até o novo upload completar
            // setImageUrl(null);
            // form.setFieldsValue({ photoPath: null }); // Não limpar o photoPath ainda
            return;
        }
        if (info.file.status === 'done') {
            setUploading(false);
            if (info.file.response && info.file.response.filePath) {
                const filePath = info.file.response.filePath;
                message.success(`${info.file.name} enviado com sucesso.`);
                form.setFieldsValue({ photoPath: filePath }); // Seta o caminho relativo no form

                const imageDisplayUrl = `${API_BASE_URL.replace('/api/v1', '')}${filePath}`;
                setImageUrl(imageDisplayUrl); // Atualiza preview com a nova imagem
            } else {
                message.error('Falha ao obter o caminho do arquivo após o upload.');
                // form.setFieldsValue({ photoPath: editingUser ? editingUser.photoPath : null }); // Reverte para o antigo se falhar
                // setImageUrl(editingUser && editingUser.photoPath ? `${API_BASE_URL.replace('/api/v1', '')}${editingUser.photoPath}` : null);
            }
        } else if (info.file.status === 'error') {
            setUploading(false);
            message.error(`${info.file.name} falhou ao enviar. ${info.file.response?.message || ''}`);
            // form.setFieldsValue({ photoPath: editingUser ? editingUser.photoPath : null });
            // setImageUrl(editingUser && editingUser.photoPath ? `${API_BASE_URL.replace('/api/v1', '')}${editingUser.photoPath}` : null);
        }
    };
    // --- Fim Funções para Upload de Imagem ---


    const handleOk = async () => {
        console.log('Form values right before validation:', form.getFieldsValue(true));
        try {
            setLoading(true);
            const values = await form.validateFields();
            console.log('Validation successful. Form values:', values);

            let effectiveBranchId = values.id_filial;
             if (userRole === 'branch_admin') {
                 if (userManagedBranchIds.length === 0) throw new Error("Administrador sem filial associada.");
                 effectiveBranchId = values.id_filial || userManagedBranchIds[0];
                 if(!effectiveBranchId) throw new Error("Filial do administrador não encontrada.");
             } else if (!effectiveBranchId && userRole === 'superadmin' && !editingUser) {
                 throw new Error("Super Admin deve selecionar a filial para criar o usuário.");
             } else if (!effectiveBranchId && userRole === 'superadmin' && editingUser) {
                  if (!editingUser.branchId && !values.id_filial) {
                        throw new Error("Super Admin deve selecionar a filial para o usuário.");
                  }
                  effectiveBranchId = values.id_filial;
             }

            const commonData = {
                name: values.name,
                dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
                gender: values.gender,
                address: values.address,
                photoPath: values.photoPath, // photoPath já está no form vindo do Upload
                isBlocked: values.isBlocked,
                branchId: effectiveBranchId,
            };

            let method = 'POST';
            let url = `${API_BASE_URL}/users`;
            let bodyToSend = { ...commonData };

            if (editingUser) {
                method = 'PUT';
                url = `${API_BASE_URL}/users/${editingUser.id}`;
                console.log('Dados formatados para PUT (Edição):', bodyToSend);
            } else {
                 bodyToSend.cpf = values.cpf.replace(/\D/g, '');
                 bodyToSend.whatsappNumber = values.whatsappNumber.replace(/\D/g, '');
                 if (bodyToSend.whatsappNumber.length === 12 && !bodyToSend.whatsappNumber.startsWith('55')) {
                     bodyToSend.whatsappNumber = '55' + bodyToSend.whatsappNumber;
                 }
                 if (!bodyToSend.whatsappNumber.startsWith('+')) {
                    bodyToSend.whatsappNumber = '+' + bodyToSend.whatsappNumber;
                 }
                 console.log('Dados formatados para POST (Criação):', bodyToSend);
            }

            const response = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyToSend),
            });

            if (!response.ok) {
                 const errorData = await response.json().catch(() => ({}));
                 let errorMessage = errorData.message || `Falha ao ${editingUser ? 'atualizar' : 'criar'} usuário (${response.status})`;
                 if (response.status === 409 && !editingUser) { errorMessage = errorData.message || 'CPF ou WhatsApp já cadastrado.'; }
                 if (response.status === 400) { errorMessage = errorData.message || 'Dados inválidos. Verifique os campos enviados.'; }
                 if (response.status === 404) { errorMessage = 'Usuário não encontrado para atualização.'; }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            message.success(`Cliente ${result.name} ${editingUser ? 'atualizado' : 'criado'} com sucesso!`);
            handleCancel();
            fetchUsers(1, pagination.pageSize, filters);

        } catch (errorInfo) {
            if (errorInfo && errorInfo.errorFields && Array.isArray(errorInfo.errorFields)) {
                console.error('Falha na validação do formulário:', errorInfo);
                const firstError = errorInfo.errorFields[0]?.errors[0] || 'Erro de validação. Verifique os campos marcados.';
                message.error(firstError);
            } else {
                console.error('Falha na API ou erro inesperado:', errorInfo);
                message.error(`Ocorreu um erro: ${errorInfo.message || 'Erro desconhecido ao salvar.'}`);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBlock = async (record) => { const actionText = record.isBlocked ? 'Desbloquear' : 'Bloquear'; console.log(`${actionText} usuário ID: ${record.id}`); setLoading(true); try { const response = await fetch(`${API_BASE_URL}/users/${record.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ isBlocked: !record.isBlocked }), }); if (!response.ok) { const errorData = await response.json().catch(() => ({})); if (response.status === 404) { throw new Error('Usuário não encontrado para atualização.'); } throw new Error(errorData.message || `Falha ao ${actionText.toLowerCase()} usuário (${response.status})`); } message.success(`Cliente ${record.name} ${record.isBlocked ? 'desbloqueado' : 'bloqueado'} com sucesso.`); fetchUsers(pagination.current, pagination.pageSize, filters); } catch (error) { console.error(`Erro ao ${actionText.toLowerCase()} usuário:`, error); message.error(`Falha ao ${actionText.toLowerCase()} o cliente: ${error.message}`); } finally { setLoading(false); } };
    const handleCpfInputChange = (e) => { const maskedValue = applyCpfMask(e.target.value); form.setFieldsValue({ cpf: maskedValue }); };
    const handleWhatsAppInputChange = (e) => { const maskedValue = applyWhatsAppMask(e.target.value); form.setFieldsValue({ whatsappNumber: maskedValue }); };

    const columns = [
        { title: 'Hikvision', dataIndex: 'employeeNo', key: 'employeeNo', width: 100, align: 'center', render: (v) => v ? v : <Tooltip title="Não cadastrado no Hikvision"><CloseCircleOutlined style={{ color: '#ccc', fontSize: '18px' }} /></Tooltip> },
        { title: 'Foto', dataIndex: 'photoPath', key: 'photo', width: 60, align: 'center', render: (path, record) => {
            const displayUrl = path ? `${API_BASE_URL.replace('/api/v1', '')}${path}` : undefined;
            return <Avatar src={displayUrl} icon={<UserOutlined />} alt={record.name} />;
        }},
        { title: 'ID', dataIndex: 'id', key: 'id', sorter: (a, b) => a.id - b.id, width: 80 },
        { title: 'Nome', dataIndex: 'name', key: 'name', sorter: (a, b) => a.name.localeCompare(b.name), ellipsis: true },
        { title: 'WhatsApp', dataIndex: 'whatsappNumber', key: 'whatsappNumber', render: (num) => num ? applyWhatsAppMask(num) : '-' },
        { title: 'CPF', dataIndex: 'cpf', key: 'cpf', render: formatCPF },
        {
            title: 'Filial', dataIndex: ['branch', 'name'], key: 'branchName', render: (branchName) => branchName || 'N/D',
            sorter: (a, b) => (a.branch?.name || '').localeCompare(b.branch?.name || ''),
             filters: userRole === 'superadmin' ? branches.map(b => ({ text: b.name, value: b.id })) : undefined,
             filterMultiple: false,
             ellipsis: true,
        },
        {
            title: 'Status', dataIndex: 'isBlocked', key: 'status', width: 100, align: 'center',
            render: (isBlocked) => <Tag color={isBlocked ? 'volcano' : 'green'}>{isBlocked ? 'Bloqueado' : 'Ativo'}</Tag>,
            filters: [{ text: 'Ativo', value: false }, { text: 'Bloqueado', value: true }],
        },
        { title: 'Data Cadastro', dataIndex: 'createdAt', key: 'createdAt', width: 160, align: 'center', render: (date) => date ? dayjs(date).format('DD/MM/YYYY HH:mm') : '-', sorter: (a, b) => dayjs(a.createdAt).unix() - dayjs(b.createdAt).unix(), },
        { title: 'Ações', key: 'actions', align: 'center', fixed: 'right', width: 120, render: (_, record) => (
             <Space size="small">
                <Tooltip title="Editar Cliente">
                    <Button icon={<EditOutlined />} onClick={() => showEditModal(record)} size="small" disabled={loading}/>
                </Tooltip>
                <Popconfirm
                     title={`Tem certeza que deseja ${record.isBlocked ? 'desbloquear' : 'bloquear'} ${record.name}?`}
                     onConfirm={() => handleToggleBlock(record)}
                     okText="Sim" cancelText="Não"
                     okButtonProps={{ danger: !record.isBlocked, loading: loading }}
                     cancelButtonProps={{ disabled: loading }}
                     icon={<QuestionCircleOutlined style={{ color: record.isBlocked ? 'green' : 'red' }} />}
                     placement="topRight"
                 >
                    <Tooltip title={record.isBlocked ? 'Desbloquear Cliente' : 'Bloquear Cliente'}>
                        <Button
                            icon={record.isBlocked ? <UnlockOutlined /> : <LockOutlined />}
                            size="small"
                            danger={!record.isBlocked}
                            disabled={loading}
                         />
                    </Tooltip>
                 </Popconfirm>
             </Space>
        ), },
    ];

    // Botão de Upload para o componente Upload
    const uploadButton = (
        <div>
            {uploading ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 8 }}>{uploading ? 'Enviando...' : 'Selecionar'}</div>
        </div>
    );

    return (
        <ConfigProvider locale={ptBR}>
            <Head>
                <title>Gerenciamento de Clientes</title>
            </Head>
             <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', padding: '20px' }}>
                <Row justify="space-between" align="middle" style={{ marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #f0f0f0' }}>
                    <Col>
                         <Space align="center">
                            <Title level={2} style={{ margin: 0 }}>
                                 {userRole === 'branch_admin' && userManagedBranchNames.length === 1 ? `Clientes: ${userManagedBranchNames[0]}` : 'Gerenciamento de Clientes'}
                            </Title>
                            {userRole === 'branch_admin' && <Tag icon={<ShopOutlined/>} color="blue" style={{ marginLeft: 8}}>Admin Filial</Tag>}
                            {userRole === 'superadmin' && <Tag color="purple" style={{ marginLeft: 8}}>Super Admin</Tag>}
                         </Space>
                    </Col>
                    <Col><Button type="primary" icon={<PlusOutlined />} onClick={showAddModal} disabled={isLoadingPermissions || loading || (userRole === 'branch_admin' && userManagedBranchIds.length === 0)}>Adicionar Cliente</Button></Col>
                </Row>

                 {isLoadingPermissions && ( <div style={{ textAlign: 'center', padding: '50px 0' }}><Spin size="large" tip="Verificando permissões..." /></div> )}
                 {!isLoadingPermissions && !userRole && ( <div style={{ padding: '40px 0' }}><Text type="danger">Erro ao carregar dados de permissão. Faça login novamente.</Text></div> )}

                 {!isLoadingPermissions && userRole && (
                    <>
                        <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
                            <Col xs={24} sm={12} md={8} lg={8}>
                                <Input.Search placeholder="Buscar por Nome, CPF, WhatsApp..." allowClear enterButton={<SearchOutlined />} value={filters.search} onChange={(e) => handleFilterChange('search', e.target.value)} onSearch={() => fetchUsers(1, pagination.pageSize, filters)} disabled={loading} />
                            </Col>
                            <Col xs={24} sm={12} md={6} lg={5}>
                                 <Tooltip title={userRole === 'branch_admin' ? `Visualizando apenas filial ${userManagedBranchNames.join(', ')}` : 'Filtrar por filial'}>
                                    <Select
                                        placeholder="Filtrar por Filial"
                                        allowClear={userRole === 'superadmin'}
                                        style={{ width: '100%' }}
                                        value={filters.branchId}
                                        onChange={(value) => handleFilterChange('branchId', value)}
                                        loading={branches.length === 0 && loading && userRole === 'superadmin'}
                                        disabled={isLoadingPermissions || loading || userRole === 'branch_admin'}
                                        aria-label={userRole === 'branch_admin' && userManagedBranchNames.length > 0 ? `Filial: ${userManagedBranchNames[0]}`: 'Selecionar Filial'}
                                    >
                                        {userRole === 'superadmin' && (<Option value={null}>Todas as Filiais</Option>)}
                                        {branches.map(branch => (<Option key={branch.id} value={branch.id}>{branch.name}</Option>))}
                                    </Select>
                                </Tooltip>
                            </Col>
                            <Col xs={24} sm={12} md={6} lg={5}>
                                <Select placeholder="Filtrar por Status" allowClear style={{ width: '100%' }} value={filters.status} onChange={(value) => handleFilterChange('status', value)} disabled={loading} >
                                    <Option value="active">Ativo</Option>
                                    <Option value="blocked">Bloqueado</Option>
                                </Select>
                            </Col>
                            <Col xs={24} sm={12} md={4} lg={3}>
                                <Button icon={<ClearOutlined />} onClick={clearFilters} style={{ width: '100%' }} disabled={loading}>Limpar Filtros</Button>
                            </Col>
                        </Row>

                        <div style={{ flex: '1 1 auto', overflow: 'hidden', background: '#fff', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                             <Spin spinning={loading} tip="Carregando clientes...">
                                <Table
                                     dataSource={users}
                                     columns={columns}
                                     rowKey="id"
                                     scroll={{ x: 1200, y: 'calc(100vh - 340px)' }}
                                     pagination={pagination}
                                     onChange={handleTableChange}
                                     style={{ height: '100%' }}
                                     locale={{ emptyText: isLoadingPermissions ? 'Carregando permissões...' : (loading ? 'Carregando...' : 'Nenhum cliente encontrado com os filtros atuais.') }}
                                />
                            </Spin>
                        </div>
                    </>
                 )}
            </div>

            <Modal
                title={editingUser ? `Editar Cliente: ${editingUser.name}` : 'Adicionar Novo Cliente'}
                open={isModalVisible}
                onOk={handleOk}
                onCancel={handleCancel}
                confirmLoading={loading}
                okText={editingUser ? 'Salvar Alterações' : 'Criar Cliente'}
                cancelText="Cancelar"
                destroyOnClose
                maskClosable={!loading}
                width={700}
                afterOpenChange={(open) => { if (open && !editingUser) { form.getFieldInstance('name')?.focus(); } }}
            >
                    <Form form={form} layout="vertical" name="userForm">
                         <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="name" label="Nome Completo" rules={[{ required: true, message: 'Insira o nome completo!' }]}>
                                    <Input placeholder="Nome do Cliente" maxLength={100} />
                                </Form.Item>
                            </Col>
                             {!editingUser ? (
                                 <Col span={12}>
                                     <Form.Item
                                        name="whatsappNumber"
                                        label="Número WhatsApp"
                                        rules={[
                                            { required: true, message: 'Insira o WhatsApp!' },
                                            { pattern: /^\+55\s?\(\d{2}\)\s?\d{4,5}-?\d{4}$/, message: 'Formato inválido! Use +55 (XX) XXXXX-XXXX' },
                                            { validator: (_, value) => value && value.replace(/\D/g, '').length >= 12 ? Promise.resolve() : Promise.reject(new Error('Número incompleto!')) }
                                        ]}
                                        validateTrigger="onBlur"
                                        >
                                         <Input placeholder="+55 (XX) XXXXX-XXXX" onChange={handleWhatsAppInputChange} maxLength={19} />
                                     </Form.Item>
                                 </Col>
                             ) : (
                                <Col span={12}>
                                    <Form.Item label="Número WhatsApp">
                                        <Input value={editingUser.whatsappNumber ? applyWhatsAppMask(editingUser.whatsappNumber) : 'N/D'} disabled />
                                    </Form.Item>
                                </Col>
                             )}
                         </Row>
                         <Row gutter={16}>
                             {!editingUser ? (
                                 <Col span={12}>
                                     <Form.Item
                                        name="cpf"
                                        label="CPF"
                                        rules={[
                                            { required: true, message: 'Insira o CPF!' },
                                            { validator: (_, value) => validateCPF(value) ? Promise.resolve() : Promise.reject(new Error('CPF inválido!')) }
                                        ]}
                                        validateTrigger="onBlur"
                                        >
                                         <Input placeholder="000.000.000-00" onChange={handleCpfInputChange} maxLength={14} />
                                     </Form.Item>
                                 </Col>
                             ) : (
                                <Col span={12}>
                                    <Form.Item label="CPF">
                                        <Input value={editingUser.cpf ? formatCPF(editingUser.cpf) : 'N/D'} disabled />
                                    </Form.Item>
                                </Col>
                             )}
                             <Col span={12}>
                                 <Form.Item name="dateOfBirth" label="Data de Nascimento" rules={[{ required: true, message: 'Selecione a data de nascimento!' }]}>
                                     <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/AAAA" />
                                 </Form.Item>
                             </Col>
                        </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item name="gender" label="Gênero" rules={[{ required: true, message: 'Selecione o gênero!' }]}>
                                    <Select placeholder="Selecione o gênero">
                                        <Option value="Masculino">Masculino</Option>
                                        <Option value="Feminino">Feminino</Option>
                                        <Option value="Outro">Outro</Option>
                                        <Option value="Prefiro não informar">Prefiro não informar</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item
                                    name="id_filial"
                                    label="Filial Principal"
                                    rules={[{ required: true, message: 'Selecione a filial principal!' }]}
                                >
                                     <Select
                                        placeholder={userRole === 'branch_admin' && userManagedBranchNames.length > 0 ? userManagedBranchNames[0] : 'Selecione a filial'}
                                        allowClear={userRole === 'superadmin'}
                                        loading={branches.length === 0 && loading}
                                        disabled={isLoadingPermissions || userRole === 'branch_admin'}
                                    >
                                         {branches
                                             .filter(branch => userRole === 'superadmin' || userManagedBranchIds.includes(branch.id))
                                             .map(branch => (<Option key={branch.id} value={branch.id}>{branch.name}</Option>))}
                                    </Select>
                                </Form.Item>
                            </Col>
                        </Row>
                         <Row gutter={16}>
                            <Col span={24}>
                                <Form.Item name="address" label="Endereço Completo" rules={[{ required: true, message: 'Insira o endereço completo!' }]}>
                                    <Input placeholder="Ex: Rua Exemplo, 123, Bairro Centro, Cidade - UF" maxLength={150}/>
                                </Form.Item>
                            </Col>
                         </Row>
                        <Row gutter={16}>
                            <Col span={12}>
                                <Form.Item
                                    name="photoPath"
                                    label="Foto do Cliente"
                                    rules={[{ required: true, message: 'Envie a foto do cliente!' }]}
                                    // O valor do photoPath será setado pelo handleUploadChange
                                >
                                    <Upload
                                        name="imageFile" // Nome do campo esperado pelo backend (multer)
                                        listType="picture-card"
                                        className="avatar-uploader" // Para estilização customizada se necessário
                                        showUploadList={false}
                                        action={`${API_BASE_URL}/uploads/image`} // Endpoint de upload
                                        beforeUpload={beforeUpload}
                                        onChange={handleUploadChange}
                                        disabled={loading || uploading} // Desabilita durante o submit do form ou upload
                                    >
                                        {imageUrl ? (
                                            <img src={imageUrl} alt="Foto do cliente" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        ) : (
                                            uploadButton
                                        )}
                                    </Upload>
                                </Form.Item>
                            </Col>
                            <Col span={12}>
                                <Form.Item name="isBlocked" label="Status do Cliente" valuePropName="checked">
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