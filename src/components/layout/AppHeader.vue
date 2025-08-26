<script setup>
import { useAuthStore } from '@/stores/authStore'
import { useCanvasStore } from '@/stores/canvasStore'
import { useRouter } from 'vue-router'
import { computed } from 'vue'

const authStore = useAuthStore()
const canvasStore = useCanvasStore()
const router = useRouter()

const viewModeText = computed(() => {
  return canvasStore.workspace.viewMode === 'edit' ? 'Ver Mockup' : 'Voltar a Editar'
})
</script>

<template>
  <header class="app-header">
    <div class="header-group left">
      <img
        src="/logo.svg"
        alt="Logo"
        class="logo"
        @click="router.push('/')"
        style="cursor: pointer"
      />
      <span class="divider"></span>
      <div class="document-title">MockupCreator Pro</div>
    </div>

    <div class="header-group center">
      <div class="unit-controls" v-if="canvasStore.workspace.viewMode === 'edit'">
        <button
          :class="{ active: canvasStore.workspace.rulers.unit === 'px' }"
          @click="canvasStore.setRulerUnit('px')"
        >
          PX
        </button>
        <button
          :class="{ active: canvasStore.workspace.rulers.unit === 'cm' }"
          @click="canvasStore.setRulerUnit('cm')"
        >
          CM
        </button>
        <button
          :class="{ active: canvasStore.workspace.rulers.unit === 'in' }"
          @click="canvasStore.setRulerUnit('in')"
        >
          IN
        </button>
      </div>
    </div>

    <div class="header-group right">
      <button @click="canvasStore.toggleViewMode()" class="btn btn-secondary">
        {{ viewModeText }}
      </button>
    </div>
  </header>
</template>

<style scoped>
.header-avatar {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--c-border);
}
.app-header {
  height: var(--header-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 var(--spacing-4);
  background-color: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  z-index: 100;
}
.header-group {
  display: flex;
  align-items: center;
  gap: var(--spacing-4);
}
.header-group.center {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}
.logo {
  height: 24px;
}
.divider {
  width: 1px;
  height: 24px;
  background-color: var(--c-border);
}
.document-title {
  font-weight: var(--fw-semibold);
  color: var(--c-text-primary);
}
.user-actions {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  border: 1px solid var(--c-border);
  padding: var(--spacing-1);
  border-radius: var(--radius-full);
}
.icon-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  border-radius: var(--radius-full);
}
.icon-btn:hover {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
}
.btn {
  display: flex;
  align-items: center;
  gap: var(--spacing-2);
  padding: var(--spacing-2) var(--spacing-4);
  border-radius: var(--radius-md);
  font-weight: var(--fw-semibold);
  transition: var(--transition-fast);
  border: none;
  cursor: pointer;
}
.btn-secondary {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
  border: 1px solid var(--c-border);
}
.btn-secondary:hover {
  border-color: var(--c-border-hover);
  background-color: var(--c-background);
}
.unit-controls {
  display: flex;
  background-color: var(--c-surface-dark);
  border-radius: var(--radius-md);
  padding: var(--spacing-1);
}
.unit-controls button {
  padding: var(--spacing-1) var(--spacing-3);
  font-size: var(--fs-xs);
  font-weight: var(--fw-semibold);
  color: var(--c-text-secondary);
  border-radius: var(--radius-sm);
  transition: var(--transition-fast);
}
.unit-controls button.active {
  background-color: var(--c-white);
  color: var(--c-primary);
  box-shadow: var(--shadow-sm);
}
.unit-controls button:not(.active):hover {
  color: var(--c-text-primary);
}
</style>
