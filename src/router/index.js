// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import WorkspaceView from '@/views/WorkspaceView.vue'
import AuthView from '@/views/AuthView.vue'
import AccountView from '@/views/AccountView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'workspace',
      component: WorkspaceView,
      meta: { requiresAuth: true },
    },
    {
      path: '/account',
      name: 'account',
      component: AccountView,
      meta: { requiresAuth: true },
    },
    {
      path: '/auth',
      name: 'auth',
      component: AuthView,
    },
  ],
})

// Lógica de Controle de Acesso baseada em Token JWT da URL
// Conforme a arquitetura definida.
router.beforeEach((to, from, next) => {
  const token = to.query.token || sessionStorage.getItem('editor-token')

  // Verifica se a rota requer autenticação
  if (to.matched.some((record) => record.meta.requiresAuth)) {
    // Se não houver token, o acesso é negado.
    if (!token) {
      next({ name: 'auth' })
    } else {
      // Se houver um token, armazena na sessionStorage para permitir recarregar a página
      // e o remove da URL para não ficar visível.
      sessionStorage.setItem('editor-token', token)
      next()
      // Remove o token da URL após o roteamento inicial
      if (to.query.token) {
        router.replace({ ...to, query: { ...to.query, token: undefined } })
      }
    }
  } else if (to.name === 'auth' && token) {
    // Se o usuário tem um token e tenta acessar a página de 'auth',
    // redireciona para o workspace.
    next({ name: 'workspace' })
  } else {
    // Para rotas que não requerem autenticação (como a própria 'auth').
    next()
  }
})

export default router
