<script setup>
import { computed } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'

const store = useCanvasStore()
const emit = defineEmits(['handleMouseDown'])

// A caixa de contorno só é visível se uma camada estiver selecionada e estivermos no modo de edição.
const isVisible = computed(() => store.selectedLayer && store.workspace.viewMode === 'edit')

const boxStyle = computed(() => {
  const layer = store.selectedLayer
  // Se não for para ser visível, retorna 'display: none' para esconder o elemento.
  if (!isVisible.value || !layer) {
    return { display: 'none' }
  }

  const { workspace } = store
  const { zoom, pan } = workspace

  // 1. Calcula o tamanho da camada na tela (incluindo a escala da própria camada e o zoom do workspace)
  const displayWidth = layer.metadata.originalWidth * layer.scale * zoom
  const displayHeight = layer.metadata.originalHeight * layer.scale * zoom

  // 2. Calcula a posição do CENTRO da camada na tela.
  // Esta é a fórmula correta: (coordenada_no_workspace * zoom) + deslocamento_do_pan
  const screenCenterX = layer.x * zoom + pan.x
  const screenCenterY = layer.y * zoom + pan.y

  return {
    // A propriedade 'transform' do CSS é a maneira mais eficiente e correta para posicionar e rotacionar.
    // A lógica é:
    // a. Mover o canto superior esquerdo do elemento para o centro da camada (translate(${screenCenterX}px, ${screenCenterY}px))
    // b. Deslocar o elemento de volta em -50% de sua própria altura/largura para que seu centro se alinhe perfeitamente.
    // c. Aplicar a rotação da camada.
    transform: `
      translate(${screenCenterX}px, ${screenCenterY}px)
      translate(-50%, -50%)
      rotate(${layer.rotation}rad)
    `,
    // Define a largura e altura da caixa para corresponder ao tamanho da camada na tela.
    width: `${displayWidth}px`,
    height: `${displayHeight}px`,
  }
})

// Esta função não precisa de alterações, apenas emite o evento para o componente pai (CanvasArea).
function handleMouseDown(e, handleType, cursor) {
  // Impede que o clique "vaze" para o canvas, o que faria o pan ser ativado indevidamente.
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
    </div>
  </div>
</template>

<style scoped>
/* Este contêiner garante que a caixa seja posicionada em relação à área do canvas */
.bounding-box-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none; /* Permite que os cliques passem direto para o canvas */
  z-index: 100;
}

.bounding-box {
  position: absolute;
  top: 0;
  left: 0;
  box-sizing: border-box;
  border: 1.5px solid var(--c-primary);
  /* A origem para rotação e escala deve ser sempre o centro */
  transform-origin: center center;
  pointer-events: none; /* A caixa em si não é interativa, apenas suas alças */
}

.handle {
  position: absolute;
  width: 12px;
  height: 12px;
  background-color: var(--c-white);
  border: 1.5px solid var(--c-primary);
  border-radius: var(--radius-full);
  pointer-events: all; /* Torna as alças clicáveis */
  z-index: 101;
}

/* Posição e estilo da alça de rotação */
.rotate-handle {
  top: -30px; /* Posiciona acima da caixa */
  left: 50%;
  transform: translateX(-50%);
  cursor: grabbing;
}

/* A linha que conecta a alça de rotação à caixa */
.rotate-handle::before {
  content: '';
  position: absolute;
  bottom: 100%;
  left: 50%;
  width: 1.5px;
  height: 18px; /* Comprimento da linha */
  background-color: var(--c-primary);
  transform: translateX(-50%);
}

/* Posição e estilo das alças de redimensionamento */
.resize-handle {
  transform: translate(-50%, -50%);
}
.resize-handle.top-left {
  top: 0;
  left: 0;
  cursor: nwse-resize;
}
.resize-handle.top-right {
  top: 0;
  left: 100%;
  cursor: nesw-resize;
}
.resize-handle.bottom-left {
  top: 100%;
  left: 0;
  cursor: nesw-resize;
}
.resize-handle.bottom-right {
  top: 100%;
  left: 100%;
  cursor: nwse-resize;
}
</style>
