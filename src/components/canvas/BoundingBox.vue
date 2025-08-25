<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()
const emit = defineEmits(['handleMouseDown'])

const isVisible = computed(() => store.selectedLayer && store.workspace.viewMode === 'edit')

const boxStyle = computed(() => {
  const layer = store.selectedLayer
  if (!isVisible.value || !layer) {
    return { display: 'none' }
  }

  const { workspace } = store
  const { zoom, pan } = workspace

  const displayWidth = layer.metadata.originalWidth * layer.scaleX * zoom
  const displayHeight = layer.metadata.originalHeight * layer.scaleY * zoom

  const screenCenterX = layer.x * zoom + pan.x
  const screenCenterY = layer.y * zoom + pan.y

  return {
    transform: `
      translate(${screenCenterX}px, ${screenCenterY}px)
      translate(-50%, -50%)
      rotate(${layer.rotation}rad)
    `,
    width: `${displayWidth}px`,
    height: `${displayHeight}px`,
  }
})

function handleMouseDown(e, handleType, cursor) {
  e.stopPropagation()
  emit('handleMouseDown', { event: e, type: handleType, cursor: cursor })
}
</script>

<template>
  <div v-if="isVisible" class="bounding-box-container">
    <div class="bounding-box" :style="boxStyle">
      <div
        class="handle rotate-handle"
        @mousedown="handleMouseDown($event, 'rotate', 'grabbing')"
      ></div>
      
      <div
        class="handle resize-handle top-left"
        @mousedown="handleMouseDown($event, 'resize-tl', 'nwse-resize')"
      ></div>
      <div
        class="handle resize-handle top-right"
        @mousedown="handleMouseDown($event, 'resize-tr', 'nesw-resize')"
      ></div>
      <div
        class="handle resize-handle bottom-left"
        @mousedown="handleMouseDown($event, 'resize-bl', 'nesw-resize')"
      ></div>
      <div
        class="handle resize-handle bottom-right"
        @mousedown="handleMouseDown($event, 'resize-br', 'nwse-resize')"
      ></div>

      <div
        class="handle resize-handle-side top"
        @mousedown="handleMouseDown($event, 'resize-t', 'ns-resize')"
      ></div>
      <div
        class="handle resize-handle-side right"
        @mousedown="handleMouseDown($event, 'resize-r', 'ew-resize')"
      ></div>
      <div
        class="handle resize-handle-side bottom"
        @mousedown="handleMouseDown($event, 'resize-b', 'ns-resize')"
      ></div>
      <div
        class="handle resize-handle-side left"
        @mousedown="handleMouseDown($event, 'resize-l', 'ew-resize')"
      ></div>
    </div>
  </div>
</template>

<style scoped>
.bounding-box-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 100;
}
.bounding-box {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 1.5px solid var(--c-primary);
  transform-origin: center center;
  pointer-events: none;
}
.handle {
  position: absolute;
  background-color: var(--c-white);
  border: 1.5px solid var(--c-primary);
  pointer-events: all;
  z-index: 101;
}
.rotate-handle {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  top: -30px;
  left: 50%;
  transform: translateX(-50%);
  cursor: grabbing;
}
.rotate-handle::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  width: 1.5px;
  height: 18px;
  background-color: var(--c-primary);
  transform: translateX(-50%);
}
.resize-handle {
  width: 12px;
  height: 12px;
  border-radius: var(--radius-full);
  transform: translate(-50%, -50%);
}
.resize-handle.top-left { top: 0; left: 0; cursor: nwse-resize; }
.resize-handle.top-right { top: 0; left: 100%; cursor: nesw-resize; }
.resize-handle.bottom-left { top: 100%; left: 0; cursor: nesw-resize; }
.resize-handle.bottom-right { top: 100%; left: 100%; cursor: nwse-resize; }

/* ESTILOS PARA NOVAS ALÇAS */
.resize-handle-side {
  width: 10px;
  height: 10px;
  border-radius: 2px;
}
.resize-handle-side.top { top: 0; left: 50%; transform: translate(-50%, -50%); cursor: ns-resize; }
.resize-handle-side.right { top: 50%; left: 100%; transform: translate(-50%, -50%); cursor: ew-resize; }
.resize-handle-side.bottom { top: 100%; left: 50%; transform: translate(-50%, -50%); cursor: ns-resize; }
.resize-handle-side.left { top: 50%; left: 0; transform: translate(-50%, -50%); cursor: ew-resize; }
</style>
