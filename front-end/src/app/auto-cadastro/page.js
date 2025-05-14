// app/auto-cadastro/page.js
'use client'

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import {
    Form,
    Input,
    Select,
    DatePicker,
    Button,
    message,
    Spin,
    Upload,
    ConfigProvider,
    Typography,
    Row,
    Col,
    Card, // Added for better layout
} from 'antd';
import {
    PlusOutlined,
    LoadingOutlined,
    UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import ptBR from 'antd/locale/pt_BR';
import { API_BASE_URL } from '../config/apiConfig';

dayjs.locale('pt-br');

const { Title } = Typography;
const { Option } = Select;

// --- Funções Auxiliares (Copied from clientes/page.js) ---
const formatCPF = (cpf) => { if (!cpf) return ''; const cleaned = cpf.replace(/\D/g, ''); if (cleaned.length !== 11) return cpf; return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); };
const validateCPF = (cpf) => { if (!cpf) return false; const cleaned = cpf.replace(/\D/g, ''); if (cleaned.length !== 11 || /^(\d)\1+$/.test(cleaned)) return false; let sum = 0; let remainder; for (let i = 1; i <= 9; i++) { sum += parseInt(cleaned.substring(i - 1, i)) * (11 - i); } remainder = (sum * 10) % 11; if (remainder === 10 || remainder === 11) remainder = 0; if (remainder !== parseInt(cleaned.substring(9, 10))) return false; sum = 0; for (let i = 1; i <= 10; i++) { sum += parseInt(cleaned.substring(i - 1, i)) * (12 - i); } remainder = (sum * 10) % 11; if (remainder === 10 || remainder === 11) remainder = 0; if (remainder !== parseInt(cleaned.substring(10, 11))) return false; return true; };
const applyCpfMask = (value) => { if (!value) return ''; let cleaned = value.replace(/\D/g, ''); cleaned = cleaned.slice(0, 11); if (cleaned.length > 9) { return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'); } else if (cleaned.length > 6) { return cleaned.replace(/(\d{3})(\d{3})(\d{3})/, '$1.$2.$3'); } else if (cleaned.length > 3) { return cleaned.replace(/(\d{3})(\d{3})/, '$1.$2'); } else { return cleaned; } };
const applyWhatsAppMask = (value) => { if (!value) return ''; let cleaned = value.replace(/\D/g, ''); cleaned = cleaned.slice(0, 13); if (cleaned.length > 11) { return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`; } else if (cleaned.length > 9) { return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`; } else if (cleaned.length > 4) { return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4)}`; } else if (cleaned.length > 2) { return `+${cleaned.slice(0, 2)} (${cleaned.slice(2)}`; } else if (cleaned.length > 0) { return `+${cleaned}`; } else { return ''; } };


const SelfRegistrationPage = () => {
    const router = useRouter();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [imageUrl, setImageUrl] = useState(null);
    const [branches, setBranches] = useState([]);
    const [fetchingBranches, setFetchingBranches] = useState(true);

    const fetchBranches = useCallback(async () => {
        console.log("Auto-Cadastro: Buscando filiais...");
        setFetchingBranches(true);
        try {
            const response = await fetch(`${API_BASE_URL}/branches?status=active`); // Fetch only active branches
            if (!response.ok) throw new Error('Falha ao buscar filiais');
            const data = await response.json();
            setBranches(data || []);
        } catch (error) {
            console.error("Auto-Cadastro: Falha ao buscar filiais:", error);
            message.error(`Não foi possível carregar a lista de filiais. Tente novamente mais tarde.`);
            setBranches([]);
        } finally {
            setFetchingBranches(false);
        }
    }, []);

    useEffect(() => {
        fetchBranches();
    }, [fetchBranches]);

    const beforeUpload = (file) => {
        return new Promise((resolve, reject) => {
            const isJpg = file.type === 'image/jpeg';
            const isPng = file.type === 'image/png';

            if (!isJpg && !isPng) {
                message.error('Você só pode enviar arquivos JPG/PNG!');
                reject(Upload.LIST_IGNORE);
                return;
            }

            const processImage = (imageFile) => {
                if (imageFile.size / 1024 > 200) {
                    message.error('A imagem deve ser menor que 200KB!');
                    reject(Upload.LIST_IGNORE);
                    return;
                }
                resolve(imageFile); // Resolve with the processed file (original JPG or converted PNG)
            };

            if (isJpg) {
                // If JPG, just check size
                processImage(file);
            } else if (isPng) {
                // If PNG, convert to JPG then check size
                message.info('Convertendo imagem PNG para JPG...', 2);
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = event => {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.naturalWidth;
                        canvas.height = img.naturalHeight;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0);
                        canvas.toBlob(blob => {
                            if (!blob) {
                                message.error('Falha na conversão da imagem.');
                                reject(Upload.LIST_IGNORE);
                                return;
                            }
                            const convertedFile = new File([blob], file.name.replace(/\.png$/i, '.jpg'), {
                                type: 'image/jpeg',
                                lastModified: Date.now(),
                            });
                            processImage(convertedFile);
                        }, 'image/jpeg', 0.9); // 0.9 quality
                    };
                    img.onerror = () => {
                        message.error('Erro ao carregar imagem PNG para conversão.');
                        reject(Upload.LIST_IGNORE);
                    };
                };
                reader.onerror = () => {
                    message.error('Erro ao ler arquivo PNG.');
                    reject(Upload.LIST_IGNORE);
                };
            }
        });
    };

    const handleUploadChange = (info) => {
        if (info.file.status === 'uploading') {
            setUploading(true);
            return;
        }
        if (info.file.status === 'done') {
            setUploading(false);
            if (info.file.response && info.file.response.filePath) {
                const filePath = info.file.response.filePath;
                message.success(`${info.file.name} enviado com sucesso.`);
                form.setFieldsValue({ photoPath: filePath });

                const imageDisplayUrl = `${API_BASE_URL.replace('/api/v1', '')}${filePath}`;
                setImageUrl(imageDisplayUrl);
            } else {
                message.error('Falha ao obter o caminho do arquivo após o upload.');
                 form.setFieldsValue({ photoPath: null });
                 setImageUrl(null);
            }
        } else if (info.file.status === 'error') {
            setUploading(false);
            const errorMsg = info.file.response?.message || 'Falha no upload.';
            // If beforeUpload rejected, info.file.originFileObj might not be there or status might be odd
            // AntD's Upload.LIST_IGNORE from beforeUpload usually stops it silently before 'error' status with response
            if (info.file.originFileObj) { // Check if there's an original file to message about
                 message.error(`${info.file.originFileObj.name} falhou ao enviar. ${errorMsg}`);
            } else {
                 message.error(`Falha no upload. ${errorMsg}`);
            }
            form.setFieldsValue({ photoPath: null });
            setImageUrl(null);
        }
    };

    const handleSubmit = async (values) => {
        setLoading(true);
        console.log('Valores do formulário para auto-cadastro:', values);

        const payload = {
            name: values.name,
            whatsappNumber: values.whatsappNumber.replace(/\D/g, ''),
            cpf: values.cpf.replace(/\D/g, ''),
            dateOfBirth: values.dateOfBirth ? values.dateOfBirth.format('YYYY-MM-DD') : null,
            gender: values.gender,
            branchId: values.branchId,
            address: values.address,
            photoPath: values.photoPath,
            // isBlocked defaults to false on backend or should be set explicitly if required
            // For self-registration, user is active by default.
        };
        
        // Garante que o WhatsApp tenha o DDI 55
        if (payload.whatsappNumber.length === 11 && !payload.whatsappNumber.startsWith('55')) {
            payload.whatsappNumber = '55' + payload.whatsappNumber;
        }
        if (!payload.whatsappNumber.startsWith('+')) {
            payload.whatsappNumber = '+' + payload.whatsappNumber;
        }


        try {
            const response = await fetch(`${API_BASE_URL}/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                let errorMessage = errorData.message || `Falha ao realizar cadastro (${response.status})`;
                if (response.status === 409) { errorMessage = errorData.message || 'CPF ou WhatsApp já cadastrado.'; }
                if (response.status === 400) { errorMessage = errorData.message || 'Dados inválidos. Verifique os campos.'; }
                throw new Error(errorMessage);
            }

            const result = await response.json();
            message.success(`Cadastro realizado com sucesso, ${result.name}! Você será redirecionado para o login.`, 5);
            form.resetFields();
            setImageUrl(null);
            setTimeout(() => {
                router.push('/login'); // Ou uma página de "cadastro efetuado com sucesso"
            }, 5000);

        } catch (error) {
            console.error('Falha no auto-cadastro:', error);
            message.error(`Erro no cadastro: ${error.message}`, 5);
        } finally {
            setLoading(false);
        }
    };

    const handleCpfInputChange = (e) => {
        const maskedValue = applyCpfMask(e.target.value);
        form.setFieldsValue({ cpf: maskedValue });
    };

    const handleWhatsAppInputChange = (e) => {
        const maskedValue = applyWhatsAppMask(e.target.value);
        form.setFieldsValue({ whatsappNumber: maskedValue });
    };

    const uploadButton = (
        <div>
            {uploading ? <LoadingOutlined /> : <PlusOutlined />}
            <div style={{ marginTop: 8 }}>{uploading ? 'Enviando...' : 'Selecionar Foto'}</div>
        </div>
    );

    if (fetchingBranches && branches.length === 0) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <Spin size="large" tip="Carregando dados necessários..." />
            </div>
        );
    }
     if (!fetchingBranches && branches.length === 0) {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', padding: 20, textAlign: 'center' }}>
                <Title level={3} style={{color: 'red'}}>Erro ao Carregar Filiais</Title>
                <p>Não foi possível carregar as filiais disponíveis para cadastro.</p>
                <p>Por favor, tente novamente mais tarde ou contate o suporte.</p>
                <Button type="primary" onClick={fetchBranches} loading={fetchingBranches}>Tentar Novamente</Button>
            </div>
        );
    }


    return (
        <ConfigProvider locale={ptBR}>
            <Head>
                <title>Auto-Cadastro de Cliente</title>
            </Head>
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px', background: '#f0f2f5' }}>
                <Card style={{ width: '100%', maxWidth: 700, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}>
                    <Spin spinning={loading} tip="Processando cadastro...">
                        <Title level={2} style={{ textAlign: 'center', marginBottom: 24 }}>Auto-Cadastro de Cliente</Title>
                        <Form
                            form={form}
                            layout="vertical"
                            name="selfRegistrationForm"
                            onFinish={handleSubmit}
                            initialValues={{ whatsappNumber: '+55' }}
                        >
                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="name"
                                        label="Nome Completo"
                                        rules={[{ required: true, message: 'Insira o nome completo!' }]}
                                    >
                                        <Input placeholder="Seu nome completo" maxLength={100} />
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="whatsappNumber"
                                        label="Número WhatsApp"
                                        rules={[
                                            { required: true, message: 'Insira o WhatsApp!' },
                                            { pattern: /^\+55\s?\(\d{2}\)\s?\d{4,5}-?\d{4}$/, message: 'Formato: +55 (XX) XXXXX-XXXX' },
                                            { validator: (_, value) => value && value.replace(/\D/g, '').length >= 12 ? Promise.resolve() : Promise.reject(new Error('Número incompleto!')) }
                                        ]}
                                        validateTrigger="onBlur"
                                    >
                                        <Input placeholder="+55 (XX) XXXXX-XXXX" onChange={handleWhatsAppInputChange} maxLength={19} />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
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
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="dateOfBirth"
                                        label="Data de Nascimento"
                                        rules={[{ required: true, message: 'Selecione sua data de nascimento!' }]}
                                    >
                                        <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="DD/MM/AAAA" />
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={16}>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="gender"
                                        label="Gênero"
                                        rules={[{ required: true, message: 'Selecione seu gênero!' }]}
                                    >
                                        <Select placeholder="Selecione seu gênero">
                                            <Option value="Masculino">Masculino</Option>
                                            <Option value="Feminino">Feminino</Option>
                                            <Option value="Outro">Outro</Option>
                                            <Option value="Prefiro não informar">Prefiro não informar</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col xs={24} sm={12}>
                                    <Form.Item
                                        name="branchId"
                                        label="Filial de Preferência"
                                        rules={[{ required: true, message: 'Selecione uma filial!' }]}
                                    >
                                        <Select
                                            placeholder="Selecione a filial mais próxima"
                                            loading={fetchingBranches}
                                            disabled={fetchingBranches || branches.length === 0}
                                        >
                                            {branches.map(branch => (
                                                <Option key={branch.id} value={branch.id}>{branch.name}</Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Form.Item
                                name="address"
                                label="Endereço Completo"
                                rules={[{ required: true, message: 'Insira seu endereço completo!' }]}
                            >
                                <Input placeholder="Ex: Rua Exemplo, 123, Bairro Centro, Cidade - UF" maxLength={150} />
                            </Form.Item>

                            <Form.Item
                                name="photoPath"
                                label="Sua Foto (JPG/PNG, max 200KB)"
                                rules={[{ required: true, message: 'Envie sua foto!' }]}
                                // valuePropName="fileList" // Not needed if showUploadList is false and controlling via imageUrl
                            >
                                <Upload
                                    name="imageFile" // Nome do campo esperado pelo backend (multer)
                                    listType="picture-card"
                                    className="avatar-uploader"
                                    showUploadList={false}
                                    action={`${API_BASE_URL}/uploads/image`}
                                    beforeUpload={beforeUpload}
                                    onChange={handleUploadChange}
                                    disabled={uploading}
                                >
                                    {imageUrl ? (
                                        <img src={imageUrl} alt="Sua foto" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        uploadButton
                                    )}
                                </Upload>
                            </Form.Item>

                            <Form.Item>
                                <Button type="primary" htmlType="submit" loading={loading || uploading} block size="large">
                                    Cadastrar
                                </Button>
                            </Form.Item>
                        </Form>
                    </Spin>
                </Card>
            </div>
        </ConfigProvider>
    );
};

export default SelfRegistrationPage;