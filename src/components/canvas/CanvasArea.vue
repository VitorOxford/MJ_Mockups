<script setup>
import { ref, onMounted, onUnmounted, watch, computed, defineExpose } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'
import HorizontalRuler from './HorizontalRuler.vue'
import VerticalRuler from './VerticalRuler.vue'
import SelectionOverlay from './SelectionOverlay.vue'
import BoundingBox from './BoundingBox.vue'

const store = useCanvasStore()
const canvasRef = ref(null)
const wrapperRef = ref(null)
const wrapperDimensions = ref({ width: 0, height: 0 })
let ctx = null

let isPanning = false
let isDraggingLayer = false
let isTransformingLayer = false
let isDrawingSelection = false
let dragStartOffset = { x: 0, y: 0 }
let lastPanPosition = { x: 0, y: 0 }

const gridStyle = computed(() => ({
  '--grid-position-x': `${store.workspace.pan.x}px`,
  '--grid-position-y': `${store.workspace.pan.y}px`,
  '--grid-size': `${50 * store.workspace.zoom}px`,
}))

function renderCanvas() {
  if (!ctx || !canvasRef.value) return
  const canvas = canvasRef.value
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  if (store.workspace.viewMode === 'preview') {
    renderPreviewMode(canvas)
  } else {
    renderEditMode(canvas)
  }
}

function renderEditMode(canvas) {
  ctx.save()
  ctx.translate(store.workspace.pan.x, store.workspace.pan.y)
  ctx.scale(store.workspace.zoom, store.workspace.zoom)

  for (const layer of store.layers) {
    if (!layer.visible || !layer.image) continue
    ctx.save()

    const adj = layer.adjustments
    const tempAdjStore = useImageAdjustmentsStore()
    const finalAdj =
      layer.id === tempAdjStore.targetLayerId && tempAdjStore.isModalVisible
        ? tempAdjStore.tempAdjustments
        : adj

    ctx.filter = [
      `grayscale(${finalAdj.grayscale || 0}%)`,
      `sepia(${finalAdj.sepia || 0}%)`,
      `saturate(${finalAdj.saturate || 100}%)`,
      `contrast(${finalAdj.contrast || 100}%)`,
      `brightness(${finalAdj.brightness || 100}%)`,
      `invert(${finalAdj.invert || 0}%)`,
    ].join(' ')

    ctx.translate(layer.x, layer.y)

    const scaleX = finalAdj.flipH ? -1 : 1
    const scaleY = finalAdj.flipV ? -1 : 1
    ctx.scale(scaleX, scaleY)

    ctx.rotate(layer.rotation)
    ctx.scale(layer.scale, layer.scale)
    ctx.globalAlpha = layer.opacity

    ctx.drawImage(
      layer.image,
      -layer.metadata.originalWidth / 2,
      -layer.metadata.originalHeight / 2,
      layer.metadata.originalWidth,
      layer.metadata.originalHeight,
    )
    ctx.restore()
  }
  ctx.restore()
}

