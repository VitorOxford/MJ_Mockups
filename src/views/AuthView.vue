<script setup>
import { ref } from 'vue'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'vue-router'

const authStore = useAuthStore()
const router = useRouter()
const email = ref('')
const password = ref('')
const isLogin = ref(true) // Alterna entre Login e Cadastro

async function handleSubmit() {
  try {
    if (isLogin.value) {
      await authStore.handleLogin({ email: email.value, password: password.value })
    } else {
      await authStore.handleSignUp({ email: email.value, password: password.value })
    }
    router.push('/')
  } catch (error) {
    alert(error.message)
  }
}
</script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>{{ isLogin ? 'Login' : 'Cadastro' }}</h1>
      <form @submit.prevent="handleSubmit">
        <input type="email" v-model="email" placeholder="seu@email.com" required />
        <input type="password" v-model="password" placeholder="Sua senha" required />
        <button type="submit">{{ isLogin ? 'Entrar' : 'Cadastrar' }}</button>
      </form>
      <a @click="isLogin = !isLogin">
        {{ isLogin ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login' }}
      </a>
    </div>
  </div>
</template>

<style scoped>
/* Adicione estilos para a tela de login aqui */
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
.auth-card {
  background: var(--color-surface);
  padding: 2rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
}
/* ... outros estilos */
</style>
