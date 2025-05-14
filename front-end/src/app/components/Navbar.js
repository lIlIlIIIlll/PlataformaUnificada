// components/Navbar.js
"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Importar useRouter e usePathname
import { Input, Avatar, Space, Button, Dropdown, Menu, Typography, message } from 'antd';
import { BellOutlined, DownOutlined, SearchOutlined, CloseOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'; // Adicionar LogoutOutlined

const { Text } = Typography;

const Navbar = () => {
  const [isSearchVisible, setIsSearchVisible] = useState(false);
  const [isMobileSearchActive, setIsMobileSearchActive] = useState(false);
  const searchInputRef = useRef(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [userName, setUserName] = useState('Usuário'); // Estado para o nome do usuário, com valor padrão
  const router = useRouter(); // Hook do router
  const pathname = usePathname(); // Hook para obter o path atual

  // Função para logout
  const handleLogout = () => {
    console.log("NAVBAR: Executando handleLogout..."); // LOG ADICIONADO
    sessionStorage.removeItem('authToken');
    sessionStorage.removeItem('userData');
    message.info('Você foi desconectado.');
    router.push('/login'); // Redireciona para a página de login
  };

  // Efeito para verificar token e carregar dados do usuário no Client-Side
  useEffect(() => {
    // Esta função só executa no navegador
    if (typeof window !== 'undefined') {
        console.log(`NAVBAR: useEffect executando para o path: ${pathname}`); // LOG ADICIONADO

        const token = sessionStorage.getItem('authToken');
        console.log("NAVBAR: Token lido da sessionStorage:", token); // LOG ADICIONADO

        // 1. Verificar se o token existe
        if (!token) {
            // APENAS redireciona se NÃO ESTIVER na página de login já
            if (pathname !== '/login') {
                 console.log("NAVBAR: Token NÃO encontrado, redirecionando para /login..."); // LOG ADICIONADO
                // Limpa por garantia, caso userData ainda exista sem token
                sessionStorage.removeItem('userData');
                router.replace('/login'); // Use replace para não adicionar ao histórico
            } else {
                 console.log("NAVBAR: Token NÃO encontrado, mas já está na página de login."); // LOG ADICIONADO
            }
            return; // Interrompe o efeito se não houver token (ou se já estiver no login)
        }

        // Se chegou aqui, o token EXISTE
        console.log("NAVBAR: Token encontrado. Verificando userData..."); // LOG ADICIONADO

        // 2. Tentar pegar o nome do usuário de userData
        const userDataString = sessionStorage.getItem('userData');
        if (userDataString) {
            try {
                const userData = JSON.parse(userDataString);
                 console.log("NAVBAR: userData parseado com sucesso:", userData); // LOG ADICIONADO
                if (userData && userData.name) {
                    setUserName(userData.name);
                } else {
                    // Se userData não tem nome, usa um padrão ou busca na API
                    setUserName('Usuário');
                    console.warn("NAVBAR: userData encontrado, mas sem a propriedade 'name'.");
                    // Opcional: Fazer chamada API /users/me aqui para buscar nome atualizado se necessário
                }
            } catch (error) {
                console.error("NAVBAR: Erro ao parsear userData da sessionStorage:", error);
                // Limpa dados inválidos e redireciona
                handleLogout(); // Chama logout se userData estiver corrompido
            }
        } else {
            // Se não houver userData, mas houver token, algo está inconsistente
            // Pode ser que o login não salvou userData ou foi limpo por outra razão
            console.warn("NAVBAR: Token encontrado, mas userData não. Usando nome padrão.");
            setUserName('Usuário'); // Define um nome padrão
            // Opcional: Chamar handleLogout() ou buscar dados do usuário (/users/me) aqui.
            // handleLogout(); // MANTENHA COMENTADO a menos que queira deslogar neste caso
        }

        // Listener para verificar redimensionamento (mantido)
        const checkMobile = () => setIsMobileView(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }
  // Adiciona pathname às dependências. Isso garante que o efeito re-execute
  // se a rota mudar, o que pode ser útil, embora o problema principal
  // seja na primeira carga após o login.
  }, [router, pathname]);


  // --- Lógica de UI da Barra de Busca (mantida) ---
  const handleSearchIconClick = () => { if(isMobileView){setIsMobileSearchActive(true);} setIsSearchVisible(true); };
  const handleCloseMobileSearch = () => { setIsMobileSearchActive(false); setIsSearchVisible(false); };
  const handleSearchBlur = () => { if(!isMobileView&&!isMobileSearchActive){setTimeout(()=>setIsSearchVisible(false),150);} };
  useEffect(() => { if((isSearchVisible||isMobileSearchActive)&&searchInputRef.current){setTimeout(()=>{const inputElement=searchInputRef.current?.input||searchInputRef.current;if(inputElement&&typeof inputElement.focus==='function'){inputElement.focus();}},50);} },[isSearchVisible,isMobileSearchActive]);
  const showUserDropdown = !isMobileSearchActive;
  const showSearchIcon = (!isSearchVisible || isMobileView) && !isMobileSearchActive;
  const showSearchInput = isSearchVisible || isMobileSearchActive;
  const showBellIcon = !isMobileSearchActive;
  // --- Fim da Lógica de UI ---


  // Itens do Menu Dropdown (agora com ação de logout)
  const menuItems = [
      // { key: '1', label: 'Meu Perfil' }, // Adicione outras opções se necessário
      // { key: '2', label: 'Configurações' },
      // { type: 'divider' }, // Separador
      {
        key: 'logout',
        label: 'Sair',
        icon: <LogoutOutlined />, // Ícone de logout
        onClick: handleLogout // Chama a função de logout ao clicar
      },
  ];


  return (
    <div className={`navbar-container ${isMobileSearchActive ? 'mobile-search-active' : ''}`}
        style={{
            display: 'flex', alignItems: 'center', width: '100%', height: '100%', padding: '0 16px'
        }}>

      {/* Dropdown do Usuário (mostra nome do estado) */}
      {showUserDropdown && (
          <Dropdown menu={{ items: menuItems }} trigger={['click']}>
            <div style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', marginRight: '16px' }}>
              <Space size="small">
                {/* Idealmente, a URL do avatar também viria do userData */}
                <Avatar size={32} icon={<UserOutlined />} />
                <span className="navbar-user-name" style={{ fontWeight: 500, color: 'rgba(0, 0, 0, 0.85)', fontSize: '15px', whiteSpace: 'nowrap' }}>
                  {userName} {/* Usa o nome do estado */}
                </span>
                <DownOutlined style={{ fontSize: '11px', color: '#595959' }} />
              </Space>
            </div>
          </Dropdown>
      )}

       {/* Botão para fechar busca mobile */}
       {isMobileSearchActive && ( <Button icon={<CloseOutlined />} type="text" onClick={handleCloseMobileSearch} style={{ marginLeft: '-8px', marginRight: '8px' }} /> )}

      {/* Área de Busca */}
       {showSearchIcon && !isMobileSearchActive && (
          <Button type="text" icon={<SearchOutlined />} onClick={handleSearchIconClick} className="search-placeholder-button" style={{ color: '#595959' }} >
             <span className="search-placeholder-text">Pesquisa Rápida</span>
          </Button>
        )}
        {showSearchInput && (
             <Input
                ref={searchInputRef} placeholder="Pesquisa Rápida" onBlur={handleSearchBlur} className="search-input-field"
                style={{ width:isMobileSearchActive?'100%':(isSearchVisible?'300px':'0'), maxWidth:isMobileSearchActive?'none':'400px', opacity:isMobileSearchActive?1:(isSearchVisible?1:0), transition:'width 0.3s ease, opacity 0.3s ease', verticalAlign:'middle', marginRight:'auto', }}
                prefix={ (isMobileSearchActive || isSearchVisible) ? <SearchOutlined /> : null } />
        )}


      {/* Espaçador e Ícone de Notificação */}
      {!isMobileSearchActive && <div style={{ flexGrow: 1 }}></div>}
      {showBellIcon && ( <Button icon={<BellOutlined style={{ fontSize: '18px', color: '#595959' }}/>} type="text" shape="circle" style={{ border: 'none', marginLeft: '10px' }} /> )}

    </div>
  );
};

export default Navbar;