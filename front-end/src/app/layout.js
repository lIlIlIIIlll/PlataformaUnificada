// app/layout.js (NOVA VERSÃO MÍNIMA)
import React from 'react';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { ConfigProvider } from 'antd'; // Mantenha se precisar de ConfigProvider global
import ptBR from 'antd/locale/pt_BR';   // Mantenha se precisar de ConfigProvider global
import './styles/global.css'; // Mantenha seu CSS global aqui

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR"> {/* Ajuste o idioma se necessário */}
      <body style={{ padding: 0, margin: 0 }}>
        <AntdRegistry>
          {/* Mantenha o ConfigProvider aqui se ele for realmente global
              para TODAS as páginas, incluindo login */}
          <ConfigProvider locale={ptBR}>
            {children} {/* As páginas (ou layouts de grupo) serão renderizadas aqui */}
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}