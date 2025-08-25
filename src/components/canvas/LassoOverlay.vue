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

  ctx.beginPath()
  const firstPoint = store.workspace.lasso.points[0]
  ctx.moveTo(firstPoint.x, firstPoint.y)
  for (let i = 1; i < store.workspace.lasso.points.length; i++) {
    const point = store.workspace.lasso.points[i]
    ctx.lineTo(point.x, point.y)
  }

  // Se o laço estiver finalizado (mas ainda visível), fecha o caminho
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

watch(
  () => store.workspace.lasso.points,
  () => {
    scheduleRender()
  },
  { deep: true },
)

watch(
  () => store.workspace.lasso.active,
  (isActive) => {
    if (!isActive && store.workspace.lasso.points.length > 0) {
      // Renderiza uma última vez com o caminho fechado
      scheduleRender()
    } else if (!isActive) {
      // Limpa o canvas se o laço for cancelado
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
