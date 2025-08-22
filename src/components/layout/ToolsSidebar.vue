<script setup>
import { ref, watch, computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import UploadModal from '@/components/modals/UploadModal.vue'

const props = defineProps({
  mode: {
    type: String,
    default: 'edit',
  },
})

const store = useCanvasStore()
const emit = defineEmits(['show-controls'])
const isUploadModalVisible = ref(false)
const toolsGridRef = ref(null)

const editTools = [
  {
    id: 'move',
    name: 'Mover (V)',
    icon: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
    requiresLayer: true,
  },
  {
    id: 'zoom',
    name: 'Zoom (Z)',
    icon: 'M11 8v6M8 11h6M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
    requiresLayer: true,
  },
  {
    id: 'rotate',
    name: 'Girar (R)',
    icon: 'M2.5 22v-6h6M21.5 2v6h-6M15.52 6.48a9 9 0 00-12.04 0M2.5 12.5a9 9 0 0019.04-2.5',
    requiresLayer: true,
  },
  { type: 'divider' },
  {
    id: 'rect-select',
    name: 'Seleção Retangular (M)',
    icon: 'M3 3h18v18H3z',
    requiresLayer: false,
  },
  {
    id: 'lasso-select',
    name: 'Laço (L)',
    icon: 'M13.25 2.19a3.78 3.78 0 0 0-4.5 0l-6 4A3.78 3.78 0 0 0 1 9.47v5.06a3.78 3.78 0 0 0 1.75 3.28l6 4a3.78 3.78 0 0 0 4.5 0l6-4a3.78 3.78 0 0 0 1.75-3.28V9.47a3.78 3.78 0 0 0-1.75-3.28l-6-4Z',
    requiresLayer: false,
  },
  { type: 'divider' },
  {
    id: 'upload',
    name: 'Carregar Ficheiro',
    icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12',
    requiresLayer: false,
  },
]

const previewTools = computed(() => [
  {
    id: 'toggle-interactive',
    name: store.workspace.previewIsInteractive ? 'Bloquear Edição' : 'Editar Estampa',
    icon: store.workspace.previewIsInteractive
      ? 'M7 7H5a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-2M15 5l-2-2m0 0L8 8m5-5l5 5'
      : 'M17 3a2.85 2.85 0 114 4L7.5 20.5 2 22l1.5-5.5Z',
    requiresLayer: false,
  },
  { type: 'divider' },
  {
    id: 'zoom-preview', // NOVO: Ferramenta de Zoom do Preview
    name: 'Zoom do Preview',
    icon: 'M15 4h5v5M9 20H4v-5M20 9l-7 7-7-7',
    requiresLayer: false,
    previewOnly: false, // Sempre ativa no modo preview
  },
  { type: 'divider' },
  {
    id: 'move',
    name: 'Mover Estampa (V)',
    icon: 'M5 9l-3 3 3 3M9 5l3-3 3 3M15 19l-3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20',
    requiresLayer: true,
    previewOnly: true,
  },
  {
    id: 'zoom',
    name: 'Zoom Estampa (Z)',
    icon: 'M11 8v6M8 11h6M21 21l-4.35-4.35M11 19a8 8 0 100-16 8 8 0 000 16z',
    requiresLayer: true,
    previewOnly: true,
  },
  {
    id: 'rotate',
    name: 'Girar Estampa (R)',
    icon: 'M2.5 22v-6h6M21.5 2v6h-6M15.52 6.48a9 9 0 00-12.04 0M2.5 12.5a9 9 0 0019.04-2.5',
    requiresLayer: true,
    previewOnly: true,
  },
  {
    id: 'lasso-select', // NOVO: Ferramenta Laço no Preview
    name: 'Laço (L)',
    icon: 'M13.25 2.19a3.78 3.78 0 0 0-4.5 0l-6 4A3.78 3.78 0 0 0 1 9.47v5.06a3.78 3.78 0 0 0 1.75 3.28l6 4a3.78 3.78 0 0 0 4.5 0l6-4a3.78 3.78 0 0 0 1.75-3.28V9.47a3.78 3.78 0 0 0-1.75-3.28l-6-4Z',
    requiresLayer: true,
    previewOnly: true,
  },
])

const tools = computed(() => {
  return props.mode === 'preview' ? previewTools.value : editTools
})

function handleToolClick(tool) {
  if (tool.id === 'toggle-interactive') {
    store.togglePreviewInteractivity()
    if (!store.workspace.previewIsInteractive) {
      store.setActiveTool(null)
    } else {
      const patternLayer = store.layers.find((l) => l.type === 'pattern')
      if (patternLayer) {
        store.selectLayer(patternLayer.id)
        store.setActiveTool('move')
      }
    }
    return
  }

  if (tool.requiresLayer && !store.selectedLayer) {
    const patternLayer = store.layers.find((l) => l.type === 'pattern')
    if (patternLayer) store.selectLayer(patternLayer.id)
    else return
  }

  if (tool.id === 'upload') {
    isUploadModalVisible.value = true
  } else {
    store.setActiveTool(tool.id)
  }
}

watch(
  () => store.activeTool,
  (activeToolId) => {
    const toolButton = toolsGridRef.value?.querySelector(`[data-tool-id="${activeToolId}"]`)
    if (toolButton && ['move', 'zoom', 'rotate', 'zoom-preview'].includes(activeToolId)) {
      const rect = toolButton.getBoundingClientRect()
      emit('show-controls', { top: rect.top, left: rect.right + 12, visible: true })
    } else {
      emit('show-controls', { visible: false })
    }
  },
)
</script>

<template>
  <aside class="tools-sidebar">
    <div class="tools-grid" ref="toolsGridRef">
      <template v-for="(tool, index) in tools" :key="tool.id || `divider-${index}`">
        <div v-if="tool.type === 'divider'" class="tool-divider"></div>
        <button
          v-else
          class="tool-button"
          :class="{
            active: store.activeTool === tool.id,
            disabled:
              (tool.requiresLayer && store.layers.length === 0) ||
              (tool.previewOnly && !store.workspace.previewIsInteractive),
          }"
          @click="handleToolClick(tool)"
          :data-tooltip="tool.name"
          :data-tool-id="tool.id"
        >
          <svg
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path :d="tool.icon"></path>
          </svg>
        </button>
      </template>
    </div>
    <UploadModal :is-visible="isUploadModalVisible" @close="isUploadModalVisible = false" />
  </aside>
