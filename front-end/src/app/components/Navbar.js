// components/Navbar.js
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input, Avatar, Space, Button, Dropdown, Menu, Typography } from 'antd';
import { BellOutlined, DownOutlined, SearchOutlined, CloseOutlined } from '@ant-design/icons';

const { Text } = Typography;

const Navbar = () => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const searchInputRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobileView(window.innerWidth < 768);
    if (typeof window !== 'undefined') { // Verifica se window existe (client-side)
      checkMobile();
      window.addEventListener('resize', checkMobile);
      return () => window.removeEventListener('resize', checkMobile);
    }
  }, []);


  const menuItems = [
    { key: '3', label: 'Sair' },
  ];

  const handleSearchIconClick = () => {
    if (isMobileView) {
      setIsMobileSearchActive(true);
    }
    setIsSearchVisible(true);
  };

  const handleCloseMobileSearch = () => {
    setIsMobileSearchActive(false);
    setIsSearchVisible(false);
  };

  const handleSearchBlur = () => {
    // Apenas fecha no desktop
    if (!isMobileView && !isMobileSearchActive) {
      // Pequeno delay para permitir clique em outros elementos antes de esconder
      setTimeout(() => setIsSearchVisible(false), 150);
    }
  };

  useEffect(() => {
    if ((isSearchVisible || isMobileSearchActive) && searchInputRef.current) {
      setTimeout(() => {
        // Antd Input.Search pode ter o input dentro de um span, ou direto
        const inputElement = searchInputRef.current?.input || searchInputRef.current;
        if (inputElement && typeof inputElement.focus === 'function') {
            inputElement.focus();
        }
      }, 50);
    }
  }, [isSearchVisible, isMobileSearchActive]);


  const showUserDropdown = !isMobileSearchActive;
  const showSearchIcon = (!isSearchVisible || isMobileView) && !isMobileSearchActive; // Mostrar ícone se não visível OU se mobile (e não ativo mobile)
  const showSearchInput = isSearchVisible || isMobileSearchActive;
  const showBellIcon = !isMobileSearchActive;

  return (
    <div className={`navbar-container ${isMobileSearchActive ? 'mobile-search-active' : ''}`}
        style={{
            display: 'flex',
            alignItems: 'center',
            // justifyContent removido, controle via flexGrow
            width: '100%',
            height: '100%',
            padding: '0 16px'
        }}>

      {/* 1. Lado Esquerdo: Dropdown (condicionalmente visível) */}
      {showUserDropdown && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginRight: '16px' }}> {/* Adiciona margem direita */}
              <Space size="small">
                <Avatar size={32} />
                <span className="navbar-user-name" style={{ fontWeight: 500, color: 'rgba(0, 0, 0, 0.85)', fontSize: '15px', whiteSpace: 'nowrap' }}>
                  Lázaro Jr.
                </span>
                <DownOutlined style={{ fontSize: '11px', color: '#595959' }} />
              </Space>
            </div>
          </Dropdown>
      )}

       {/* Botão para fechar busca mobile (renderizado antes da busca em mobile) */}
       {isMobileSearchActive && (
          <Button
              icon={<CloseOutlined />}
              type="text"
              onClick={handleCloseMobileSearch}
              style={{ marginLeft: '-8px', marginRight: '8px' }}
          />
      )}

      {/* 2. Área de Busca (logo após usuário em desktop, ocupa espaço em mobile) */}
      {/* Não precisa de div container extra aqui necessariamente */}
       {/* Ícone/Placeholder de Busca */}
       {showSearchIcon && !isMobileSearchActive && ( // Apenas mostra o placeholder se não estiver no modo de busca mobile
          <Button
              type="text"
              icon={<SearchOutlined />}
              onClick={handleSearchIconClick}
              className="search-placeholder-button"
              style={{ color: '#595959' }} // Estilo direto para simplificar
          >
             <span className="search-placeholder-text">Pesquisa Rápida</span>
          </Button>
        )}

        {/* Input de Busca */}
        {showSearchInput && (
             <Input
                ref={searchInputRef}
                placeholder="Pesquisa Rápida"
                onBlur={handleSearchBlur}
                className="search-input-field"
                style={{
                   // Em mobile ativo, ocupa todo espaço. Em desktop, largura fixa.
                   width: isMobileSearchActive ? '100%' : (isSearchVisible ? '300px' : '0'), // Usa 0 quando escondido em desktop para animação
                   maxWidth: isMobileSearchActive ? 'none' : '400px',
                   opacity: isMobileSearchActive ? 1 : (isSearchVisible ? 1 : 0), // Controla visibilidade/animação
                   transition: 'width 0.3s ease, opacity 0.3s ease', // Anima largura e opacidade
                   verticalAlign: 'middle',
                   marginRight: 'auto', // Empurra o resto para a direita em desktop
                }}
                // Adiciona o ícone de busca no modo mobile ativo ou quando visível em desktop
                prefix={ (isMobileSearchActive || isSearchVisible) ? <SearchOutlined /> : null }
            />
        )}


      {/* 3. Espaçador Flexível (só necessário se a busca não tiver marginRight: auto) */}
      {!isMobileSearchActive && <div style={{ flexGrow: 1 }}></div>}

      {/* 4. Lado Direito: Sino (condicionalmente visível) */}
      {showBellIcon && (
          <Button
            icon={<BellOutlined style={{ fontSize: '18px', color: '#595959' }}/>}
            type="text"
            shape="circle"
            style={{ border: 'none', marginLeft: '10px' }} // Adiciona margem esquerda
          />
       )}

    </div>
  );
};

export default Navbar;