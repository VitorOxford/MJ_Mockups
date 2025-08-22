<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()

const isVisible = computed(() => {
  return store.activeTool === 'lasso-select' && store.workspace.lasso.active
})

// Constrói a string de pontos para o polígono SVG
const pointsString = computed(() => {
  if (!store.workspace.lasso.points.length) return ''
  return store.workspace.lasso.points.map((p) => `${p.x},${p.y}`).join(' ')
})
</script>

<template>
  <div v-if="isVisible" class="lasso-overlay-container">
    <svg width="100%" height="100%">
      <polygon :points="pointsString" class="lasso-path" />
    </svg>
  </div>
</template>

<style scoped>
.lasso-overlay-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 200;
}
.lasso-path {
  fill: rgba(13, 153, 255, 0.2);
  stroke: var(--c-primary);
  stroke-width: 1.5;
  stroke-dasharray: 4 2;
  stroke-linejoin: round;
  stroke-linecap: round;
}
</style>
