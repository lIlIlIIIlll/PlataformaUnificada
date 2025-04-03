// components/Navbar.js
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Input, Avatar, Space, Button, Dropdown, Menu, Typography } from 'antd';
import { BellOutlined, DownOutlined, SearchOutlined } from '@ant-design/icons';
import { Transition } from 'react-transition-group';

const { Text } = Typography;

const Navbar = () => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const searchInputRef = useRef(null);
  const placeholderRef = useRef(null);

  const menuItems = [
    { key: '1', label: 'Profile' }, // Simplificado para exemplo
    { key: '2', label: 'Settings' },
    { type: 'divider' },
    { key: '3', label: 'Logout' },
  ];

  const handleSearchClick = () => {
    setIsSearchVisible(true);
  };

  const handleSearchBlur = () => {
    setIsSearchVisible(false);
  };

  useEffect(() => {
    if (isSearchVisible && searchInputRef.current) {
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isSearchVisible]);

  // --- AJUSTE ANIMAÇÃO: FADE ---
  const duration = 200; // Duração da animação

  // Estilos base - agora focados em opacity
  const searchPlaceholderDefaultStyle = {
    transition: `opacity ${duration}ms ease-in-out`, // Transição apenas na opacidade
    opacity: 0, // Começa invisível por padrão (controlado pelo 'in' do Transition)
    display: 'inline-flex',
    alignItems: 'center',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  };

  const searchInputDefaultStyle = {
    transition: `opacity ${duration}ms ease-in-out`, // Transição apenas na opacidade
    opacity: 0, // Começa invisível por padrão
    width: 300, // Mantém a largura fixa
    verticalAlign: 'middle',
  };

  // Estilos para os estados da transição (fade)
  const transitionStylesFade = {
    // Estilos para placeholder e input serão os mesmos para opacity
    entering: { opacity: 1, pointerEvents: 'auto' }, // Fade in, torna interativo
    entered:  { opacity: 1, pointerEvents: 'auto' }, // Totalmente visível
    exiting:  { opacity: 0, pointerEvents: 'none' }, // Fade out, torna não interativo
    exited:   { opacity: 0, pointerEvents: 'none' }, // Totalmente invisível
  };

  return (
    <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        width: '100%',
        height: '100%',
        padding: '0 24px'
      }}>

      {/* 1. Lado Esquerdo: Dropdown */}
      <Dropdown menu={{ items: menuItems }} trigger={['click']}>
        <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer' }}>
          <Space size="small">
            <Avatar size={32} />
            <span style={{ fontWeight: 500, color: 'rgba(0, 0, 0, 0.85)', fontSize: '15px', whiteSpace: 'nowrap' }}>
              Lázaro Jr.
            </span>
            <DownOutlined style={{ fontSize: '11px', color: '#595959' }} />
          </Space>
        </div>
      </Dropdown>

      {/* 2. Meio: Área de Busca com Animação de Fade */}
      {/* Container relativo para posicionar os elementos de transição */}
      <div style={{ position: 'relative', height: '32px', width: '1000px', display: 'flex', alignItems: 'center' }}> {/* Altura e largura fixas para conter ambos */}

        {/* Placeholder (Ícone + Texto) com Animação */}
        {/* Removido mountOnEnter/unmountOnExit */}
        <Transition nodeRef={placeholderRef} in={!isSearchVisible} timeout={duration} >
          {state => (
            <div
              ref={placeholderRef}
              style={{
                ...searchPlaceholderDefaultStyle,
                ...transitionStylesFade[state],
                position: 'absolute', // Posiciona sobre o input
              }}
              onClick={handleSearchClick}
            >
              <SearchOutlined style={{ color: '#595959', marginRight: '6px' }}/>
              <Text style={{ color: '#595959' }}>Pesquisa Rápida</Text>
            </div>
          )}
        </Transition>

        {/* Input de Busca com Animação */}
        {/* Removido mountOnEnter/unmountOnExit */}
        <Transition nodeRef={searchInputRef} in={isSearchVisible} timeout={duration}>
           {state => (
             <Input
                ref={searchInputRef}
                placeholder="Pesquisa Rápida"
                onBlur={handleSearchBlur}
                style={{
                  ...searchInputDefaultStyle,
                  ...transitionStylesFade[state],
                  width:'800px'
                   // Não precisa de position: absolute aqui, pois o placeholder ficará sobre ele
                }}
            />
           )}
        </Transition>

      </div>

      {/* 3. Lado Direito: Sino */}
      <Button
        icon={<BellOutlined style={{ fontSize: '18px', color: '#595959' }}/>}
        type="text"
        shape="circle"
        style={{ border: 'none' }}
      />

    </div>
  );
};

export default Navbar;