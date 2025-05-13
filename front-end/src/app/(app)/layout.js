// app/(app)/layout.js (NOVO LAYOUT PARA PÁGINAS DENTRO DO APP)
import React from 'react';
// Importe seu componente que contém Sider, Header, Content etc.
import AntdLayout from '../components/AntdLayout'; // Ajuste o caminho conforme sua estrutura

// Não precisa mais do AntdRegistry aqui, pois já está no RootLayout
// Não precisa mais do ConfigProvider aqui se já estiver no RootLayout

export default function AppLayout({ children }) {
  return (
    // O AntdLayout (com Sider, Header, etc.) agora envolve apenas
    // as páginas dentro do grupo (app)
    <AntdLayout>
      {children} {/* Páginas como dashboard, clientes, armarios serão renderizadas aqui */}
    </AntdLayout>
  );
}