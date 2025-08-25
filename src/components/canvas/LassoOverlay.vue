<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()
const lassoCanvasRef = ref(null)
let ctx = null
let animationFrameId = null

const renderLasso = () => {
  if (!ctx) return
  const canvas = lassoCanvasRef.value
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (store.workspace.lasso.points.length < 2) return

  // Pega o pan e zoom para converter as coordenadas do workspace para a tela
  const { pan, zoom } = store.workspace

  ctx.beginPath()
  const firstPoint = store.workspace.lasso.points[0]
  ctx.moveTo(firstPoint.x * zoom + pan.x, firstPoint.y * zoom + pan.y)
  for (let i = 1; i < store.workspace.lasso.points.length; i++) {
    const point = store.workspace.lasso.points[i]
    ctx.lineTo(point.x * zoom + pan.x, point.y * zoom + pan.y)
  }

  if (!store.workspace.lasso.active) {
    ctx.closePath()
  }

  ctx.fillStyle = 'rgba(13, 153, 255, 0.2)'
  ctx.fill()
  ctx.strokeStyle = 'var(--c-primary)'
  ctx.lineWidth = 1.5
  ctx.setLineDash([4, 2])
  ctx.stroke()
}

const scheduleRender = () => {
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
  animationFrameId = requestAnimationFrame(renderLasso)
}

const resizeCanvas = () => {
  const canvas = lassoCanvasRef.value
  if (canvas && canvas.parentElement) {
    canvas.width = canvas.parentElement.clientWidth
    canvas.height = canvas.parentElement.clientHeight
    scheduleRender()
  }
}

onMounted(() => {
  const canvas = lassoCanvasRef.value
  if (canvas) {
    ctx = canvas.getContext('2d')
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId)
  }
})

// Observa as mudanças nos pontos do laço E no pan/zoom do workspace
watch(
  () => [store.workspace.lasso.points, store.workspace.pan, store.workspace.zoom],
  () => {
    scheduleRender()
  },
  { deep: true },
)

watch(
  () => store.workspace.lasso.active,
  (isActive) => {
    if (!isActive && store.workspace.lasso.points.length > 0) {
      scheduleRender()
    } else if (!isActive) {
      if (ctx) {
        const canvas = lassoCanvasRef.value
        ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
    }
  },
)
</script>

<template>
  <div class="lasso-overlay-container">
    <canvas ref="lassoCanvasRef"></canvas>
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
canvas {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
