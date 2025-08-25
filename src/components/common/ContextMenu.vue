<script setup>
import { computed, ref, onMounted, watch } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'

const store = useCanvasStore()
const adjustmentsStore = useImageAdjustmentsStore()
const menuRef = ref(null)

const isLassoSelectionActive = computed(() => store.workspace.lasso.points.length > 2)

const menuStyle = computed(() => {
  const { x, y } = store.workspace.contextMenuPosition
  let finalX = x
  let finalY = y

  if (menuRef.value) {
    const menuWidth = menuRef.value.offsetWidth
    const menuHeight = menuRef.value.offsetHeight
    const windowWidth = window.innerWidth
    const windowHeight = window.innerHeight

    if (x + menuWidth > windowWidth) {
      finalX = x - menuWidth
    }
    if (y + menuHeight > windowHeight) {
      finalY = y - menuHeight
    }
  }

  return {
    top: `${finalY}px`,
    left: `${finalX}px`,
  }
})

function onClick(action) {
  action()
  store.showContextMenu(false)
}

watch(
  () => store.workspace.isContextMenuVisible,
  async (isVisible) => {
    if (isVisible && menuRef.value) {
      await menuRef.value.getBoundingClientRect()
    }
  },
)

onMounted(() => {
  if (store.workspace.isContextMenuVisible && menuRef.value) {
    menuRef.value.getBoundingClientRect()
  }
})
</script>

<template>
  <div ref="menuRef" class="context-menu" :style="menuStyle">
    <ul>
      <li @click="onClick(() => store.duplicateLayer(store.contextMenuTargetLayerId))">
        Duplicar Camada
      </li>
      <li class="divider"></li>
      <li
        :class="{ disabled: !isLassoSelectionActive }"
        @click="
          isLassoSelectionActive &&
          onClick(() => store.duplicateSelection(store.contextMenuTargetLayerId))
        "
      >
        Duplicar Seleção
      </li>
      <li
        :class="{ disabled: !isLassoSelectionActive }"
        @click="
          isLassoSelectionActive &&
          onClick(() => store.deleteSelection(store.contextMenuTargetLayerId))
        "
        class="danger"
      >
        Excluir Seleção
      </li>
      <li
        :class="{ disabled: !isLassoSelectionActive }"
        @click="
          isLassoSelectionActive &&
          onClick(() => store.cutoutSelection(store.contextMenuTargetLayerId))
        "
      >
        Recortar Seleção para Nova Camada
      </li>
      <li class="divider"></li>
      <li @click="onClick(() => adjustmentsStore.openModal())">Ajustes de Imagem...</li>
      <li @click="onClick(() => store.showResizeModal(true))">Redimensionar</li>
      <li class="divider"></li>
      <li @click="onClick(() => store.rotateLayer(90))">Rodar 90° Horário</li>
      <li @click="onClick(() => store.flipLayer('horizontal'))">Inverter Horizontalmente</li>
      <li @click="onClick(() => store.flipLayer('vertical'))">Inverter Verticalmente</li>
      <li class="divider"></li>
      <li @click="onClick(() => store.deleteLayer(store.contextMenuTargetLayerId))" class="danger">
        Apagar Camada
      </li>
    </ul>
  </div>
</template>

<style scoped>
.context-menu {
  position: fixed;
  background-color: var(--c-surface);
  border: 1px solid var(--c-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  z-index: 1000;
  padding: var(--spacing-2) 0;
  visibility: hidden;
  opacity: 0;
  animation: fadeIn 0.1s forwards;
}

@keyframes fadeIn {
  to {
    visibility: visible;
    opacity: 1;
  }
}

ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
li {
  padding: var(--spacing-2) var(--spacing-4);
  cursor: pointer;
  font-size: var(--fs-sm);
  white-space: nowrap;
}
li:hover {
  background-color: var(--c-surface-dark);
  color: var(--c-primary);
}
li.disabled {
  color: var(--c-text-tertiary);
  cursor: not-allowed;
  background-color: transparent !important;
}
li.divider {
  height: 1px;
  background: var(--c-border);
  padding: 0;
  margin: var(--spacing-2) 0;
}
li.danger {
  color: #ff3333;
}
li.danger:hover {
  background-color: #ffdddd;
}
</style>
