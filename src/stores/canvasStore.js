// src/stores/canvasStore.js
import { defineStore } from 'pinia'
import { ref, reactive, computed } from 'vue'
import { supabase } from '@/supabase'
import { v4 as uuidv4 } from 'uuid'
import { useImageAdjustmentsStore } from './imageAdjustmentsStore'

const MAX_RENDER_SIZE = 4096

export const useCanvasStore = defineStore('canvas', () => {
  const layers = ref([])
  const selectedLayerId = ref(null)
  const activeTool = ref('move')

  const workspace = reactive({
    pan: { x: 0, y: 0 },
    zoom: 1,
    viewMode: 'edit',
    isTransforming: false,
    document: { width: 1920, height: 1080 },
    rulers: { visible: true, unit: 'cm' },
    grid: { visible: true },
    previewIsInteractive: false,
    previewZoom: 1,
    previewRenderScale: 1,
    lasso: {
      active: false,
      points: [], // Agora armazena coordenadas do WORKSPACE
      boundingBox: { x: 0, y: 0, width: 0, height: 0 },
    },
    selection: {
      active: false,
      startX: 0,
      startY: 0,
      endX: 0,
      endY: 0,
      width: 0,
      height: 0,
      dimPxW: 0,
      dimPxH: 0,
      dimCmW: 0,
      dimCmH: 0,
    },
    transformStart: {
      layerId: null,
      type: null,
      initialScaleX: 1,
      initialScaleY: 1,
      initialRotation: 0,
      startMousePos: { x: 0, y: 0 },
      layerCenter: { x: 0, y: 0 },
      initialDistance: 1,
      initialAngle: 0,
    },
    isContextMenuVisible: false,
    contextMenuPosition: { x: 0, y: 0 },
    contextMenuTargetLayerId: null,
    isResizeModalVisible: false,
    isPreviewSidebarVisible: false,
    isSignatureModalVisible: false,
  })

  const selectedLayer = computed(() => layers.value.find((l) => l.id === selectedLayerId.value))
  const mockupLayer = computed(() => layers.value.find((l) => l.type === 'mockup' && l.visible))

  const rulerSource = computed(() => {
    const layer = selectedLayer.value || mockupLayer.value
    if (layer && layer.metadata.originalWidth) {
      const width = layer.metadata.originalWidth * layer.scaleX
      const height = layer.metadata.originalHeight * layer.scaleY
      return {
        width,
        height,
        dpi: layer.metadata.dpi || 96,
        x: layer.x - width / 2,
        y: layer.y - height / 2,
      }
    }
    return {
      width: workspace.document.width,
      height: workspace.document.height,
      dpi: 96,
      x: 0,
      y: 0,
    }
  })

  function createLayerObject(name, type, url, metadata = {}) {
    return reactive({
      id: uuidv4(),
      name,
      type,
      visible: true,
      opacity: 1,
      image: null,
      proxyImage: null,
      fullResImage: null,
      imageUrl: url,
      x: 0,
      y: 0,
      scaleX: 1,
      scaleY: 1,
      rotation: 0,
      metadata: { ...metadata, dpi: metadata?.dpi || 96, originalWidth: 0, originalHeight: 0 },
      originalFile: null,
      adjustments: {
        grayscale: 0,
        sepia: 0,
        saturate: 100,
        contrast: 100,
        brightness: 100,
        invert: 0,
        flipH: false,
        flipV: false,
      },
    })
  }

  function processAndAddLayer(newLayerData) {
    const { name, type, imageUrl, metadata, initialPosition, file } = newLayerData
    const newLayer = createLayerObject(name, type, imageUrl, metadata)

    if (file) {
      newLayer.originalFile = file
    }

    const img = new Image()
    img.crossOrigin = 'Anonymous'
    img.src = imageUrl
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0)
      
      newLayer.fullResImage = canvas
      newLayer.metadata.originalWidth = img.naturalWidth
      newLayer.metadata.originalHeight = img.naturalHeight

      if (img.naturalWidth > MAX_RENDER_SIZE || img.naturalHeight > MAX_RENDER_SIZE) {
        const ratio = Math.min(
          MAX_RENDER_SIZE / img.naturalWidth,
          MAX_RENDER_SIZE / img.naturalHeight,
        )
        const proxyCanvas = document.createElement('canvas')
        proxyCanvas.width = img.naturalWidth * ratio
        proxyCanvas.height = img.naturalHeight * ratio
        const proxyCtx = proxyCanvas.getContext('2d')
        proxyCtx.drawImage(img, 0, 0, proxyCanvas.width, proxyCanvas.height)
        newLayer.image = proxyCanvas
        newLayer.proxyImage = proxyCanvas
      } else {
        newLayer.image = canvas
        newLayer.proxyImage = canvas
      }

      if (type === 'mockup' && !initialPosition) {
        workspace.document.width = img.naturalWidth
        workspace.document.height = img.naturalHeight
      }

      if (initialPosition) {
        newLayer.x = initialPosition.x
        newLayer.y = initialPosition.y
      } else {
        newLayer.x = workspace.document.width / 2
        newLayer.y = workspace.document.height / 2
      }

      layers.value.push(newLayer)
      selectLayer(newLayer.id)
      if (!initialPosition) {
        frameLayer(newLayer.id)
      }
    }
  }

  async function getLayerBlob(layer) {
    if (!layer) return null
    if (layer.originalFile) {
      return layer.originalFile
    }
    if (layer.imageUrl) {
      try {
        const response = await fetch(layer.imageUrl)
        if (!response.ok) throw new Error('Network response was not ok.')
        return await response.blob()
      } catch (error) {
        console.error(`Erro ao baixar o ficheiro da camada ${layer.name}:`, error)
        return null
      }
    }
    return null
  }

  function calculateAndUpdateDimensions(widthInScreenPx, heightInScreenPx) {
    const selection = workspace.selection
    const scaleFactor =
      workspace.viewMode === 'edit' ? workspace.zoom : workspace.previewRenderScale
    if (scaleFactor === 0) return
    const selectionPxW = widthInScreenPx / scaleFactor
    const selectionPxH = heightInScreenPx / scaleFactor
    selection.dimPxW = selectionPxW
    selection.dimPxH = selectionPxH
    if (!mockupLayer.value || !mockupLayer.value.metadata.dpi) {
      selection.dimCmW = 0
      selection.dimCmH = 0
      return
    }
    const { metadata, scaleX, scaleY } = mockupLayer.value
    const totalMockupPxW = metadata.originalWidth * scaleX
    const totalMockupPxH = metadata.originalHeight * scaleY
    const totalMockupCmW = (totalMockupPxW / metadata.dpi) * 2.54
    const totalMockupCmH = (totalMockupPxH / metadata.dpi) * 2.54
    if (totalMockupPxW > 0) {
      selection.dimCmW = (selectionPxW / totalMockupPxW) * totalMockupCmW
    } else {
      selection.dimCmW = 0
    }
    if (totalMockupPxH > 0) {
      selection.dimCmH = (selectionPxH / totalMockupPxH) * totalMockupCmH
    } else {
      selection.dimCmH = 0
    }
  }

  function startLasso(point) {
    workspace.lasso.active = true
    workspace.lasso.points = [point] // Ponto já está em coordenadas de workspace
  }

  function updateLasso(point) {
    if (!workspace.lasso.active) return
    workspace.lasso.points.push(point) // Ponto já está em coordenadas de workspace
  }

  function endLasso() {
    workspace.lasso.active = false
  }

  function startSelection(mouse) {
    workspace.selection.active = true
    workspace.selection.startX = mouse.x
    workspace.selection.startY = mouse.y
    workspace.selection.endX = mouse.x
    workspace.selection.endY = mouse.y
    updateSelection(mouse)
  }

  function updateSelection(mouse) {
    if (!workspace.selection.active) return
    const sel = workspace.selection
    sel.endX = mouse.x
    sel.endY = mouse.y
    sel.width = Math.abs(sel.startX - sel.endX)
    sel.height = Math.abs(sel.startY - sel.endY)
    calculateAndUpdateDimensions(sel.width, sel.height)
  }

  function endSelection() {
    workspace.selection.active = false
  }

  function addLayer(assetData, type) {
    const url = getSupabaseImageUrl(`${type}s`, assetData.file_path)
    processAndAddLayer({
      name: assetData.name || 'Nova Camada',
      type: type,
      imageUrl: url,
      metadata: assetData.metadata || { dpi: 96 },
    })
  }

  function addLocalLayer(file, type, dataUrl, metadata) {
    processAndAddLayer({
      name: file.name,
      type: type,
      imageUrl: dataUrl,
      metadata: metadata || { dpi: 96 },
      file: file,
    })
  }

  function updateLayerProperties(id, properties) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index > -1) {
      layers.value[index] = { ...layers.value[index], ...properties }
    }
  }

  function resizeMockup(newWidthPx, newHeightPx) {
    if (!mockupLayer.value) return
    const newScaleX = newWidthPx / mockupLayer.value.metadata.originalWidth
    const newScaleY = newHeightPx / mockupLayer.value.metadata.originalHeight
    updateLayerProperties(mockupLayer.value.id, { scaleX: newScaleX, scaleY: newScaleY })
    workspace.document.width = newWidthPx
    workspace.document.height = newHeightPx
  }

  function showContextMenu(visible, position = { x: 0, y: 0 }, layerId = null) {
    workspace.isContextMenuVisible = visible
    workspace.contextMenuPosition = position
    workspace.contextMenuTargetLayerId = layerId
    if (visible && layerId) selectLayer(layerId)
  }

  function showResizeModal(visible) {
    workspace.isResizeModalVisible = visible
  }

  function frameLayer(layerId) {
    const layer = layers.value.find((l) => l.id === layerId)
    const canvasEl = document.getElementById('mainCanvas')
    if (!layer || !canvasEl || !layer.metadata.originalWidth) return
    const padding = 0.8
    const layerWidth = layer.metadata.originalWidth * layer.scaleX
    const layerHeight = layer.metadata.originalHeight * layer.scaleY
    const zoomX = (canvasEl.clientWidth * padding) / layerWidth
    const zoomY = (canvasEl.clientHeight * padding) / layerHeight
    const newZoom = Math.min(zoomX, zoomY, 2)
    workspace.zoom = newZoom
    workspace.pan.x = canvasEl.clientWidth / 2 - layer.x * newZoom
    workspace.pan.y = canvasEl.clientHeight / 2 - layer.y * newZoom
  }

  function setRulerUnit(unit) {
    workspace.rulers.unit = unit
  }

  function togglePreviewInteractivity() {
    workspace.previewIsInteractive = !workspace.previewIsInteractive
    if (!workspace.previewIsInteractive) endLasso()
  }

  function setPreviewZoom(zoom) {
    workspace.previewZoom = zoom
  }

  function selectLayer(id) {
    selectedLayerId.value = id
  }

  function startLayerTransform(config) {
    workspace.isTransforming = true
    const layer = layers.value.find((l) => l.id === config.layerId)
    if (!layer) return
    workspace.transformStart = {
      ...config,
      initialScaleX: layer.scaleX,
      initialScaleY: layer.scaleY,
      initialRotation: layer.rotation,
    }
  }

  function updateLayerTransform(currentMousePos) {
    const {
      type,
      layerId,
      initialScaleX,
      initialScaleY,
      initialRotation,
      startMousePos,
      layerCenter,
      initialDistance,
      initialAngle,
    } = workspace.transformStart
    const layer = layers.value.find((l) => l.id === layerId)
    if (!layer) return

    if (type === 'rotate') {
      const currentAngle = Math.atan2(
        currentMousePos.y - layerCenter.y,
        currentMousePos.x - layerCenter.x,
      )
      const angleDiff = currentAngle - initialAngle
      updateLayerProperties(layerId, { rotation: initialRotation + angleDiff })
    } else if (type.startsWith('resize-')) {
      const currentDistance = Math.sqrt(
        Math.pow(currentMousePos.x - layerCenter.x, 2) +
          Math.pow(currentMousePos.y - layerCenter.y, 2),
      )
      if (initialDistance === 0) return
      const scaleFactor = currentDistance / initialDistance
      const newScaleX = initialScaleX * scaleFactor
      const newScaleY = initialScaleY * scaleFactor
      updateLayerProperties(layerId, {
        scaleX: Math.max(0.01, newScaleX),
        scaleY: Math.max(0.01, newScaleY),
      })
    }
  }

  function endLayerTransform() {
    workspace.isTransforming = false
    workspace.transformStart.type = null
  }

  function deleteLayer(id) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index > -1) {
      const layerToDelete = layers.value[index]
      if (layerToDelete.imageUrl && layerToDelete.imageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(layerToDelete.imageUrl)
      }
      layers.value.splice(index, 1)
      if (selectedLayerId.value === id) {
        selectedLayerId.value =
          layers.value.length > 0 ? layers.value[Math.min(index, layers.value.length - 1)].id : null
      }
    }
  }

  function bringForward(id) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index < layers.value.length - 1) {
      const layer = layers.value.splice(index, 1)[0]
      layers.value.splice(index + 1, 0, layer)
    }
  }

  function sendBackward(id) {
    const index = layers.value.findIndex((l) => l.id === id)
    if (index > 0) {
      const layer = layers.value.splice(index, 1)[0]
      layers.value.splice(index - 1, 0, layer)
    }
  }

  function moveLayer(fromIndex, toIndex) {
    const [movedLayer] = layers.value.splice(fromIndex, 1)
    layers.value.splice(toIndex, 0, movedLayer)
  }

  function toggleViewMode() {
    if (workspace.viewMode === 'preview') {
      workspace.previewZoom = 1
    }

    workspace.viewMode = workspace.viewMode === 'edit' ? 'preview' : 'edit'

    if (workspace.viewMode === 'edit' && selectedLayer.value) {
      frameLayer(selectedLayer.value.id)
    }
  }

  function getSupabaseImageUrl(bucket, path) {
    if (!bucket || !path) return null
    const { data } = supabase.storage.from(bucket).getPublicUrl(path)
    return data.publicUrl
  }

  function setActiveTool(tool) {
    activeTool.value = tool
    if (tool !== 'lasso-select') {
      workspace.lasso.points = []
      workspace.lasso.active = false
    }
  }

  function updateWorkspace(properties) {
    Object.assign(workspace, properties)
  }

  function showPreviewSidebar(visible) {
    workspace.isPreviewSidebarVisible = visible
  }

  function showSignatureModal(visible) {
    workspace.isSignatureModalVisible = visible
  }

  function updateLayerAdjustments(layerId, newAdjustments) {
    const layer = layers.value.find((l) => l.id === layerId)
    if (layer) {
      layer.adjustments = { ...layer.adjustments, ...newAdjustments }
    }
  }

  function flipLayer(axis) {
    if (!selectedLayer.value) return
    const prop = axis === 'horizontal' ? 'flipH' : 'flipV'
    const currentFlip = selectedLayer.value.adjustments[prop]
    updateLayerAdjustments(selectedLayer.value.id, { [prop]: !currentFlip })
  }

  function rotateLayer(degrees) {
    if (!selectedLayer.value) return
    const newRotation = selectedLayer.value.rotation + (degrees * Math.PI) / 180
    updateLayerProperties(selectedLayer.value.id, { rotation: newRotation })
  }

  function duplicateLayer(layerId) {
    const sourceLayer = layers.value.find((l) => l.id === layerId)
    if (!sourceLayer) return

    const newLayer = reactive({
      ...JSON.parse(JSON.stringify(sourceLayer)),
      id: uuidv4(),
      name: `${sourceLayer.name} Cópia`,
      image: sourceLayer.image,
      proxyImage: sourceLayer.proxyImage,
      fullResImage: sourceLayer.fullResImage,
      originalFile: sourceLayer.originalFile,
    })

    const sourceIndex = layers.value.findIndex((l) => l.id === layerId)
    layers.value.splice(sourceIndex + 1, 0, newLayer)
    selectLayer(newLayer.id)
  }

  function _getLayerLocalCoordsFromWorkspace(workspacePoint, layer) {
    const cos = Math.cos(-layer.rotation)
    const sin = Math.sin(-layer.rotation)
    const dx = workspacePoint.x - layer.x
    const dy = workspacePoint.y - layer.y

    let layerX = (dx * cos - dy * sin) / layer.scaleX
    let layerY = (dx * sin + dy * cos) / layer.scaleY

    if (layer.adjustments.flipH) {
      layerX = -layerX
    }
    if (layer.adjustments.flipV) {
      layerY = -layerY
    }

    return {
      x: layerX + layer.metadata.originalWidth / 2,
      y: layerY + layer.metadata.originalHeight / 2,
    }
  }

  function _createPathFromLasso(sourceLayer) {
    if (!sourceLayer || workspace.lasso.points.length < 3) return null

    const path = new Path2D()
    workspace.lasso.points.forEach((p, index) => {
      // **CORREÇÃO AQUI**
      const localCoords = _getLayerLocalCoordsFromWorkspace(p, sourceLayer)
      if (index === 0) {
        path.moveTo(localCoords.x, localCoords.y)
      } else {
        path.lineTo(localCoords.x, localCoords.y)
      }
    })
    path.closePath()
    return path
  }

  function createImageFromSelection(sourceLayer) {
    const path = _createPathFromLasso(sourceLayer)
    if (!path) return

    const sourceImage = sourceLayer.fullResImage
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = sourceLayer.metadata.originalWidth
    tempCanvas.height = sourceLayer.metadata.originalHeight
    const tempCtx = tempCanvas.getContext('2d')

    tempCtx.clip(path)
    tempCtx.drawImage(sourceImage, 0, 0)

    processAndAddLayer({
      name: `${sourceLayer.name} Recorte`,
      type: sourceLayer.type,
      imageUrl: tempCanvas.toDataURL(),
      metadata: { dpi: sourceLayer.metadata.dpi },
      initialPosition: { x: sourceLayer.x, y: sourceLayer.y },
    })

    workspace.lasso.points = []
    workspace.lasso.active = false
  }

  function deleteSelection(layerId) {
    const sourceLayer = layers.value.find((l) => l.id === layerId)
    const path = _createPathFromLasso(sourceLayer)
    if (!path) return

    const originalCtx = sourceLayer.fullResImage.getContext('2d')
    originalCtx.save()
    originalCtx.globalCompositeOperation = 'destination-out'
    originalCtx.fill(path)
    originalCtx.restore()

    if (sourceLayer.proxyImage && sourceLayer.proxyImage.getContext) {
      const proxyCtx = sourceLayer.proxyImage.getContext('2d')
      proxyCtx.clearRect(0, 0, sourceLayer.proxyImage.width, sourceLayer.proxyImage.height)
      proxyCtx.drawImage(
        sourceLayer.fullResImage,
        0,
        0,
        sourceLayer.proxyImage.width,
        sourceLayer.proxyImage.height,
      )
    }

    sourceLayer.image = sourceLayer.fullResImage

    workspace.lasso.points = []
    workspace.lasso.active = false
  }

  function duplicateSelection(layerId) {
    const sourceLayer = layers.value.find((l) => l.id === layerId)
    createImageFromSelection(sourceLayer)
  }

  function cutoutSelection(layerId) {
    alert('Esta função ainda está em desenvolvimento. Por enquanto, ela irá duplicar a seleção.')
    duplicateSelection(layerId)
  }

  return {
    layers,
    selectedLayerId,
    selectedLayer,
    activeTool,
    workspace,
    mockupLayer,
    rulerSource,
    setRulerUnit,
    togglePreviewInteractivity,
    setPreviewZoom,
    startLasso,
    updateLasso,
    endLasso,
    addLayer,
    addLocalLayer,
    selectLayer,
    updateLayerProperties,
    setActiveTool,
    updateWorkspace,
    toggleViewMode,
    deleteLayer,
    bringForward,
    sendBackward,
    moveLayer,
    frameLayer,
    startSelection,
    updateSelection,
    endSelection,
    startLayerTransform,
    updateLayerTransform,
    endLayerTransform,
    showContextMenu,
    showResizeModal,
    resizeMockup,
    showPreviewSidebar,
    showSignatureModal,
    getLayerBlob,
    updateLayerAdjustments,
    flipLayer,
    rotateLayer,
    duplicateLayer,
    duplicateSelection,
    cutoutSelection,
    deleteSelection,
  }
})
