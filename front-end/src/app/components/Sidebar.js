// components/Sidebar.js
"use client"; // Necessário para hooks como usePathname

import React from 'react';
import { Menu } from 'antd'; // Importa o componente Menu do Ant Design
import {
  DashboardOutlined,  // Ícone para Dashboard
  CalendarOutlined,   // Ícone para Reservas
  LockOutlined,       // Ícone para Armários
  UserOutlined,       // Ícone para Clientes (alternativa: TeamOutlined)
  BarChartOutlined,   // Ícone para Relatórios
  SettingOutlined,    // Ícone para Administração
  // TeamOutlined,    // Ícone alternativo para Clientes
  // AuditOutlined,   // Ícone alternativo para Logs/Relatórios
} from '@ant-design/icons'; // Importa os ícones necessários
import Link from 'next/link'; // Importa Link para navegação no Next.js
import { usePathname } from 'next/navigation'; // Hook para obter o caminho atual

// Função auxiliar para criar itens de menu no formato esperado pelo Ant Design
function getItem(label, key, icon, children) {
  return {
    key,
    icon,
    children,
    label,
  };
}

const Sidebar = () => {
  const pathname = usePathname(); // Obtém o caminho da URL atual

  // Define os itens do menu com base na estrutura solicitada
  // O 'key' de cada item deve corresponder ao 'href' do Link para que o item ativo seja destacado
  const menuItems = [
    getItem(<Link href="/dashboard">Dashboard</Link>, '/dashboard', <DashboardOutlined />),
    getItem(<Link href="/reservas">Gerenciamento de Reservas</Link>, '/reservas', <CalendarOutlined />),
    getItem(<Link href="/armarios">Armários</Link>, '/armarios', <LockOutlined />),
    getItem(<Link href="/clientes">Clientes</Link>, '/clientes', <UserOutlined />), // ou <TeamOutlined />
    getItem(<Link href="/relatorios">Relatórios & Logs</Link>, '/relatorios', <BarChartOutlined />), // ou <AuditOutlined />
    getItem(<Link href="/admin">Administração</Link>, '/administracao', <SettingOutlined />),
    // Adicione mais itens se necessário seguindo este padrão
  ];

  // Determina a chave selecionada com base no pathname atual
  // Encontra o item cujo 'key' corresponde exatamente ao caminho atual
  const currentSelectedItem = menuItems.find(item => item.key === pathname);

  // Se não encontrar uma correspondência exata, tenta encontrar uma correspondência inicial
  // Útil se você tiver sub-rotas como /clientes/123 e quiser manter /clientes selecionado
  let selectedKeys = [];
  if (currentSelectedItem) {
      selectedKeys = [currentSelectedItem.key];
  } else {
      // Lógica opcional para sub-rotas: encontra o item cujo 'key' é o início do pathname
      const parentItem = menuItems.find(item => pathname.startsWith(item.key + '/') && item.key !== '/dashboard'); // Evita match parcial em '/'
      if (parentItem) {
          selectedKeys = [parentItem.key];
      } else if (pathname === '/') { // Caso especial para a raiz, seleciona o dashboard
          selectedKeys = ['/dashboard'];
      }
  }


  return (
    // O componente Sider pai (em AntdLayout.js ou similar) define a largura e o layout
    <Menu
      theme="light"             // Tema do menu (pode ser 'dark')
      mode="inline"             // Modo de exibição (vertical)
      selectedKeys={selectedKeys} // Chaves dos itens atualmente selecionados (para destaque)
      style={{ height: '100%', borderRight: 0, borderRadius: '8px' }} // Estilo básico
      items={menuItems}         // Array de itens do menu
    />
  );
};

export default Sidebar;