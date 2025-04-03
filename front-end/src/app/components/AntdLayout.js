// components/AntdLayout.js
"use client";

import React from 'react';
import { Layout } from 'antd';
import Navbar from './Navbar'; // Seu componente Navbar
import Sidebar from './Sidebar'; // Seu componente Sidebar

const { Content, Header, Sider } = Layout;

const AntdLayout = ({ children }) => {
  return (
    // Layout Principal (Vertical)
    <Layout style={{ minHeight: '100vh' }}>

      {/* 1. Header (Navbar) no Topo Ocupando Largura Total */}
      <Header
        style={{
          padding: 0, // Remover padding padrão do Header do Antd
          background: '#fff',
          borderBottom: '1px solid #f0f0f0', // Linha divisória como na imagem
          // position: 'fixed', // Descomente se quiser header fixo
          // zIndex: 1, // Necessário se usar position: fixed
          // width: '100%', // Necessário se usar position: fixed
        }}
      >
        <Navbar /> {/* Renderiza seu componente Navbar aqui */}
      </Header>

      {/* 2. Layout Interno (Horizontal) Abaixo do Header */}
      <Layout> {/* Esse Layout conterá Sider + Content */}

        {/* 2a. Sider (Sidebar) na Esquerda */}
        <Sider
          width={200}
          theme="light" // Tema claro como na imagem
          style={{
            marginTop: '16px', // Margem ao redor do card de conteúdo
            marginBottom: '16px', // Margem ao redor do card de conteúdo
            marginLeft: '16px', // Margem ao redor do card de conteúdo
            marginRight: '8px', // Margem ao redor do card de conteúdo
            borderRadius: '8px',
            background: '#fff', // Fundo branco
            borderRight: '1px solid #f0f0f0', // Linha divisória
             // Opcional: fixar a sidebar se o conteúdo rolar
             // height: 'calc(100vh - 64px)', // Altura ajustada se header/sider forem fixos (subtrair altura do header)
             // position: 'fixed',
             // left: 0,
             // top: '64px', // Abaixo do header (ajuste se a altura do header mudar)
             // bottom: 0,
          }}
        >
          <Sidebar /> {/* Renderiza seu componente Sidebar aqui */}
        </Sider>

        {/* 2b. Layout para o Conteúdo Principal (Direita) */}
        <Layout
          style={{
             // paddingLeft: 200, // Adicionar padding esquerdo se a sidebar for fixa
             background: '#f0f2f5', // Fundo cinza para a área *ao redor* do card
          }}
        >
          {/* Content Area */}
          <Content
            style={{
              marginTop: '16px', // Margem ao redor do card de conteúdo
              marginBottom: '16px', // Margem ao redor do card de conteúdo
              marginLeft: '8px', // Margem ao redor do card de conteúdo
              marginRight: '16px', // Margem ao redor do card de conteúdo
              overflow: 'initial',
              // Não precisa de background aqui, pois o Layout pai já tem
            }}
          >
            {/* O "Card" Branco para o Conteúdo da Página */}
            <div
              style={{
                padding: 24,
                background: '#fff',
                minHeight: 'calc(100vh - 64px - 32px)', // Ajustar se header for fixo ou altura mudar
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {children} {/* Conteúdo da página */}
            </div>
          </Content>
          {/* Você pode adicionar um Footer aqui se precisar */}
          {/* <Footer style={{ textAlign: 'center' }}>Seu Footer</Footer> */}
        </Layout> {/* Fim do Layout do Conteúdo Principal */}

      </Layout> {/* Fim do Layout Interno (Sider + Content) */}

    </Layout> // Fim do Layout Principal
  );
};

export default AntdLayout;