</template>

<style scoped>
.tools-sidebar {
  width: var(--sidebar-width);
  background-color: var(--c-surface);
  border-right: 1px solid var(--c-border);
  padding: var(--spacing-2) 0;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.tools-grid {
  display: grid;
  gap: var(--spacing-1);
}
.tool-divider {
  height: 1px;
  background-color: var(--c-border);
  margin: var(--spacing-2) var(--spacing-3);
}
.tool-button {
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--c-text-secondary);
  transition: var(--transition-fast);
}
.tool-button:hover:not(.disabled) {
  background-color: var(--c-surface-dark);
  color: var(--c-text-primary);
}
.tool-button.active {
  background-color: var(--c-primary);
  color: var(--c-white);
}

.tool-button.disabled {
  opacity: 0.4;
  cursor: not-allowed;
  pointer-events: none;
}

.tool-button:hover::after {
  content: attr(data-tooltip);
  position: absolute;
  left: calc(var(--sidebar-width) - 10px);
  top: 50%;
  transform: translateY(-50%);
  background-color: var(--c-text-primary);
  color: var(--c-white);
  padding: var(--spacing-1) var(--spacing-3);
  border-radius: var(--radius-sm);
  font-size: var(--fs-sm);
  font-weight: var(--fw-medium);
  white-space: nowrap;
  box-shadow: var(--shadow-md);
  z-index: 110;
  pointer-events: none;
}
</style>
