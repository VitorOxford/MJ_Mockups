// src/main.js do seu projeto EDITOR (mjmockup)

import { createApp } from 'vue'
import App from './App.vue'
import { jwtDecode } from 'jwt-decode'

// --- ETAPA 1: IMPORTAR OS PLUGINS ---
import { createPinia } from 'pinia'
import { createVuetify } from 'vuetify'
import 'vuetify/styles' // Importa os estilos do Vuetify
import '@mdi/font/css/materialdesignicons.css' // Importa os ícones

// Função para mostrar erro (sem alterações)
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

// Função principal
const initializeApp = () => {
  // Lógica do Token (sem alterações, já está funcionando)
  const urlParams = new URLSearchParams(window.location.search)
  const token = urlParams.get('token')

  if (!token) {
    return renderAccessDenied('Link de acesso inválido ou ausente.')
  }

  try {
    const decoded = jwtDecode(token)
    const expirationTime = decoded.exp * 1000

    if (decoded.role !== 'vendedor') {
      return renderAccessDenied('Você não tem permissão para acessar este recurso.')
    }
    if (Date.now() >= expirationTime) {
      return renderAccessDenied('Seu link de acesso expirou.')
    }

    // --- ETAPA 2: INICIALIZAR E USAR OS PLUGINS ---
    console.log('Acesso autorizado para o vendedor:', decoded.sub)

    const app = createApp(App)
    const pinia = createPinia()
    const vuetify = createVuetify({
      theme: {
        defaultTheme: 'dark', // Assumindo que seu editor também usa tema escuro
      },
    })

    app.use(pinia) // Registra o Pinia
    app.use(vuetify) // Registra o Vuetify

    app.mount('#app') // Monta o app DEPOIS de registrar os plugins
  } catch (error) {
    console.error('Erro na validação do token:', error)
    return renderAccessDenied('Ocorreu um erro ao validar seu link de acesso.')
  }
}

// Inicia o processo
initializeApp()
