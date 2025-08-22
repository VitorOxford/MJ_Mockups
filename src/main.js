// src/main.js do seu projeto EDITOR (mjmockups)

import { createApp } from 'vue';
import { createPinia } from 'pinia'; // Importa a função para criar o Pinia
import App from './App.vue';
import router from './router'; // Importa suas configurações de rota
import { jwtDecode } from 'jwt-decode';

// Seus estilos globais
import './assets/main.css';

// Função para mostrar erro (sem alterações)
const renderAccessDenied = (message) => {
  const appDiv = document.querySelector('#app');
  if (appDiv) {
    appDiv.innerHTML = `
      <div style="font-family: sans-serif; text-align: center; padding: 40px; color: #ccc;">
        <h1>Acesso Negado</h1>
        <p>${message}</p>
      </div>
    `;
  }
};

// Função principal
const initializeApp = () => {
  // Lógica do Token (que já está funcionando perfeitamente)
  const urlParams = new URLSearchParams(window.location.search);
  // Pega o token da sessionStorage se o usuário recarregar a página
  const token = urlParams.get('token') || sessionStorage.getItem('editor-token');

  if (!token) {
    return renderAccessDenied('Link de acesso inválido ou ausente. Este recurso só pode ser acessado através da plataforma principal.');
  }

  try {
    const decoded = jwtDecode(token);
    const expirationTime = decoded.exp * 1000;

    if (decoded.role !== 'vendedor') {
      return renderAccessDenied('Você não tem permissão para acessar este recurso.');
    }
    if (Date.now() >= expirationTime) {
      sessionStorage.removeItem('editor-token'); // Limpa token expirado
      return renderAccessDenied('Seu link de acesso expirou. Por favor, gere um novo na plataforma principal.');
    }

    // Se o token for válido, guarda na sessionStorage para o caso de refresh
    sessionStorage.setItem('editor-token', token);

    // --- A PARTE MAIS IMPORTANTE ---
    // Se tudo estiver OK, inicialize o Vue e conecte os plugins
    console.log('Acesso autorizado para o vendedor:', decoded.sub);

    const app = createApp(App);
    const pinia = createPinia();

    app.use(pinia);   // Registra o Pinia para que as stores funcionem
    app.use(router);  // Registra o Vue Router para que as rotas funcionem

    app.mount('#app'); // Monta o app DEPOIS de tudo estar pronto

  } catch (error) {
    console.error("Erro na validação do token:", error);
    sessionStorage.removeItem('editor-token');
    return renderAccessDenied('Ocorreu um erro ao validar seu link de acesso.');
  }
};

// Inicia o processo
initializeApp();
