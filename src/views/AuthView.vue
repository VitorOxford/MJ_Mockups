<script setup></script>

<template>
  <div class="auth-container">
    <div class="auth-card">
      <h1>Acesso Negado</h1>
      <p>O acesso a esta página é restrito.</p>
      <p>Por favor, utilize o link gerado através do painel MJ Process para entrar no editor.</p>
    </div>
  </div>
</template>

<style scoped>
.auth-container {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  background-color: var(--c-background);
  font-family: var(--font-family-sans);
}
.auth-card {
  background: var(--c-surface);
  padding: 2.5rem;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-md);
  text-align: center;
  max-width: 450px;
  border-top: 4px solid #ff3333;
}
h1 {
  color: #ff3333;
  margin-bottom: 1rem;
  font-weight: var(--fw-bold);
  font-size: 1.8rem;
}
p {
  color: var(--c-text-secondary);
  line-height: 1.6;
  font-size: var(--fs-base);
}
</style>