// ================================================================= //
// NOVA RENDERIZAÇÃO DE PREVIEW COM TRANSFORMAÇÃO CORRETA            //
// ================================================================= //
function renderPreviewMode(canvas) {
  const mainMockup = store.mockupLayer
  if (!mainMockup || !mainMockup.image) return

  // 1. Prepara o fundo e calcula a geometria do mockup na tela
  ctx.save()
  ctx.fillStyle = getComputedStyle(document.documentElement)
    .getPropertyValue('--c-surface-dark')
    .trim()
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const padding = 0.9
  const finalMockupWidth = mainMockup.metadata.originalWidth * mainMockup.scale
  const finalMockupHeight = mainMockup.metadata.originalHeight * mainMockup.scale

  if (finalMockupWidth === 0 || finalMockupHeight === 0) {
    ctx.restore()
    return
  }

  const finalScale = Math.min(
    (canvas.width * padding) / finalMockupWidth,
    (canvas.height * padding) / finalMockupHeight,
  )
  store.updateWorkspace({ previewRenderScale: finalScale })

  const finalWidthOnScreen = finalMockupWidth * finalScale
  const finalHeightOnScreen = finalMockupHeight * finalScale
  const dx = (canvas.width - finalWidthOnScreen) / 2
  const dy = (canvas.height - finalHeightOnScreen) / 2

  // 2. Cria uma máscara de recorte na área do mockup
  ctx.beginPath()
  ctx.rect(dx, dy, finalWidthOnScreen, finalHeightOnScreen)
  ctx.clip()

  // 3. Renderiza as estampas usando createPattern com uma matriz de transformação precisa
  const patterns = store.layers.filter((l) => l.type === 'pattern' && l.visible && l.image)
  for (const layer of patterns) {
    const imageToRender = store.workspace.isTransforming ? layer.proxyImage : layer.fullResImage
    if (!imageToRender) continue

    const pattern = ctx.createPattern(imageToRender, 'repeat')

    const patternW = imageToRender.width
    const patternH = imageToRender.height

    // Constrói a matriz que combina a transformação do mockup na tela com a da estampa
    const matrix = new DOMMatrix()
      .translate(dx, dy) // Move para a posição do mockup na tela
      .scale(finalScale) // Aplica a escala do mockup na tela
      .translate(layer.x, layer.y) // Move para a posição central da estampa
      .rotate((layer.rotation * 180) / Math.PI) // Gira a estampa
      .scale(layer.scale) // Aplica a escala da estampa
      .translate(-patternW / 2, -patternH / 2) // **ESSENCIAL**: Compensa a origem do padrão para o centro

    pattern.setTransform(matrix)

    // Preenche a área do mockup com a estampa transformada
    ctx.fillStyle = pattern
    ctx.fillRect(dx, dy, finalWidthOnScreen, finalHeightOnScreen)
  }

  // 4. Renderiza as camadas de mockup (overlays) por cima
  const mockups = store.layers.filter((l) => l.type === 'mockup' && l.visible && l.image)
  for (const layer of mockups) {
    ctx.save()
    ctx.globalAlpha = layer.opacity
    ctx.drawImage(layer.image, dx, dy, finalWidthOnScreen, finalHeightOnScreen)
    ctx.restore()
  }

  ctx.restore() // Limpa a máscara de recorte
}

function initCanvas() {
  ctx = canvasRef.value.getContext('2d')
  resizeCanvas()
  setupEventListeners()
  renderCanvas()
}

function resizeCanvas() {
  const wrapper = wrapperRef.value
  if (!wrapper || !canvasRef.value) return

  const width = wrapper.offsetWidth
  const height = wrapper.offsetHeight

  if (canvasRef.value.width !== width || canvasRef.value.height !== height) {
    wrapperDimensions.value = { width, height }
    canvasRef.value.width = width
    canvasRef.value.height = height
    requestAnimationFrame(renderCanvas)
  }
}

function setupEventListeners() {
  const canvas = canvasRef.value
  window.addEventListener('resize', resizeCanvas)
  canvas.addEventListener('mousedown', handleMouseDown)
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
  document.addEventListener('mouseleave', handleMouseUp)
  canvas.addEventListener('wheel', handleWheel, { passive: false })
  canvas.addEventListener('contextmenu', handleContextMenu)
}

function cleanupEventListeners() {
  window.removeEventListener('resize', resizeCanvas)
  document.removeEventListener('mousemove', handleMouseMove)
  document.removeEventListener('mouseup', handleMouseUp)
  document.removeEventListener('mouseleave', handleMouseUp)
  const canvas = canvasRef.value
  if (canvas) {
    canvas.removeEventListener('mousedown', handleMouseDown)
    canvas.removeEventListener('wheel', handleWheel)
    canvas.removeEventListener('contextmenu', handleContextMenu)
  }
}

function onHandleMouseDown({ event, type }) {
  event.preventDefault()
  if (!store.selectedLayer) return

  isTransformingLayer = true
  document.body.style.cursor = window.getComputedStyle(event.target).cursor

  const startMousePos = { x: event.clientX, y: event.clientY }
  const layer = store.selectedLayer
  const layerCenter = getLayerScreenCenter(layer)
  const dx = startMousePos.x - layerCenter.x
  const dy = startMousePos.y - layerCenter.y

  store.startLayerTransform({
    layerId: layer.id,
    type: type,
    initialScale: layer.scale,
    initialRotation: layer.rotation,
    startMousePos: startMousePos,
    layerCenter: layerCenter,
    initialDistance: Math.sqrt(dx * dx + dy * dy),
    initialAngle: Math.atan2(dy, dx),
  })
}

