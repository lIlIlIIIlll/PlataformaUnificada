// src/app/dashboard/page.js
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/navigation'; // Importar useRouter para redirecionamento
import {
    Typography, Row, Col, Card, Statistic, Spin, Alert, Space, Tag,
    Select, Radio, Empty
} from 'antd';
import {
    UserOutlined, PartitionOutlined, DollarCircleOutlined, FieldTimeOutlined,
    LineChartOutlined, PieChartOutlined, ExclamationCircleOutlined, FilterOutlined, ShopOutlined
} from '@ant-design/icons';
import { Pie, Line } from '@ant-design/plots';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import utc from 'dayjs/plugin/utc';
import 'dayjs/locale/pt-br';
import { API_BASE_URL } from '../../config/apiConfig';

// Configuração Dayjs
dayjs.extend(isBetween);
dayjs.extend(utc);
dayjs.locale('pt-br');

const { Title, Text } = Typography; // Adicionado Text
const { Option } = Select;

// --- Mapeamentos e Funções Auxiliares (Mantidas) ---
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
    const router = useRouter(); // Hook para redirecionamento

    // --- Estados ---
    const [loading, setLoading] = useState(true); // Começa true para verificar permissões
    const [error, setError] = useState(null);
    const [branches, setBranches] = useState([]); // Lista de filiais para o Select (se superadmin)

    // ** NOVO: Estados para dados do usuário logado **
    const [userRole, setUserRole] = useState(null); // 'superadmin' ou 'branch_admin'
    const [userManagedBranchIds, setUserManagedBranchIds] = useState([]); // IDs das filiais gerenciadas por branch_admin
    const [userManagedBranchNames, setUserManagedBranchNames] = useState([]); // Nomes das filiais gerenciadas
    const [isBranchAdminWithoutBranches, setIsBranchAdminWithoutBranches] = useState(false); // Flag para branch_admin sem filial

    // Estado do filtro selecionado na UI (usado apenas por superadmin)
    const [selectedBranchIdUI, setSelectedBranchIdUI] = useState('all');
    const [selectedPeriod, setSelectedPeriod] = useState('7d');

    // Estados para dados brutos e processados do dashboard
    const [allUsers, setAllUsers] = useState([]);
    const [allLockers, setAllLockers] = useState([]);
    const [allReservations, setAllReservations] = useState([]);
    const [dashboardData, setDashboardData] = useState({
        summary: { usersCount: 0, branchesCount: 0, lockersTotal: 0, reservationsActive: 0, totalRevenue: 0 },
        lockerStatusDistribution: [], reservationsOverTime: [], genderDistribution: [],
        ageDistribution: [], revenueOverTime: [],
    });

    // --- Efeito para buscar dados do usuário no carregamento ---
    useEffect(() => {
        console.log("Dashboard: Verificando dados do usuário no sessionStorage...");
        let role = null;
        let managedIds = [];
        let managedNames = [];
        let shouldFetchData = false; // Flag para controlar se a busca de dados deve ocorrer

        try {
            const userDataString = sessionStorage.getItem('userData');
            if (!userDataString) {
                console.error("Dashboard: userData não encontrado no sessionStorage. Redirecionando para login.");
                throw new Error("Usuário não autenticado."); // Erro para o catch lidar
            }

            const userData = JSON.parse(userDataString);
            if (!userData || !userData.role) {
                 console.error("Dashboard: userData inválido ou sem 'role'. Redirecionando para login.");
                throw new Error("Dados de usuário inválidos.");
            }

            role = userData.role;
            console.log("Dashboard: Papel do usuário encontrado:", role);
            setUserRole(role); // Define o role no estado

            if (role === 'branch_admin') {
                // Verificação específica para branch_admin
                if (!userData.branches || !Array.isArray(userData.branches) || userData.branches.length === 0) {
                    // É um branch_admin, mas não tem filiais associadas.
                    console.warn("Dashboard: 'branch_admin' sem filiais associadas ('branches') em userData. Acesso permitido, mas sem dados de filial.");
                    setUserManagedBranchIds([]); // Garante que está vazio
                    setUserManagedBranchNames([]);
                    setIsBranchAdminWithoutBranches(true); // Define a flag
                    // NÃO lança erro, permite que ele veja o dashboard (vazio)
                    // Não busca dados iniciais específicos de filial (fetchInitialData será chamado, mas processAndSet tratará)
                    shouldFetchData = true; // Ainda busca dados gerais e filiais
                } else {
                    // É um branch_admin com filiais
                    managedIds = userData.branches.map(b => b.id);
                    managedNames = userData.branches.map(b => b.name);
                    setUserManagedBranchIds(managedIds);
                    setUserManagedBranchNames(managedNames);
                    setIsBranchAdminWithoutBranches(false);
                    console.log("Dashboard: Filiais gerenciadas:", managedIds, managedNames);
                    // Força a seleção da primeira filial gerenciada na UI (mesmo que desabilitado)
                    if (managedIds.length > 0) {
                        setSelectedBranchIdUI(String(managedIds[0])); // Pré-seleciona a primeira
                    }
                    shouldFetchData = true; // Busca dados
                }
            } else if (role === 'superadmin') {
                 // Superadmin - não precisa de 'branches' no userData
                 console.log("Dashboard: Usuário é superadmin.");
                 setUserManagedBranchIds([]); // Superadmin não gerencia Ids específicos desta forma
                 setUserManagedBranchNames([]);
                 setIsBranchAdminWithoutBranches(false);
                 setSelectedBranchIdUI('all'); // Superadmin começa vendo todas
                 shouldFetchData = true; // Busca dados
            } else {
                 // Papel desconhecido
                 console.error(`Dashboard: Papel desconhecido encontrado: ${role}. Redirecionando.`);
                 throw new Error("Papel de usuário não reconhecido.");
            }

            // Se chegou aqui com um role válido, busca os dados necessários
            if (shouldFetchData) {
                fetchBranches(); // Busca todas as filiais para o select (superadmin usa, branch_admin pode precisar no futuro?)
                // Passa o role e os IDs gerenciados (pode ser vazio) para a busca inicial
                fetchInitialData(role, managedIds);
            } else {
                 // Se não deve buscar dados (ex: erro anterior não tratado), para o loading
                 setLoading(false);
            }

        } catch (err) {
            console.error("Dashboard: Erro CRÍTICO ao processar dados do usuário ou autenticação.", err);
            // Limpa storage e redireciona para login APENAS em caso de erro crítico
            sessionStorage.removeItem('authToken');
            sessionStorage.removeItem('userData');
            setError(err.message); // Mostra o erro na tela
            setLoading(false); // Para o loading
            // Adiciona um pequeno delay antes de redirecionar para o usuário ver a mensagem de erro, se houver
            setTimeout(() => {
                router.replace('/login');
            }, 1500); // Espera 1.5 segundos
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]); // Depende apenas do router para redirecionamento inicial

    // --- Busca Inicial de Dados (Users, Lockers, Reservations) ---
    const fetchInitialData = useCallback(async (currentUserRole, currentUserManagedIds) => {
        // Se não tivermos o role ainda, não busca nada (já verificado antes, mas dupla checagem)
        if (!currentUserRole) {
            console.log("Dashboard: fetchInitialData - Aguardando definição do papel do usuário.");
            setLoading(false); // Garante que o loading pare se chegou aqui sem role
            return;
        }

        // Define loading ANTES de começar a busca
        setLoading(true);
        setError(null); // Limpa erros anteriores
        console.log("Dashboard: fetchInitialData - Buscando dados (usuários, armários, reservas)... Role:", currentUserRole);

        try {
            const urls = [
                `${API_BASE_URL}/users?include=branch`,
                `${API_BASE_URL}/lockers?include=branch`,
                `${API_BASE_URL}/reservations?include=user,branch,lockers,payments`
            ];
            const responses = await Promise.all(urls.map(url => fetch(url)));

            // Tratamento de erro de fetch
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

            const [usersData, lockersData, reservationsData] = await Promise.all(responses.map(res => res.json()));

            console.log("Dashboard: fetchInitialData - Dados brutos recebidos:", { users: usersData?.length ?? 0, lockers: lockersData?.length ?? 0, reservations: reservationsData?.length ?? 0 });

            // Armazena os dados brutos
            setAllUsers(usersData || []);
            setAllLockers(lockersData || []);
            setAllReservations(reservationsData || []);

            // Determina o filtro de filial inicial com base no role e IDs gerenciados
            let initialBranchFilter = 'all'; // Default para superadmin
            if (currentUserRole === 'branch_admin') {
                if (currentUserManagedIds && currentUserManagedIds.length > 0) {
                    initialBranchFilter = String(currentUserManagedIds[0]); // Usa a primeira filial gerenciada
                } else {
                    // Se branch_admin sem filiais, o processAndSet vai tratar,
                    // mas podemos definir um filtro que não seleciona nada ('none'?)
                    // ou deixar 'all' e deixar o processAndSet zerar os dados.
                    // Deixar 'all' é mais simples, pois processAndSet já tem a lógica.
                    initialBranchFilter = 'all'; // Será tratado em processAndSet
                }
            }

             // Processa os dados com o filtro inicial correto e período padrão '7d'
             // Passa todos os dados brutos, filtros, role e IDs gerenciados
             processAndSetDashboardData(
                 usersData || [],
                 branches, // Passa a lista de branches carregada
                 lockersData || [],
                 reservationsData || [],
                 initialBranchFilter, // O filtro que a UI *deveria* mostrar inicialmente
                 selectedPeriod, // O período padrão ('7d')
                 currentUserRole,
                 currentUserManagedIds // Os IDs que o usuário realmente gerencia
             );


        } catch (err) {
            console.error("Dashboard: fetchInitialData - Erro na busca:", err);
            setError(err.message || 'Erro ao carregar dados iniciais.');
            setAllUsers([]);
            setAllLockers([]);
            setAllReservations([]);
            // Reseta dados do dashboard em caso de erro
            setDashboardData({ summary: { usersCount: 0, branchesCount: 0, lockersTotal: 0, reservationsActive: 0, totalRevenue: 0 }, lockerStatusDistribution: [], reservationsOverTime: [], genderDistribution: [], ageDistribution: [], revenueOverTime: [], });
            setLoading(false); // Para o loading em caso de erro
        }
        // finally { setLoading(false); } // Removido - setLoading(false) é chamado dentro de processAndSet
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [branches, selectedPeriod]); // Depende de `branches` e `selectedPeriod` (para reprocessar se mudarem?) - Reavaliar dependências

     // --- Busca de Filiais (para o Select do SuperAdmin) ---
     const fetchBranches = useCallback(async () => {
        console.log("Dashboard: Buscando lista de filiais para o seletor...");
        // Não define loading principal aqui
        try {
            const response = await fetch(`${API_BASE_URL}/branches`);
            if (!response.ok) throw new Error('Falha ao buscar filiais');
            const data = await response.json();
            setBranches(data || []);
            console.log("Dashboard: Lista de filiais carregada:", data?.length ?? 0);
        } catch (err) {
            console.error("Dashboard: Erro ao buscar filiais:", err);
            setError(prev => prev ? `${prev}; ${err.message}` : err.message); // Acumula erros
            setBranches([]);
        }
    }, []);

    // --- Processamento e Filtragem de Dados ---
    const processAndSetDashboardData = useCallback((
        users, branchesList, lockers, reservations,
        branchIdFilterUI, // O que está selecionado na UI ('all' ou ID)
        periodFilter,
        currentUserRole, // O role do usuário logado
        currentUserManagedIds // IDs que o branch_admin gerencia (pode ser [])
    ) => {
        // Não processa se os dados base não estiverem prontos ou o role não definido
         if (!currentUserRole || !users || !lockers || !reservations) {
             console.warn("Dashboard: processAndSet - Aguardando dados completos ou role para processar.");
             // Não define loading aqui, pois pode ser chamado múltiplas vezes
             return;
         }

         // ** LÓGICA CRÍTICA: Tratar branch_admin sem filiais **
         if (currentUserRole === 'branch_admin' && (!currentUserManagedIds || currentUserManagedIds.length === 0)) {
             console.warn("Dashboard: processAndSet - Branch admin sem filiais. Zerando dados do dashboard.");
             setDashboardData({ // Zera tudo
                 summary: { usersCount: 0, branchesCount: 0, lockersTotal: 0, reservationsActive: 0, totalRevenue: 0 },
                 lockerStatusDistribution: [], reservationsOverTime: [], genderDistribution: [],
                 ageDistribution: [], revenueOverTime: [],
             });
             setIsBranchAdminWithoutBranches(true); // Garante que a flag está correta
             setLoading(false); // Para o loading
             return; // Interrompe o processamento aqui
         }

         // Se chegou aqui, ou é superadmin ou é branch_admin COM filiais

         // Determina o ID da filial a ser *efetivamente* usada para filtrar os dados
         let effectiveBranchIdFilter;
         if (currentUserRole === 'superadmin') {
             effectiveBranchIdFilter = branchIdFilterUI; // Superadmin usa o que está na UI
         } else { // branch_admin com filiais
             // Branch admin SEMPRE vê apenas a(s) sua(s) filial(is).
             // Por simplicidade, vamos usar a primeira gerenciada se houver mais de uma.
             // A UI já deve estar travada na primeira filial dele.
             effectiveBranchIdFilter = String(currentUserManagedIds[0]);
         }

         console.log(`Dashboard: processAndSet - Processando para Role=${currentUserRole}, Filtro UI=${branchIdFilterUI}, Filtro Efetivo=${effectiveBranchIdFilter}, Período=${periodFilter}`);
         setLoading(true); // Mostra loading durante o processamento

        try {
            // 1. Definir Datas do Período (mantido)
            const endDate = dayjs().endOf('day');
            let startDate;
            if (periodFilter === '7d') startDate = dayjs().subtract(6, 'day').startOf('day');
            else if (periodFilter === '1m') startDate = dayjs().subtract(1, 'month').startOf('day');
            else if (periodFilter === '1y') startDate = dayjs().subtract(1, 'year').startOf('day');
            else startDate = dayjs('1970-01-01'); // 'all' period?
            // console.log(`Dashboard: Período definido: ${startDate.format('YYYY-MM-DD')} a ${endDate.format('YYYY-MM-DD')}`);

            // 2. Filtrar por Filial Efetiva
            const filterBySpecificBranch = effectiveBranchIdFilter !== 'all';
            const targetBranchId = filterBySpecificBranch ? parseInt(effectiveBranchIdFilter, 10) : null;

            // Filtra os dados brutos com base no targetBranchId determinado
             const filteredUsers = filterBySpecificBranch ? users.filter(u => u.branchId === targetBranchId) : users;
             const filteredLockers = filterBySpecificBranch ? lockers.filter(l => l.branchId === targetBranchId) : lockers;
             const filteredReservations = filterBySpecificBranch ? reservations.filter(r => r.branchId === targetBranchId) : reservations;

            // console.log("Dashboard: Dados filtrados por filial efetiva:", { users: filteredUsers.length, lockers: filteredLockers.length, reservations: filteredReservations.length });

            // 3. Filtrar por Período (Lógica Mantida)
            const reservationsCreatedInPeriod = filteredReservations.filter(r => { /* ... */ const createdAt = dayjs(r.createdAt); return createdAt.isValid() && createdAt.isBetween(startDate, endDate, null, '[]'); });
            const billableDataInPeriod = filteredReservations.reduce((acc, r) => { /* ... */ const paymentsInPeriod = (r.payments || []).filter(p => { const paymentDate = dayjs(p.createdAt); return paymentDate.isValid() && paymentDate.isBetween(startDate, endDate, null, '[]'); }); if (paymentsInPeriod.length > 0) { const revenueFromPaymentsInPeriod = paymentsInPeriod.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0); if (revenueFromPaymentsInPeriod > 0) { acc.push({ reservationId: r.id, date: dayjs(r.createdAt), revenue: revenueFromPaymentsInPeriod }); } } return acc; }, []);
            // console.log("Dashboard: Dados filtrados por período:", { created: reservationsCreatedInPeriod.length, billable: billableDataInPeriod.length });

            // --- Agregações (Lógica Mantida, opera nos dados filtrados) ---
            const totalRevenueInPeriod = billableDataInPeriod.reduce((sum, item) => sum + item.revenue, 0);
            const summary = {
                usersCount: filteredUsers.length,
                 branchesCount: filterBySpecificBranch ? 1 : (branchesList?.length ?? 0),
                lockersTotal: filteredLockers.length,
                reservationsActive: filteredReservations.filter(r => r.paymentStatus === 'active').length, // Rever status 'active'
                totalRevenue: totalRevenueInPeriod,
            };
            // console.log("Dashboard: Sumário calculado:", summary);

            const lockerStatusCounts = filteredLockers.reduce((acc, locker) => { const statusText = lockerStatusTextMap[locker.status] || locker.status; acc[statusText] = (acc[statusText] || 0) + 1; return acc; }, {});
            const lockerStatusDistribution = Object.entries(lockerStatusCounts).filter(([s, c]) => c > 0).map(([type, value]) => ({ type, value: value || 0 }));
            // console.log("Dashboard: Distribuição Status Armários:", lockerStatusDistribution);

            const genderCounts = filteredUsers.reduce((acc, user) => { const genderText = mapGenderText(user.gender); acc[genderText] = (acc[genderText] || 0) + 1; return acc; }, {});
            const genderDistribution = Object.entries(genderCounts).filter(([g, c]) => c > 0).map(([type, value]) => ({ type, value: value || 0 }));
            // console.log("Dashboard: Distribuição Gênero:", genderDistribution);

            const ageGroups = { '0-17': 0, '18-24': 0, '25-34': 0, '35-44': 0, '45-54': 0, '55+': 0, 'N/D': 0 };
            filteredUsers.forEach(user => { if (user.dateOfBirth && dayjs(user.dateOfBirth).isValid()) { const age = dayjs().diff(user.dateOfBirth, 'year'); if (age < 0) ageGroups['N/D']++; else if (age <= 17) ageGroups['0-17']++; else if (age <= 24) ageGroups['18-24']++; else if (age <= 34) ageGroups['25-34']++; else if (age <= 44) ageGroups['35-44']++; else if (age <= 54) ageGroups['45-54']++; else ageGroups['55+']++; } else { ageGroups['N/D']++; } });
            const ageDistribution = Object.entries(ageGroups).filter(([r, c]) => c > 0).map(([type, value]) => ({ type: type, value: value || 0 }));
            // console.log("Dashboard: Distribuição Idade:", ageDistribution);

            const timeUnit = periodFilter === '1y' ? 'month' : 'day';
            const dateKeyFormat = periodFilter === '1y' ? 'YYYY-MM' : 'YYYY-MM-DD';
            const displayFormat = periodFilter === '1y' ? 'MMM/YY' : 'DD/MM';
            const revenueMap = new Map(); const reservationMap = new Map(); const datePoints = new Map();
            let current = startDate.clone();
            while (current.isBefore(endDate) || current.isSame(endDate, timeUnit)) { const dateKey = current.format(dateKeyFormat); if (!datePoints.has(dateKey)) { datePoints.set(dateKey, { display: current.format(displayFormat), sortKey: current.format('YYYY-MM-DD') }); revenueMap.set(dateKey, 0); reservationMap.set(dateKey, 0); } current = current.add(1, timeUnit); }
            billableDataInPeriod.forEach(item => { const dateKey = item.date.format(dateKeyFormat); if (revenueMap.has(dateKey)) { revenueMap.set(dateKey, revenueMap.get(dateKey) + item.revenue); } });
            reservationsCreatedInPeriod.forEach(r => { const dateKey = dayjs(r.createdAt).format(dateKeyFormat); if (reservationMap.has(dateKey)) { reservationMap.set(dateKey, reservationMap.get(dateKey) + 1); } });
            const sortedDateKeys = Array.from(datePoints.keys()).sort((a, b) => dayjs(datePoints.get(a).sortKey).unix() - dayjs(datePoints.get(b).sortKey).unix());
            const revenueOverTime = sortedDateKeys.map(dateKey => ({ date: datePoints.get(dateKey).display, value: revenueMap.get(dateKey) || 0, category: 'Faturamento (R$)', sortKey: datePoints.get(dateKey).sortKey }));
            const reservationsOverTime = sortedDateKeys.map(dateKey => ({ date: datePoints.get(dateKey).display, value: reservationMap.get(dateKey) || 0, category: 'Reservas Criadas', sortKey: datePoints.get(dateKey).sortKey }));
            // console.log("Dashboard: Reservas ao longo do tempo (pontos):", reservationsOverTime.length);
            // console.log("Dashboard: Faturamento ao longo do tempo (pontos):", revenueOverTime.length);

            // 4. Atualizar Estado do Dashboard
            setDashboardData({ summary, lockerStatusDistribution, genderDistribution, ageDistribution, revenueOverTime, reservationsOverTime });
            setIsBranchAdminWithoutBranches(false); // Garante que a flag está desligada se processou dados

        } catch (err) {
            console.error("Dashboard: processAndSet - Erro ao processar dados:", err);
            setError(err.message || 'Erro ao processar dados do dashboard.');
             // Reseta dados do dashboard em caso de erro no processamento
             setDashboardData({ summary: { usersCount: 0, branchesCount: 0, lockersTotal: 0, reservationsActive: 0, totalRevenue: 0 }, lockerStatusDistribution: [], reservationsOverTime: [], genderDistribution: [], ageDistribution: [], revenueOverTime: [], });
        } finally {
            // Garante que o loading seja desativado após o processamento ou erro
            setLoading(false);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Removido dependências para evitar reprocessamento excessivo, confiar nos handlers


    // --- Handlers para Mudança de Filtro (UI) ---
    const handleBranchChange = (value) => {
        // Esta função só deve ser chamada/funcionar se userRole === 'superadmin'
        if (userRole !== 'superadmin') return;
        console.log("Dashboard: Superadmin selecionou filial:", value);
        setSelectedBranchIdUI(value); // Atualiza o estado da UI
         // Reprocessa os dados com a nova seleção de filial da UI (que é o filtro efetivo para superadmin)
        processAndSetDashboardData(allUsers, branches, allLockers, allReservations, value, selectedPeriod, userRole, userManagedBranchIds);
    };

    const handlePeriodChange = (e) => {
        const newPeriod = e.target.value;
        console.log("Dashboard: Usuário selecionou período:", newPeriod);
        setSelectedPeriod(newPeriod); // Atualiza o estado do período

        // Reprocessa os dados com o novo período.
        // O filtro de filial (branchIdFilterUI) já está no estado (selectedBranchIdUI).
        // A função processAndSetDashboardData determinará o filtro *efetivo* com base no role.
        processAndSetDashboardData(allUsers, branches, allLockers, allReservations, selectedBranchIdUI, newPeriod, userRole, userManagedBranchIds);
    };


    // --- Configurações Comuns dos Gráficos (Mantidas) ---
    const commonPieConfig = { angleField: 'value', colorField: 'type', radius: 0.8, innerRadius: 0.6, label: { type: 'inner', offset: '-50%', content: '{value}', style: { textAlign: 'center', fontSize: 14, fill: '#fff' }, }, interactions: [{ type: 'element-selected' }, { type: 'element-active' }], legend: { position: 'bottom', } };
    const genderPieConfig = { ...commonPieConfig, data: dashboardData.genderDistribution };
    const agePieConfig = { ...commonPieConfig, data: dashboardData.ageDistribution };
    const lockerPieConfig = { ...commonPieConfig, data: dashboardData.lockerStatusDistribution, color: ({ type }) => { const statusMap = { 'Disponível': '#52c41a', 'Ocupado': '#f5222d', 'Manutenção': '#faad14', 'Reservado': '#1890ff'}; return statusMap[type] || '#8c8c8c'; } };
    const commonLineConfig = (data, yAxisTitle, isCurrency = false) => ({ data, xField: 'date', yField: 'value', seriesField: 'category', yAxis: { title: { text: yAxisTitle, style: { fontSize: 12 } }, min: 0, label: { formatter: (v) => (isCurrency ? `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : v) } }, xAxis: { title: false, tickLine: null, label: { style: { fontSize: 10 } } }, point: { size: 3, shape: 'circle' }, lineStyle: { lineWidth: 2 }, smooth: true, tooltip: { showCrosshairs: true, shared: true, formatter: (datum) => ({ name: datum.category, value: isCurrency ? `R$ ${datum.value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : (datum.value ?? 0) }) }, legend: false, padding: 'auto', appendPadding: [10, 15, 0, 15], });
    const reservationsLineConfig = commonLineConfig(dashboardData.reservationsOverTime, 'Qtd. Reservas');
    const revenueLineConfig = commonLineConfig(dashboardData.revenueOverTime, 'Valor (R$)', true);
    const hasData = (dataArray) => dataArray && dataArray.length > 0 && dataArray.some(d => d.value > 0);

    // --- Renderização ---
    return (
        <>
            <Head><title>Dashboard - Plataforma Unificada</title></Head>

            <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
                <Col>
                    {/* Título Dinâmico */}
                    <Space align="center">
                         <Title level={2} style={{ margin: 0 }}>
                            {userRole === 'branch_admin' && userManagedBranchNames.length === 1 ? `Dashboard: ${userManagedBranchNames[0]}` : 'Dashboard Geral'}
                        </Title>
                        {userRole === 'branch_admin' && <Tag icon={<ShopOutlined/>} color="blue">Admin Filial</Tag>}
                        {userRole === 'superadmin' && <Tag color="purple">Super Admin</Tag>}
                    </Space>
                </Col>
                <Col>
                    <Space wrap size="middle">
                        {/* Seletor de Filial - Condicional e Desabilitado para branch_admin */}
                        <Select
                            style={{ width: 200 }}
                            value={selectedBranchIdUI} // Usa o estado da UI
                            onChange={handleBranchChange} // Handler só funciona se não estiver disabled
                            suffixIcon={<FilterOutlined />}
                            loading={userRole === 'superadmin' && !branches.length && loading} // Loading só se superadmin buscando filiais
                            disabled={loading || userRole === 'branch_admin'} // Desabilita se carregando ou branch_admin
                            aria-label={userRole === 'branch_admin' ? `Visualizando filial ${userManagedBranchNames[0] || 'Nenhuma'}` : "Selecionar Filial"}
                        >
                             {/* Opção 'Todas' apenas para superadmin */}
                             {userRole === 'superadmin' && (
                                <Option value="all">Todas as Filiais</Option>
                             )}
                             {/* Lista de filiais - superadmin vê todas, branch_admin vê a sua (mas desabilitado) */}
                             {/* Renderiza as opções mesmo para branch_admin para popular o select, mas ele estará disabled */}
                             {branches.map(branch => (
                                <Option key={branch.id} value={String(branch.id)}>{branch.name}</Option>
                             ))}
                             {/* Caso especial: branch_admin sem filial, mostra uma opção desabilitada */}
                             {userRole === 'branch_admin' && isBranchAdminWithoutBranches && (
                                 <Option value="none" disabled>Nenhuma filial associada</Option>
                             )}
                        </Select>

                        {/* Seletor de Período (Mantido) */}
                        <Radio.Group
                             options={[ { label: '7 dias', value: '7d' }, { label: '1 Mês', value: '1m' }, { label: '1 Ano', value: '1y' } ]}
                             onChange={handlePeriodChange}
                             value={selectedPeriod}
                             optionType="button"
                             buttonStyle="solid"
                             disabled={loading} // Desabilita durante o carregamento geral
                        />
                    </Space>
                </Col>
            </Row>

             {/* Indicador de Carregamento ou Erro */}
             {(loading || userRole === null) && ( // Mostra loading se dados estão carregando OU se o role ainda não foi definido
                 <div style={{ textAlign: 'center', padding: '60px 0' }}>
                     <Spin size="large" tip={userRole === null ? "Verificando permissões..." : "Carregando dados..."} />
                 </div>
             )}
             {error && !loading && ( // Mostra erro se houver E não estiver carregando
                 <Alert message="Erro ao Carregar Dashboard" description={error} type="error" showIcon icon={<ExclamationCircleOutlined />} style={{ marginBottom: '24px' }} />
             )}
             {/* Mensagem específica para branch_admin sem filial */}
             {!loading && !error && userRole === 'branch_admin' && isBranchAdminWithoutBranches && (
                 <Alert
                     message="Nenhuma Filial Associada"
                     description="Você está logado como administrador de filial, mas sua conta ainda não foi associada a nenhuma filial. Entre em contato com o superadministrador para obter acesso aos dados."
                     type="info" // Pode ser 'warning' ou 'info'
                     showIcon
                     style={{ marginBottom: '24px' }}
                 />
             )}


            {/* Conteúdo do Dashboard (Renderiza apenas se não estiver carregando, sem erro, com role definido E NÃO for branch_admin sem filial) */}
            {!loading && !error && userRole && !isBranchAdminWithoutBranches && (
                <Space direction="vertical" size="large" style={{ width: '100%' }}>

                     {/* 1. Cards Sumário */}
                     <Row gutter={[16, 16]}>
                         <Col xs={12} sm={12} md={6} lg={6}><Card bordered={false} bodyStyle={{padding: '16px'}}><Statistic title="Usuários" value={dashboardData.summary.usersCount} prefix={<UserOutlined />} loading={loading} /></Card></Col>
                         <Col xs={12} sm={12} md={6} lg={6}><Card bordered={false} bodyStyle={{padding: '16px'}}><Statistic title="Filiais Visíveis" value={dashboardData.summary.branchesCount} prefix={<PartitionOutlined />} loading={loading} /></Card></Col>
                         <Col xs={12} sm={12} md={6} lg={6}><Card bordered={false} bodyStyle={{padding: '16px'}}><Statistic title="Faturamento Período" value={dashboardData.summary.totalRevenue} prefix={<DollarCircleOutlined />} precision={2} valueStyle={{ color: '#3f8600' }} loading={loading} /></Card></Col>
                         <Col xs={12} sm={12} md={6} lg={6}><Card bordered={false} bodyStyle={{padding: '16px'}}><Statistic title="Reservas Ativas" value={dashboardData.summary.reservationsActive} prefix={<FieldTimeOutlined />} valueStyle={{ color: '#1890ff' }} loading={loading} /></Card></Col>
                     </Row>

                    {/* 2. Demografia (Gênero e Idade) */}
                    <Row gutter={[16, 16]}>
                         <Col xs={24} md={12} lg={12}>
                             <Card title={<span><PieChartOutlined style={{ marginRight: 8 }}/> Gênero dos Usuários</span>} bordered={false} style={{ display: 'flex', flexDirection: 'column' }} bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', minHeight: '300px' }} >
                                {hasData(dashboardData.genderDistribution) ? (<Pie {...genderPieConfig} />) : ( <Empty description="Sem dados de gênero" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                         <Col xs={24} md={12} lg={12}>
                             <Card title={<span><PieChartOutlined style={{ marginRight: 8 }}/> Faixa Etária dos Usuários</span>} bordered={false} style={{ display: 'flex', flexDirection: 'column' }} bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', minHeight: '300px' }} >
                                {hasData(dashboardData.ageDistribution) ? (<Pie {...agePieConfig} />) : ( <Empty description="Sem dados de idade" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                    </Row>

                    {/* 3. Armários e Reservas */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} md={12} lg={8}>
                             <Card title={<span><PieChartOutlined style={{ marginRight: 8 }}/> Status dos Armários</span>} bordered={false} style={{ display: 'flex', flexDirection: 'column' }} bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px', minHeight: '300px' }} >
                                {hasData(dashboardData.lockerStatusDistribution) ? (<Pie {...lockerPieConfig} />) : ( <Empty description="Sem dados de armários" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                        <Col xs={24} md={12} lg={16}>
                             <Card title={<span><LineChartOutlined style={{ marginRight: 8 }}/> Novas Reservas ({selectedPeriod === '7d' ? 'Últimos 7 dias' : selectedPeriod === '1m' ? 'Último Mês' : 'Último Ano'})</span>} bordered={false} style={{ display: 'flex', flexDirection: 'column' }} bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px 0px 10px', minHeight: '300px' }} >
                                {hasData(dashboardData.reservationsOverTime) ? (<Line {...reservationsLineConfig} />) : ( <Empty description="Sem reservas no período" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                    </Row>

                    {/* 4. Faturamento */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24}>
                             <Card title={<span><DollarCircleOutlined style={{ marginRight: 8 }}/> Faturamento ({selectedPeriod === '7d' ? 'Últimos 7 dias' : selectedPeriod === '1m' ? 'Último Mês' : 'Último Ano'})</span>} bordered={false} style={{ display: 'flex', flexDirection: 'column' }} bodyStyle={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '10px 20px 0px 10px', minHeight: '300px' }} >
                                {hasData(dashboardData.revenueOverTime) ? (<Line {...revenueLineConfig} />) : ( <Empty description="Sem faturamento no período" image={Empty.PRESENTED_IMAGE_SIMPLE}/> )}
                            </Card>
                        </Col>
                    </Row>
                </Space>
            )}
        </>
    );
}