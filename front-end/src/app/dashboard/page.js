// src/app/dashboard/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import {
    Typography, Row, Col, Card, Statistic, Spin, Alert, Space, Tag,
    Select, Radio, Button, Empty
} from 'antd';
import {
    UserOutlined, PartitionOutlined, DollarCircleOutlined, FieldTimeOutlined,
    LineChartOutlined, PieChartOutlined, ExclamationCircleOutlined, FilterOutlined
} from '@ant-design/icons';
// IMPORTANTE: Usando Pie e Line
import { Pie, Line } from '@ant-design/charts';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/pt-br';
import { API_BASE_URL } from '../config/apiConfig';

// Configuração Dayjs
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.locale('pt-br');

const { Title } = Typography;
const { Option } = Select;

// --- Mapeamentos e Funções Auxiliares ---
const lockerStatusTextMap = {
    available: 'Disponível', occupied: 'Ocupado',
    maintenance: 'Manutenção', reserved: 'Reservado',
};
const mapGenderText = (gender) => {
    const lowerGender = gender?.toLowerCase().trim() || '';
    if (['masculino', 'm'].includes(lowerGender)) return 'Masculino';
    if (['feminino', 'f'].includes(lowerGender)) return 'Feminino';
    if (['outro', 'o', 'other'].includes(lowerGender)) return 'Outro';
    if (['prefiro não informar', 'não informado', 'nd', 'n/d'].includes(lowerGender) || !lowerGender) return 'Não informado';
    return 'Outro';
};

