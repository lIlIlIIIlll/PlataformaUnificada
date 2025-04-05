// components/AntdLayout.js
"use client";

import React, { useState, useEffect, useRef } from 'react'; // Importar useEffect e useRef
import { Layout, Button } from 'antd';
import { MenuFoldOutlined, MenuUnfoldOutlined } from '@ant-design/icons';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
// import { usePathname } from 'next/navigation'; // Uncomment if needed

const { Content, Header, Sider } = Layout;

const AntdLayout = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // --- NOVO: Refs para a Sider e o botão de toggle ---
  const siderRef = useRef(null);
  const toggleButtonRef = useRef(null);

  // Opcional: Fechar sidebar ao navegar em mobile
  // const pathname = usePathname();
  // useEffect(() => {
  //   if (isMobile && !collapsed) { // Only close if mobile and currently open
  //     setCollapsed(true);
  //   }
  // }, [pathname, isMobile, collapsed]); // Add collapsed to dependency


  // --- NOVO: useEffect para detectar cliques fora da sidebar ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Se a sidebar estiver fechada, não faz nada
      if (collapsed) {
        return;
      }

      // Verifica se o clique foi fora da Sider E fora do botão de toggle
      if (
        siderRef.current &&
        !siderRef.current.contains(event.target) &&
        toggleButtonRef.current &&
        !toggleButtonRef.current.contains(event.target)
      ) {
        // Fecha a sidebar apenas se o clique foi realmente fora
        // Não precisamos mais checar 'isMobile' aqui, pois se estiver colapsada, já saímos no início
        setCollapsed(true);
      }
    };

    // Adiciona o listener ao montar o componente
    // Usar 'mousedown' é geralmente melhor para prevenir que cliques rápidos
    // em elementos dentro da sidebar a fechem acidentalmente.
    document.addEventListener('mousedown', handleClickOutside);

    // Remove o listener ao desmontar o componente (cleanup)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [collapsed, setCollapsed]); // Depende do estado 'collapsed' e da função 'setCollapsed'


  return (
    <Layout style={{ minHeight: '100vh' }}>

      <Header
        style={{
          padding: 0,
          background: '#fff',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 10,
        }}
      >
        {/* --- NOVO: Adiciona ref ao botão --- */}
        <Button
          ref={toggleButtonRef} // <-- Attach ref here
          type="text"
          icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
          onClick={() => setCollapsed(!collapsed)}
          style={{
            fontSize: '16px',
            width: 64,
            height: 64,
            color: 'rgba(0, 0, 0, 0.65)'
          }}
        />
        <div style={{ flexGrow: 1 }}>
             <Navbar />
        </div>
      </Header>

      <Layout>

        {/* --- NOVO: Adiciona ref à Sider --- */}
        <Sider
          ref={siderRef} // <-- Attach ref here
          breakpoint="lg"
          collapsedWidth="0"
          collapsible
          trigger={null}
          collapsed={collapsed}
          onBreakpoint={(broken) => {
            setIsMobile(broken);
            setCollapsed(broken); // Collapse automatically on mobile breakpoint
          }}
          // Remove onCollapse manual prop if click outside handles everything,
          // OR keep it if you want the default AntD trigger (usually at the bottom) to work too.
          // For now, let's assume the button and click-outside are the main interactions.
          // onCollapse={(collapsedStatus, type) => {
          //   // Allow closing via default trigger ONLY if NOT on mobile to avoid conflicts
          //   if (!isMobile && type === 'responsive') { // Check type if needed
          //       setCollapsed(collapsedStatus);
          //   }
          // }}
          width={200} // <-- CORRIGIDO: A largura deve ser 200 aqui
          theme="light"
          style={{
            background: '#fff',
            overflow: 'auto',
            height: 'calc(100vh - 64px)',
            position: 'fixed',
            left: 0,
            top: '64px',
            bottom: 0,
            zIndex: 9,
            boxShadow: '2px 0 6px rgba(0, 21, 41, 0.02)',
            // Transitions are handled by AntD Sider itself for width/collapse
          }}
        >
          {/* --- Certifique-se que o conteúdo da Sidebar não captura o ref --- */}
          {/* Se Sidebar for um componente complexo, o ref pode precisar ser passado adiante ou aplicado a um wrapper div se necessário */}
          <Sidebar />
        </Sider>

        <Layout
          style={{
             background: '#f0f2f5',
             padding: '16px',
              // --- CORRIGIDO: Garante que a margem corresponda à largura real da Sider (200) ---
             marginLeft: collapsed ? 0 : 200,
             minHeight: 'calc(100vh - 64px)',
             transition: 'margin-left 0.2s', // Anima a mudança da margem
             flex: '1 1 auto', // Ocupa espaço restante
             // A largura é controlada implicitamente pelo flex e marginLeft, não precisa de 'width' aqui
          }}
        >
          <Content>
            <div
              style={{
                padding: 24,
                background: '#fff',
                minHeight: '100%',
                borderRadius: '8px',
                boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
              }}
            >
              {children}
            </div>
          </Content>
        </Layout>

      </Layout>

    </Layout>
  );
};

export default AntdLayout;