// src/main.js do seu projeto EDITOR (mjmockup)

import { createApp } from 'vue' // ou 'react', etc.
import App from './App.vue'
import { jwtDecode } from 'jwt-decode' // Importa a biblioteca

// Função para mostrar uma mensagem de erro e parar a execução
const renderAccessDenied = (message) => {
  const appDiv = document.querySelector('#app')
  if (appDiv) {
    appDiv.innerHTML = `
      <div style="font-family: sans-serif; text-align: center; padding: 40px; color: #ccc;">
        <h1>Acesso Negado</h1>
        <p>${message}</p>
      </div>
    `
  }
}

// Função principal que decide se a aplicação deve carregar
const initializeApp = () => {
  // 1. Pega o token da URL
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')

  if (!token) {
    return renderAccessDenied(
      'Link de acesso inválido ou ausente. Este recurso só pode ser acessado através da plataforma principal.',
    )
  }

  try {
    // 2. Decodifica o token
    const decoded = jwtDecode(token)
    const expirationTime = decoded.exp * 1000 // Converte para milissegundos

    // 3. Faz as verificações de segurança
    if (decoded.role !== 'vendedor') {
      return renderAccessDenied('Você não tem permissão para acessar este recurso.')
    }
    if (Date.now() >= expirationTime) {
      return renderAccessDenied(
        'Seu link de acesso expirou. Por favor, gere um novo na plataforma principal.',
      )
    }

    // 4. Se tudo estiver OK, monta a aplicação Vue
    console.log('Acesso autorizado para o vendedor:', decoded.sub)
    const app = createApp(App)
    // ... adicione outros plugins se seu editor usar (router, pinia, etc.)
    app.mount('#app')
  } catch (error) {
    console.error('Erro na validação do token:', error)
    return renderAccessDenied('Ocorreu um erro ao validar seu link de acesso.')
  }
}

// Inicia o processo
initializeApp()
