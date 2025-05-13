// app/login/page.js
'use client'

import React, { useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation';
import {
    Layout, // Usaremos Layout do Antd como container flexível
    Card,
    Form,
    Input,
    Button,
    Typography,
    message,
    Spin,
    ConfigProvider,
    Row,
    Col
} from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import ptBR from 'antd/locale/pt_BR';
import { API_BASE_URL } from '../config/apiConfig'; // Ajuste o caminho se necessário

const { Title } = Typography;

const LoginPage = () => {
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();
    const router = useRouter();

    const onFinish = async (values) => {
        setLoading(true);
        console.log('Tentando fazer login com:', values);

        try {
            // Faz a requisição para a rota de login do backend
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: values.username, // Campo esperado pelo backend (email/usuário)
                    password: values.password,
                }),
            });

            // Pega a resposta da API
            const result = await response.json();

            // Verifica se a resposta NÃO foi OK (status diferente de 2xx)
            if (!response.ok) {
                // Lança um erro com a mensagem da API ou uma mensagem padrão
                throw new Error(result.message || `Falha na autenticação (${response.status})`);
            }

            // --- Sucesso no Login ---
            message.success('Login realizado com sucesso!');

            // Armazena o token JWT e os dados do usuário no sessionStorage
            if (result.token) {
                sessionStorage.setItem('authToken', result.token); // <<< Alterado para sessionStorage
                console.log("LOGIN: Token salvo na sessionStorage:", result.token); // LOG ADICIONADO
            } else {
                console.warn("LOGIN: Token não recebido da API!"); // LOG ADICIONADO
            }

            if (result.user) {
                const userDataString = JSON.stringify(result.user);
                sessionStorage.setItem('userData', userDataString); // <<< Alterado para sessionStorage
                console.log("LOGIN: Dados do usuário salvos na sessionStorage:", userDataString); // LOG ADICIONADO
            } else {
                console.warn("LOGIN: Dados do usuário não recebidos da API!"); // LOG ADICIONADO
            }

            // LOG ANTES DO REDIRECT
            console.log('LOGIN: Verificando sessionStorage ANTES do redirect. Token:', sessionStorage.getItem('authToken'));

            // Redireciona para o dashboard (ou outra página principal)
            // replace evita que a página de login fique no histórico do navegador
            console.log("LOGIN: Redirecionando para /dashboard..."); // LOG ADICIONADO
            router.replace('/dashboard');

        } catch (error) {
            // --- Tratamento de Erro ---
            console.error("Erro no login:", error);
            // Exibe a mensagem de erro para o usuário
            message.error(`Erro no login: ${error.message}`);
            // Para o indicador de carregamento em caso de erro
            setLoading(false);
        }
        // setLoading(false) não é necessário aqui se o redirecionamento for bem-sucedido,
        // pois o componente será desmontado. Ele já é parado no catch.
    };

    // Função chamada se a validação do formulário Ant Design falhar (antes do fetch)
    const onFinishFailed = (errorInfo) => {
        console.log('Falha na validação do formulário:', errorInfo);
        message.warning('Por favor, preencha todos os campos corretamente.');
    };

    // --- Renderização do Componente ---
    return (
        <ConfigProvider locale={ptBR}>
            <Head>
                <title>Login - Plataforma Unificada</title>
            </Head>
            {/* Layout Principal para centralização */}
            <Layout
                style={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#f0f2f5',
                    padding: '20px',
                }}
            >
                {/* Card contendo o formulário */}
                <Card
                    style={{
                        width: '100%',
                        maxWidth: 400,
                        boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                        borderRadius: '8px',
                    }}
                >
                    {/* Cabeçalho do Card */}
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        {/* Espaço para Logo (descomentar e ajustar se necessário) */}
                        {/* <img src="/path/to/your/logo.png" alt="Logo" style={{ height: '50px', marginBottom: '16px' }} /> */}
                        <Title level={3} style={{ margin: 0 }}>Acessar Plataforma</Title>
                    </div>

                    {/* Spin para indicar carregamento durante a autenticação */}
                    <Spin spinning={loading} tip="Autenticando...">
                        {/* Formulário Ant Design */}
                        <Form
                            form={form} // Instância do formulário
                            name="login-form" // Nome do formulário
                            initialValues={{ remember: true }} // Valores iniciais (opcional)
                            onFinish={onFinish} // Função chamada no submit bem-sucedido
                            onFinishFailed={onFinishFailed} // Função chamada na falha de validação
                            layout="vertical" // Layout dos labels e inputs
                            requiredMark={false} // Oculta marca de obrigatório (*)
                        >
                            {/* Campo Email/Usuário */}
                            <Form.Item
                                name="username" // Nome do campo (usado no values do onFinish)
                                label="Email ou Usuário"
                                rules={[{ required: true, message: 'Por favor, insira seu email ou nome de usuário!' }]} // Regras de validação
                            >
                                <Input
                                    prefix={<UserOutlined style={{ color: 'rgba(0,0,0,.25)' }} />} // Ícone
                                    placeholder="seu.email@exemplo.com"
                                    size="large" // Tamanho do input
                                />
                            </Form.Item>

                            {/* Campo Senha */}
                            <Form.Item
                                name="password"
                                label="Senha"
                                rules={[{ required: true, message: 'Por favor, insira sua senha!' }]}
                            >
                                <Input.Password // Input específico para senhas
                                    prefix={<LockOutlined style={{ color: 'rgba(0,0,0,.25)' }} />}
                                    placeholder="Sua senha"
                                    size="large"
                                />
                            </Form.Item>

                            {/* Botão de Submit */}
                            <Form.Item style={{ marginBottom: 0 }}>
                                <Button
                                    type="primary" // Estilo principal
                                    htmlType="submit" // Define como botão de submit do form
                                    loading={loading} // Mostra estado de carregamento
                                    size="large"
                                    block // Ocupa toda a largura
                                >
                                    Entrar
                                </Button>
                            </Form.Item>
                        </Form>
                    </Spin>
                </Card>
            </Layout>
        </ConfigProvider>
    );
};

export default LoginPage;