function handleContextMenu(e) {
  e.preventDefault()
  const mouse = { x: e.offsetX, y: e.offsetY }
  const clickedLayer = getLayerAtPosition(mouse)
  if (clickedLayer) {
    store.showContextMenu(true, { x: e.clientX, y: e.clientY }, clickedLayer.id)
  }
}

function handleMouseDown(e) {
  if (store.workspace.isContextMenuVisible) store.showContextMenu(false)
  if (e.button !== 0) return
  const mouse = { x: e.offsetX, y: e.offsetY }
  if (store.activeTool === 'rect-select') {
    isDrawingSelection = true
    store.startSelection(mouse)
    return
  }
  if (store.activeTool === 'lasso-select') {
    isDrawingSelection = true
    store.startLasso(mouse)
    return
  }
  const clickedLayer = getLayerAtPosition(mouse)
  if (store.activeTool === 'move' && clickedLayer) {
    if (store.selectedLayerId !== clickedLayer.id) store.selectLayer(clickedLayer.id)
    isDraggingLayer = true
    store.workspace.isTransforming = true
    const layerCoords = screenToLayerCoords(mouse, clickedLayer)
    dragStartOffset = { x: layerCoords.x, y: layerCoords.y }
    return
  }
  isPanning = true
  lastPanPosition = { x: e.clientX, y: e.clientY }
  canvasRef.value.style.cursor = 'grabbing'
}

function handleMouseMove(e) {
  if (isTransformingLayer) {
    store.updateLayerTransform({ x: e.clientX, y: e.clientY })
    return
  }

  const mouse = { x: e.offsetX, y: e.offsetY }
  if (isDrawingSelection) {
    if (store.activeTool === 'rect-select') store.updateSelection(mouse)
    if (store.activeTool === 'lasso-select') store.updateLasso(mouse)
    return
  }

  if (isDraggingLayer && store.selectedLayer) {
    const workspaceCoords = screenToWorkspaceCoords(mouse)
    const newX = workspaceCoords.x - dragStartOffset.x / store.selectedLayer.scale
    const newY = workspaceCoords.y - dragStartOffset.y / store.selectedLayer.scale
    store.updateLayerProperties(store.selectedLayer.id, { x: newX, y: newY })
    return
  }
  if (isPanning) {
    const dx = e.clientX - lastPanPosition.x
    const dy = e.clientY - lastPanPosition.y
    store.updateWorkspace({ pan: { x: store.workspace.pan.x + dx, y: store.workspace.pan.y + dy } })
    lastPanPosition = { x: e.clientX, y: e.clientY }
  }
}

function handleMouseUp() {
  if (isTransformingLayer) {
    store.endLayerTransform()
  }
  if (store.workspace.isTransforming) {
    store.workspace.isTransforming = false
    requestAnimationFrame(renderCanvas)
  }
  if (isDrawingSelection) {
    if (store.activeTool === 'rect-select') store.endSelection()
    if (store.activeTool === 'lasso-select') store.endLasso()
  }
  isPanning = false
  isDraggingLayer = false
  isTransformingLayer = false
  isDrawingSelection = false
  document.body.style.cursor = 'default'
  if (canvasRef.value) {
    canvasRef.value.style.cursor = ['rect-select', 'lasso-select'].includes(store.activeTool)
      ? 'crosshair'
      : 'grab'
  }
}

function handleWheel(e) {
  e.preventDefault()
  if (store.workspace.viewMode === 'preview') return
  const zoomIntensity = 0.1
  const direction = e.deltaY < 0 ? 1 : -1
  const mouse = { x: e.offsetX, y: e.offsetY }
  const { pan, zoom } = store.workspace
  const worldX = (mouse.x - pan.x) / zoom
  const worldY = (mouse.y - pan.y) / zoom
  const newZoom = zoom * (1 + direction * zoomIntensity)
  const saneZoom = Math.max(0.02, Math.min(newZoom, 10))
  const newPanX = mouse.x - worldX * saneZoom
  const newPanY = mouse.y - worldY * saneZoom
  store.updateWorkspace({ zoom: saneZoom, pan: { x: newPanX, y: newPanY } })
}

function screenToWorkspaceCoords(screenCoords) {
  const { pan, zoom } = store.workspace
  return { x: (screenCoords.x - pan.x) / zoom, y: (screenCoords.y - pan.y) / zoom }
}

