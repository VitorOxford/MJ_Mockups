<script setup>
import AppHeader from '@/components/layout/AppHeader.vue'
import TopMenuBar from '@/components/layout/TopMenuBar.vue'
import ToolsSidebar from '@/components/layout/ToolsSidebar.vue'
import CanvasArea from '@/components/canvas/CanvasArea.vue'
import ToolControlsPanel from '@/components/controls/ToolControlsPanel.vue'
import LayersPanel from '@/components/layers/LayersPanel.vue'
import DimensionLines from '@/components/canvas/DimensionLines.vue'
import LassoOverlay from '@/components/canvas/LassoOverlay.vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { ref, computed, watch, nextTick } from 'vue'

import ContextMenu from '@/components/common/ContextMenu.vue'
import ResizeModal from '@/components/modals/ResizeModal.vue'
// ** IMPORTAÇÃO DOS NOVOS COMPONENTES **
import PreviewSidebar from '@/components/preview/PreviewSidebar.vue'
import SignatureModal from '@/components/modals/SignatureModal.vue'

const store = useCanvasStore()
const canvasAreaRef = ref(null)
const toolsSidebarRef = ref(null)

const isPanelVisible = computed(() => {
  const tool = store.activeTool
  if (!['move', 'zoom', 'rotate', 'zoom-preview'].includes(tool)) {
    return false
  }
  if (tool === 'zoom-preview') {
    return true
  }
  return !!store.selectedLayer
})

const panelPosition = computed(() => {
  if (!isPanelVisible.value || !toolsSidebarRef.value?.toolsGridRef) {
    return { top: 0, left: 0, visible: false }
  }
  const toolButton = toolsSidebarRef.value.toolsGridRef.querySelector(
    `[data-tool-id="${store.activeTool}"]`,
  )
  if (!toolButton) {
    return { top: 0, left: 0, visible: false }
  }
  const rect = toolButton.getBoundingClientRect()
  return {
    top: rect.top,
    left: rect.right + 12,
    visible: true,
  }
})

const artboardStyle = computed(() => ({
  transform: `scale(${store.workspace.previewZoom})`,
  transformOrigin: 'center center',
}))

function handleWrapperClick() {
  if (store.workspace.isContextMenuVisible) {
    store.showContextMenu(false)
  }
}

watch(
  () => store.workspace.viewMode,
  async (newMode) => {
    if (newMode === 'preview' || newMode === 'edit') {
      await nextTick()
      if (canvasAreaRef.value) {
        canvasAreaRef.value.resizeCanvas()
      }
    }
  },
)
</script>

<template>
  <div
    class="workspace-layout"
    :class="{ 'preview-mode': store.workspace.viewMode === 'preview' }"
    @click="handleWrapperClick"
  >
    <AppHeader />
    <TopMenuBar />

    <ToolsSidebar ref="toolsSidebarRef" :mode="store.workspace.viewMode" />

    <main class="canvas-container">
      <div v-if="store.workspace.viewMode === 'edit'" class="edit-mode-wrapper">
        <CanvasArea ref="canvasAreaRef">
          <LassoOverlay />
        </CanvasArea>
      </div>

      <div v-else class="preview-mode-wrapper">
        <div class="artboard-viewport">
          <div class="artboard" :style="artboardStyle">
            <CanvasArea ref="canvasAreaRef">
              <LassoOverlay />
            </CanvasArea>
            <DimensionLines />
          </div>
        </div>
        <button class="open-preview-sidebar-btn" @click="store.showPreviewSidebar(true)">
          &#9664; Detalhes e Aprovação
        </button>
      </div>

      <ToolControlsPanel v-if="isPanelVisible" :position="panelPosition" />

      <ContextMenu v-if="store.workspace.isContextMenuVisible" />
      <ResizeModal v-if="store.workspace.isResizeModalVisible" />

      <PreviewSidebar />
      <SignatureModal />
    </main>

    <LayersPanel v-if="store.workspace.viewMode === 'edit'" />
  </div>
</template>

<style scoped>
/* Adicione este novo estilo */
.open-preview-sidebar-btn {
  position: absolute;
  top: 50%;
  right: 0;
  transform: translateY(-50%) rotate(-90deg);
  transform-origin: bottom right;
  background-color: var(--c-primary);
  color: var(--c-white);
  border: none;
  padding: var(--spacing-2) var(--spacing-4);
  font-weight: var(--fw-semibold);
  cursor: pointer;
  border-top-left-radius: var(--radius-md);
  border-top-right-radius: var(--radius-md);
  z-index: 250;
}

/* O restante do CSS permanece igual */
.workspace-layout {
  display: grid;
  height: 100vh;
  width: 100vw;
  overflow: hidden;
  grid-template-columns: var(--sidebar-width) 1fr var(--assets-width);
  grid-template-rows: var(--header-height) 40px 1fr;
  grid-template-areas: 'header header header' 'top-menu top-menu top-menu' 'tools  canvas layers';
  position: relative;
}
.workspace-layout.preview-mode {
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: var(--header-height) 40px 1fr;
  grid-template-areas: 'header header' 'top-menu top-menu' 'tools  canvas';
}
.app-header {
  grid-area: header;
}
.tools-sidebar {
  grid-area: tools;
}
.canvas-container {
  grid-area: canvas;
}
.layers-panel {
  grid-area: layers;
}
.tools-sidebar,
.canvas-container,
.layers-panel {
  height: calc(100vh - var(--header-height) - 40px);
}
.canvas-container {
  overflow: hidden;
  background-color: var(--c-background);
  position: relative;
  display: flex;
}
.edit-mode-wrapper,
.preview-mode-wrapper {
  width: 100%;
  height: 100%;
}
.preview-mode-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--c-surface-dark);
}
.artboard-viewport {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
}
.artboard {
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 90vh;
  max-height: calc(100vh - var(--header-height) - 128px);
  box-shadow: var(--shadow-lg);
  background-color: var(--c-background);
  transition: transform 0.2s ease-out;
}
</style>