// --- Componente Principal do Dashboard ---
export default function DashboardPage() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [branches, setBranches] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('7d');
    const [allUsers, setAllUsers] = useState([]);
    const [allLockers, setAllLockers] = useState([]);
    const [allReservations, setAllReservations] = useState([]);

    const [dashboardData, setDashboardData] = useState({
        summary: { usersCount: 0, branchesCount: 0, lockersTotal: 0, reservationsActive: 0, totalRevenue: 0 },
        lockerStatusDistribution: [],
        reservationsOverTime: [],
        genderDistribution: [],
        ageDistribution: [],
        revenueOverTime: [],
    });

    // --- Busca Inicial ---
    const fetchInitialData = useCallback(async () => {
        setLoading(true);
        setError(null);
        console.log("Buscando dados iniciais...");
        try {
            const urls = [
                `${API_BASE_URL}/branches`,
                `${API_BASE_URL}/users`,
                `${API_BASE_URL}/lockers`,
                `${API_BASE_URL}/reservations?include=user,branch,lockers,payments`
            ];
            const responses = await Promise.all(urls.map(url => fetch(url)));

            const errors = [];
            for (let i = 0; i < responses.length; i++) {
                if (!responses[i].ok) {
                    const endpointName = urls[i].split('/').pop().split('?')[0];
                    const errorData = await responses[i].json().catch(() => ({ message: `Erro ${responses[i].status}` }));
                    errors.push(`${endpointName}: ${errorData.message || responses[i].statusText}`);
                }
            }
            if (errors.length > 0) {
                throw new Error(`Falha ao buscar dados: ${errors.join('; ')}`);
            }

            const [branchesData, usersData, lockersData, reservationsData] = await Promise.all(responses.map(res => res.json()));

            console.log("Dados brutos recebidos:", { branches: branchesData.length, users: usersData.length, lockers: lockersData.length, reservations: reservationsData.length });

            setBranches(branchesData || []);
            setAllUsers(usersData || []);
            setAllLockers(lockersData || []);
            setAllReservations(reservationsData || []);

            processAndSetDashboardData(usersData || [], branchesData || [], lockersData || [], reservationsData || [], 'all', '7d');

        } catch (err) {
            console.error("Erro na busca inicial:", err);
            setError(err.message || 'Erro ao carregar dados iniciais. Verifique a conexão e a API.');
            setBranches([]);
            setAllUsers([]);
            setAllLockers([]);
            setAllReservations([]);
            setDashboardData({
                summary: { usersCount: 0, branchesCount: 0, lockersTotal: 0, reservationsActive: 0, totalRevenue: 0 },
                lockerStatusDistribution: [], reservationsOverTime: [], genderDistribution: [],
                ageDistribution: [], revenueOverTime: [],
            });
        } finally {
            setTimeout(() => setLoading(false), 200);
        }
    }, []);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    // --- Processamento e Filtragem ---
    const processAndSetDashboardData = useCallback((
        users, branchesList, lockers, reservations,
        branchIdFilter, periodFilter
    ) => {
        console.log(`Processando dados para: Filial=${branchIdFilter}, Período=${periodFilter}`);
        setLoading(true);

        try {
            // 1. Definir Datas do Período
            const endDate = dayjs().endOf('day');
            let startDate;
            if (periodFilter === '7d') startDate = dayjs().subtract(6, 'day').startOf('day');
            else if (periodFilter === '1m') startDate = dayjs().subtract(1, 'month').startOf('day');
            else if (periodFilter === '1y') startDate = dayjs().subtract(1, 'year').startOf('day');
            else startDate = dayjs('1970-01-01');

            console.log(`Período definido: ${startDate.format('YYYY-MM-DD')} a ${endDate.format('YYYY-MM-DD')}`);

            // 2. Filtrar por Filial
            const filterByBranch = branchIdFilter !== 'all';
            const targetBranchId = filterByBranch ? parseInt(branchIdFilter, 10) : null;
            const filteredUsers = filterByBranch ? users.filter(u => u.branchId === targetBranchId) : users;
            const filteredLockers = filterByBranch ? lockers.filter(l => l.branchId === targetBranchId) : lockers;
            const filteredReservations = filterByBranch ? reservations.filter(r => r.branchId === targetBranchId) : reservations;

            console.log("Dados filtrados por filial:", { users: filteredUsers.length, lockers: filteredLockers.length, reservations: filteredReservations.length });

            // 3. Filtrar por Período
            const reservationsCreatedInPeriod = filteredReservations.filter(r => {
                const createdAt = dayjs(r.createdAt);
                return createdAt.isValid() && createdAt.isBetween(startDate, endDate, null, '[]');
            });
            const billableDataInPeriod = filteredReservations.reduce((acc, r) => {
                const paymentsInPeriod = (r.payments || []).filter(p => {
                    const paymentDate = dayjs(p.createdAt);
                    return paymentDate.isValid() && paymentDate.isBetween(startDate, endDate, null, '[]');
                });
                if (paymentsInPeriod.length > 0) {
                    const revenueFromPaymentsInPeriod = paymentsInPeriod.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
                    if (revenueFromPaymentsInPeriod > 0) {
                        acc.push({
                            reservationId: r.id,
                            date: dayjs(r.createdAt),
                            revenue: revenueFromPaymentsInPeriod
                        });
                    }
                }
                return acc;
            }, []);

            console.log("Dados filtrados por período:", { created: reservationsCreatedInPeriod.length, billable: billableDataInPeriod.length });

            // --- Agregações ---

            // A. Sumário
            const totalRevenueInPeriod = billableDataInPeriod.reduce((sum, item) => sum + item.revenue, 0);
            const summary = {
                usersCount: filteredUsers.length,
                branchesCount: filterByBranch ? 1 : branchesList.length,
                lockersTotal: filteredLockers.length,
                reservationsActive: filteredReservations.filter(r => r.paymentStatus === 'active').length,
                totalRevenue: totalRevenueInPeriod,
            };
            console.log("Sumário:", summary);

            // B. Status Armários (Pizza)
            const lockerStatusCounts = filteredLockers.reduce((acc, locker) => {
                const statusText = lockerStatusTextMap[locker.status] || locker.status;
                acc[statusText] = (acc[statusText] || 0) + 1; return acc;
            }, {});
            const lockerStatusDistribution = Object.entries(lockerStatusCounts)
                .filter(([status, count]) => count > 0)
                .map(([status, count]) => ({ type: status, value: count || 0 })); // Garante que value é número
            console.log("Distribuição Status Armários:", lockerStatusDistribution);

            // C. Gênero (Pizza)
            const genderCounts = filteredUsers.reduce((acc, user) => {
                const genderText = mapGenderText(user.gender);
                acc[genderText] = (acc[genderText] || 0) + 1; return acc;
            }, {});
            const genderDistribution = Object.entries(genderCounts)
                .filter(([gender, count]) => count > 0)
                .map(([gender, count]) => ({ type: gender, value: count || 0 })); // Garante que value é número
            console.log("Distribuição Gênero:", genderDistribution);

            // D. Idade (Pizza)
            const ageGroups = { '0-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0, 'N/D': 0 };
            filteredUsers.forEach(user => {
                if (user.dateOfBirth && dayjs(user.dateOfBirth).isValid()) {
                    const age = dayjs().diff(user.dateOfBirth, 'year');
                    if (age < 0) ageGroups['N/D']++;
                    else if (age <= 17) ageGroups['0-17']++;
                    else if (age <= 24) ageGroups['18-24']++;
                    else if (age <= 34) ageGroups['25-34']++;
                    else if (age <= 44) ageGroups['35-44']++;
                    else if (age <= 54) ageGroups['45-54']++;
                    else ageGroups['55+']++;
                } else {
                    ageGroups['N/D']++;
                }
            });
            const ageDistribution = Object.entries(ageGroups)
                .filter(([range, count]) => count > 0)
                .map(([ageRange, count]) => ({ type: ageRange, value: count || 0 })); // Garante que value é número
            console.log("Distribuição Idade:", ageDistribution);

            // E. Reservas e Faturamento ao Longo do Tempo (Linha)
            const timeUnit = periodFilter === '1y' ? 'month' : 'day';
            const dateKeyFormat = periodFilter === '1y' ? 'YYYY-MM' : 'YYYY-MM-DD';
            const displayFormat = periodFilter === '1y' ? 'MMM/YY' : 'DD/MM';

            const revenueMap = new Map();
            const reservationMap = new Map();
            const datePoints = new Map();

            let current = startDate.clone();
            while (current.isBefore(endDate) || current.isSame(endDate, timeUnit)) {
                const dateKey = current.format(dateKeyFormat);
                if (!datePoints.has(dateKey)) {
                    datePoints.set(dateKey, {
                        display: current.format(displayFormat),
                        sortKey: current.format('YYYY-MM-DD')
                    });
                    revenueMap.set(dateKey, 0);
                    reservationMap.set(dateKey, 0);
                }
                current = current.add(1, timeUnit);
            }

            billableDataInPeriod.forEach(item => {
                const dateKey = item.date.format(dateKeyFormat);
                if (revenueMap.has(dateKey)) {
                    revenueMap.set(dateKey, revenueMap.get(dateKey) + item.revenue);
                }
            });

            reservationsCreatedInPeriod.forEach(r => {
                const dateKey = dayjs(r.createdAt).format(dateKeyFormat);
                if (reservationMap.has(dateKey)) {
                    reservationMap.set(dateKey, reservationMap.get(dateKey) + 1);
                }
            });

            const sortedDateKeys = Array.from(datePoints.keys()).sort((a, b) => {
                return dayjs(datePoints.get(a).sortKey).unix() - dayjs(datePoints.get(b).sortKey).unix();
            });

            const revenueOverTime = sortedDateKeys.map(dateKey => ({
                date: datePoints.get(dateKey).display,
                value: revenueMap.get(dateKey) || 0, // Garante 0 se não houver valor
                category: 'Faturamento (R$)',
                sortKey: datePoints.get(dateKey).sortKey
            }));

            const reservationsOverTime = sortedDateKeys.map(dateKey => ({
                date: datePoints.get(dateKey).display,
                value: reservationMap.get(dateKey) || 0, // Garante 0 se não houver valor
                category: 'Reservas Criadas',
                sortKey: datePoints.get(dateKey).sortKey
            }));

            console.log("Reservas ao longo do tempo (pontos):", reservationsOverTime.length);
            console.log("Faturamento ao longo do tempo (pontos):", revenueOverTime.length);

            // 4. Atualizar Estado do Dashboard
            setDashboardData({ summary, lockerStatusDistribution, genderDistribution, ageDistribution, revenueOverTime, reservationsOverTime });

        } catch (err) {
            console.error("Erro ao processar dados:", err);
            setError(err.message || 'Erro ao processar dados do dashboard.');
            setDashboardData({
                summary: { usersCount: 0, branchesCount: 0, lockersTotal: 0, reservationsActive: 0, totalRevenue: 0 },
                lockerStatusDistribution: [], genderDistribution: [], ageDistribution: [],
                revenueOverTime: [], reservationsOverTime: [],
            });
        } finally {
            setTimeout(() => setLoading(false), 50);
        }
    }, []);

    // --- Handlers para Mudança de Filtro ---
    const handleBranchChange = (value) => {
        setSelectedBranchId(value);
        processAndSetDashboardData(allUsers, branches, allLockers, allReservations, value, selectedPeriod);
    };
    const handlePeriodChange = (e) => {
        const newPeriod = e.target.value;
        setSelectedPeriod(newPeriod);
        processAndSetDashboardData(allUsers, branches, allLockers, allReservations, selectedBranchId, newPeriod);
    };

    // --- Configurações Comuns dos Gráficos de Pizza ---
    const commonPieConfig = {
        angleField: 'value',
        colorField: 'type',
        radius: 0.85, // Ajuste para talvez dar mais espaço
        innerRadius: 0.6,
        label: {
            type: 'inner',
            offset: '-50%',
            content: '{value}', // Mostra o valor numérico
            style: { textAlign: 'center', fontSize: 12, fill: '#fff', fontWeight: 'bold' },
            autoRotate: false,
        },
        legend: { position: 'bottom', itemSpacing: 8 },
        tooltip: {
            formatter: (datum) => ({
                name: datum.type,
                // Tratamento defensivo para valor nulo ou indefinido no tooltip
                value: (datum.value === null || datum.value === undefined) ? '0' : `${datum.value}`
            }),
        },
        interactions: [{ type: 'element-active' }],
        padding: 'auto',
        // Aumentar padding inferior para legenda e geral para evitar cortes
        appendPadding: [10, 10, 20, 10], // top, right, bottom, left
    };

    // --- Configurações Específicas de Cada Gráfico ---
    const genderPieConfig = { ...commonPieConfig, data: dashboardData.genderDistribution };
    const agePieConfig = { ...commonPieConfig, data: dashboardData.ageDistribution };
    const lockerPieConfig = {
        ...commonPieConfig,
        data: dashboardData.lockerStatusDistribution,
        color: ({ type }) => {
            const statusMap = { 'Disponível': '#52c41a', 'Ocupado': '#f5222d', 'Manutenção': '#faad14', 'Reservado': '#1890ff'};
            return statusMap[type] || '#8c8c8c';
        }
    };

    // --- Configuração Comum dos Gráficos de Linha ---
     const commonLineConfig = (data, yAxisTitle, isCurrency = false) => ({
        data, xField: 'date', yField: 'value', seriesField: 'category',
        yAxis: {
            title: { text: yAxisTitle, style: { fontSize: 12 } },
            min: 0,
            label: { formatter: (v) => (isCurrency ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : v) }
        },
        xAxis: { title: false, tickLine: null, label: { style: { fontSize: 10 } } },
        point: { size: 3, shape: 'circle' }, lineStyle: { lineWidth: 2 }, smooth: true,
        tooltip: {
            showCrosshairs: true, shared: true,
            formatter: (datum) => ({
                name: datum.category,
                value: isCurrency ? `R$ ${datum.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (datum.value ?? 0) // Garante 0 se for null/undefined
            })
        },
        legend: false, padding: 'auto', appendPadding: [10, 15, 0, 15],
    });

    // --- Configurações Específicas dos Gráficos de Linha ---
    const reservationsLineConfig = commonLineConfig(dashboardData.reservationsOverTime, 'Qtd. Reservas');
    const revenueLineConfig = commonLineConfig(dashboardData.revenueOverTime, 'Valor (R$)', true);

    // --- Verificação de Dados Vazios para Gráficos ---
    const hasData = (dataArray) => dataArray && dataArray.length > 0 && dataArray.some(d => d.value > 0);

    // --- Renderização ---
    return (
        <>
            <Head><title>Dashboard - Plataforma Unificada</title></Head>

            <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                <Col>
                    <Title level={2} style={{ margin: 0 }}>Dashboard Geral</Title>
                </Col>
                <Col>
                    <Space wrap size="middle">
                        <Select
                             style={{ width: 200 }} value={selectedBranchId} onChange={handleBranchChange}
                             suffixIcon={<FilterOutlined />} loading={!branches.length && loading} disabled={loading}
                        >
                            <Option value="all">Todas as Filiais</Option>
                            {branches.map(branch => <Option key={branch.id} value={String(branch.id)}>{branch.name}</Option>)}
                        </Select>
                        <Radio.Group
                             options={[ { label: '7 dias', value: '7d' }, { label: '1 Mês', value: '1m' }, { label: '1 Ano', value: '1y' } ]}
                             onChange={handlePeriodChange} value={selectedPeriod} optionType="button" buttonStyle="solid" disabled={loading}
                        />
                    </Space>
                </Col>
            </Row>

            {loading && (
                 <div style={{ textAlign: 'center', padding: '60px 0' }}>
                     <Spin size="large" tip="Carregando e processando dados..." />
                 </div>
            )}
            {error && !loading && (
                 <Alert message="Erro ao Carregar Dashboard" description={error} type="error" showIcon icon={<ExclamationCircleOutlined />} style={{ marginBottom: '24px' }} />
            )}

            {!loading && !error && (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>

                    {/* 1. Cards Sumário */}
                    <Row gutter={[16, 16]}>
                         <Col xs={12} sm={12} md={6} lg={6}><Card bordered={false} bodyStyle={{padding: '16px'}}><Statistic title="Usuários" value={dashboardData.summary.usersCount} prefix={<UserOutlined />} loading={loading} /></Card></Col>
                         <Col xs={12} sm={12} md={6} lg={6}><Card bordered={false} bodyStyle={{padding: '16px'}}><Statistic title="Filiais" value={dashboardData.summary.branchesCount} prefix={<PartitionOutlined />} loading={loading} /></Card></Col>
                         <Col xs={12} sm={12} md={6} lg={6}><Card bordered={false} bodyStyle={{padding: '16px'}}><Statistic title="Faturamento Período" value={dashboardData.summary.totalRevenue} prefix={<DollarCircleOutlined />} precision={2} valueStyle={{ color: '#3f8600' }} loading={loading} /></Card></Col>
                         <Col xs={12} sm={12} md={6} lg={6}><Card bordered={false} bodyStyle={{padding: '16px'}}><Statistic title="Reservas Ativas" value={dashboardData.summary.reservationsActive} prefix={<FieldTimeOutlined />} valueStyle={{ color: '#1890ff' }} loading={loading} /></Card></Col>
                    </Row>

                    {/* 2. Demografia (Gênero e Idade - Ambos PIE) */}
                    <Row gutter={[16, 16]}>
                        {/* --- CARD CORRIGIDO: Removida altura fixa --- */}
                         <Col xs={24} md={12} lg={12}>
                             <Card
                                title={<span><PieChartOutlined style={{ marginRight: 8 }}/> Gênero dos Usuários</span>}
                                bordered={false}
                                // style={{ height: '400px', display: 'flex', flexDirection: 'column' }} // <-- ALTURA REMOVIDA
                                style={{ display: 'flex', flexDirection: 'column' }} // Mantém flex
                                bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', minHeight: '300px' }} // Adiciona minHeight
                            >
                                {hasData(dashboardData.genderDistribution) ? (
                                    <Pie {...genderPieConfig} />
                                ) : ( <Empty description="Sem dados de gênero" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                        {/* --- CARD CORRIGIDO: Removida altura fixa --- */}
                         <Col xs={24} md={12} lg={12}>
                             <Card
                                title={<span><PieChartOutlined style={{ marginRight: 8 }}/> Faixa Etária dos Usuários</span>}
                                bordered={false}
                                // style={{ height: '400px', display: 'flex', flexDirection: 'column' }} // <-- ALTURA REMOVIDA
                                style={{ display: 'flex', flexDirection: 'column' }} // Mantém flex
                                bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', minHeight: '300px' }} // Adiciona minHeight
                             >
                                {hasData(dashboardData.ageDistribution) ? (
                                    <Pie {...agePieConfig} />
                                ) : ( <Empty description="Sem dados de idade" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                    </Row>

                    {/* 3. Armários e Reservas */}
                    <Row gutter={[16, 16]}>
                         {/* --- CARD CORRIGIDO: Removida altura fixa --- */}
                        <Col xs={24} md={12} lg={8}>
                             <Card
                                title={<span><PieChartOutlined style={{ marginRight: 8 }}/> Status dos Armários</span>}
                                bordered={false}
                                // style={{ height: '400px', display: 'flex', flexDirection: 'column' }} // <-- ALTURA REMOVIDA
                                style={{ display: 'flex', flexDirection: 'column' }} // Mantém flex
                                bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', minHeight: '300px' }} // Adiciona minHeight
                             >
                                {hasData(dashboardData.lockerStatusDistribution) ? (
                                    <Pie {...lockerPieConfig} />
                                ) : ( <Empty description="Sem dados de armários" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                         {/* --- CARD CORRIGIDO: Removida altura fixa --- */}
                        <Col xs={24} md={12} lg={16}>
                             <Card
                                title={<span><LineChartOutlined style={{ marginRight: 8 }}/> Novas Reservas ({selectedPeriod === '7d' ? 'Últimos 7 dias' : selectedPeriod === '1m' ? 'Último Mês' : 'Último Ano'})</span>}
                                bordered={false}
                                // style={{ height: '400px', display: 'flex', flexDirection: 'column' }} // <-- ALTURA REMOVIDA
                                style={{ display: 'flex', flexDirection: 'column' }} // Mantém flex
                                bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px 0px 10px', minHeight: '300px' }} // Adiciona minHeight
                            >
                                {hasData(dashboardData.reservationsOverTime) ? (
                                    <Line {...reservationsLineConfig} />
                                ) : ( <Empty description="Sem reservas no período" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                    </Row>

                    {/* 4. Faturamento */}
                    <Row gutter={[16, 16]}>
                         {/* --- CARD CORRIGIDO: Removida altura fixa --- */}
                        <Col xs={24}>
                             <Card
                                title={<span><DollarCircleOutlined style={{ marginRight: 8 }}/> Faturamento ({selectedPeriod === '7d' ? 'Últimos 7 dias' : selectedPeriod === '1m' ? 'Último Mês' : 'Último Ano'})</span>}
                                bordered={false}
                                // style={{ height: '400px', display: 'flex', flexDirection: 'column' }} // <-- ALTURA REMOVIDA
                                style={{ display: 'flex', flexDirection: 'column' }} // Mantém flex
                                bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px 0px 10px', minHeight: '300px' }} // Adiciona minHeight
                            >
                                {hasData(dashboardData.revenueOverTime) ? (
                                    <Line {...revenueLineConfig} />
                                ) : ( <Empty description="Sem faturamento no período" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                    </Row>
                </Space>
            )}
        </>
    );
}