function screenToLayerCoords(screenCoords, layer) {
  const workspaceCoords = screenToWorkspaceCoords(screenCoords)
  const cos = Math.cos(-layer.rotation)
  const sin = Math.sin(-layer.rotation)
  const dx = workspaceCoords.x - layer.x
  const dy = workspaceCoords.y - layer.y
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}

function getLayerScreenCenter(layer) {
  const { pan, zoom } = store.workspace
  return { x: layer.x * zoom + pan.x, y: layer.y * zoom + pan.y }
}

function getLayerAtPosition(screenCoords) {
  for (let i = store.layers.length - 1; i >= 0; i--) {
    const layer = store.layers[i]
    if (!layer.image || !layer.visible) continue
    const layerCoords = screenToLayerCoords(screenCoords, layer)
    const halfW = (layer.metadata.originalWidth * layer.scale) / 2
    const halfH = (layer.metadata.originalHeight * layer.scale) / 2
    if (
      layerCoords.x >= -halfW &&
      layerCoords.x <= halfW &&
      layerCoords.y >= -halfH &&
      layerCoords.y <= halfH
    ) {
      return layer
    }
  }
  return null
}

watch(
  () => store.activeTool,
  (newTool) => {
    if (canvasRef.value) {
      if (['rect-select', 'lasso-select'].includes(newTool)) {
        canvasRef.value.style.cursor = 'crosshair'
      } else if (newTool === 'move') {
        canvasRef.value.style.cursor = 'grab'
      } else {
        canvasRef.value.style.cursor = 'default'
      }
    }
  },
)

watch(
  () => [store.layers, store.workspace],
  () => {
    requestAnimationFrame(renderCanvas)
  },
  { deep: true },
)

const adjustmentsStore = useImageAdjustmentsStore()
watch(
  () => [adjustmentsStore.tempAdjustments, adjustmentsStore.isModalVisible],
  () => {
    requestAnimationFrame(renderCanvas)
  },
  { deep: true },
)

onMounted(initCanvas)
onUnmounted(cleanupEventListeners)

defineExpose({ resizeCanvas })
</script>

<template>
  <div class="canvas-layout" :class="{ 'preview-mode': store.workspace.viewMode === 'preview' }">
    <template v-if="store.workspace.viewMode === 'edit' && store.workspace.rulers.visible">
      <div class="ruler-corner"></div>
      <HorizontalRuler :width="wrapperDimensions.width" />
      <VerticalRuler :height="wrapperDimensions.height" />
    </template>
    <div class="canvas-area-wrapper" ref="wrapperRef" :style="gridStyle">
      <div
        v-if="store.workspace.grid.visible && store.workspace.viewMode === 'edit'"
        class="grid-overlay"
      ></div>
      <canvas ref="canvasRef" id="mainCanvas"></canvas>
      <slot></slot>
      <BoundingBox v-if="store.selectedLayer" @handle-mouse-down="onHandleMouseDown" />
      <SelectionOverlay />
    </div>
  </div>
</template>

<style scoped>
.canvas-layout {
  display: grid;
  width: 100%;
  height: 100%;
  grid-template-columns: 30px 1fr;
  grid-template-rows: 30px 1fr;
}
.canvas-layout.preview-mode {
  grid-template-columns: 1fr;
  grid-template-rows: 1fr;
}
.canvas-layout.preview-mode .canvas-area-wrapper {
  grid-area: 1 / 1 / 2 / 2;
}
.ruler-corner,
.horizontal-ruler,
.vertical-ruler {
  z-index: 60;
}
.ruler-corner {
  grid-area: 1 / 1 / 2 / 2;
  background-color: var(--c-surface);
  border-bottom: 1px solid var(--c-border);
  border-right: 1px solid var(--c-border);
}
.canvas-area-wrapper {
  grid-area: 2 / 2 / 3 / 3;
  overflow: hidden;
  height: 100%;
  position: relative;
  background-color: var(--c-background);
}
#mainCanvas {
  position: absolute;
  top: 0;
  left: 0;
}
.grid-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image:
    repeating-linear-gradient(var(--c-border) 0 1px, transparent 1px 100%),
    repeating-linear-gradient(90deg, var(--c-border) 0 1px, transparent 1px 100%);
  background-size: var(--grid-size, 50px) var(--grid-size, 50px);
  background-position: var(--grid-position-x) var(--grid-position-y);
  pointer-events: none;
  opacity: 0.5;
}
</style>
