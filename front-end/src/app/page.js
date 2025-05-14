'use client'

import styles from './page.module.css';
import Image from "next/image";
import React, { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation'; // Importar useRouter e usePathname

export default function Home() {
  const router = useRouter();
  const pathname = usePathname();

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
              router.replace('/dashboard')
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

  return (
    <div className={styles.page}>
      
    </div>
  );
}
