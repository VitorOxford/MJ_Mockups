<script setup>
import { computed, ref } from 'vue'
import { useCanvasStore } from '@/stores/canvasStore'
import { useImageAdjustmentsStore } from '@/stores/imageAdjustmentsStore'

const store = useCanvasStore()
const adjustmentsStore = useImageAdjustmentsStore()
const activeMenu = ref(null)

const isLassoSelectionActive = computed(() => store.workspace.lasso.points.length > 2)

const menus = [
  { name: 'Ficheiro', items: [{ name: 'Exportar...', action: () => alert('Exportar!') }] },
  {
    name: 'Editar',
    items: [
      {
        name: 'Duplicar Camada',
        action: () => store.duplicateLayer(store.selectedLayerId),
        requiresLayer: true,
      },
      { type: 'divider' },
      {
        name: 'Duplicar Seleção',
        action: () => store.duplicateSelection(store.selectedLayerId),
        requiresLayer: true,
        requiresSelection: true,
      },
      {
        name: 'Recortar Seleção',
        action: () => store.cutoutSelection(store.selectedLayerId),
        requiresLayer: true,
        requiresSelection: true,
      },
    ],
  },
  {
    name: 'Imagem',
    items: [
      { name: 'Ajustes...', action: () => adjustmentsStore.openModal(), requiresLayer: true },
      { type: 'divider' },
      { name: 'Rodar 90° Horário', action: () => store.rotateLayer(90), requiresLayer: true },
      { name: 'Rodar 90° Anti-horário', action: () => store.rotateLayer(-90), requiresLayer: true },
      { type: 'divider' },
      {
        name: 'Inverter Horizontalmente',
        action: () => store.flipLayer('horizontal'),
        requiresLayer: true,
      },
      {
        name: 'Inverter Verticalmente',
        action: () => store.flipLayer('vertical'),
        requiresLayer: true,
      },
    ],
  },
]

function toggleMenu(menuName) {
  activeMenu.value = activeMenu.value === menuName ? null : menuName
}

function handleItemClick(item) {
  if (item.requiresLayer && !store.selectedLayer) {
    alert('Por favor, selecione uma camada para aplicar esta ação.')
    activeMenu.value = null
    return
  }
  if (item.requiresSelection && !isLassoSelectionActive.value) {
    alert('Esta ação requer uma seleção de laço ativa.')
    activeMenu.value = null
    return
  }
  item.action()
  activeMenu.value = null
}
</script>

<template>
  <nav class="top-menu-bar">
    <div v-for="menu in menus" :key="menu.name" class="menu-item">
      <button @click="toggleMenu(menu.name)">{{ menu.name }}</button>
      <ul v-if="activeMenu === menu.name" class="dropdown-menu">
        <li v-for="(item, index) in menu.items" :key="item.name || `divider-${index}`">
          <div v-if="item.type === 'divider'" class="divider"></div>
          <a
            v-else
            @click="handleItemClick(item)"
            :class="{
              disabled:
                (item.requiresLayer && !store.selectedLayer) ||
                (item.requiresSelection && !isLassoSelectionActive),
            }"
          >
            {{ item.name }}
          </a>
        </li>
      </ul>
    </div>
  </nav>
</template>

<style scoped>
.assets-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.2);
  /* Alteração aqui: z-index aumentado para ficar na frente do menu */
  z-index: 1050; 
  display: flex;
  justify-content: flex-end;
}
.assets-sidebar {
  width: var(--assets-width);
  height: 100%;
  background-color: var(--c-surface);
  border-left: 1px solid var(--c-border);
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 15px rgba(0, 0, 0, 0.1);
}
.assets-header {
  padding: 14px 16px;
  border-bottom: 1px solid var(--c-border);
  flex-shrink: 0;
}
.assets-header h3 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0;
}
.assets-content {
  flex-grow: 1;
  overflow-y: auto;
  padding: 16px;
}
.loader,
.empty-state {
  text-align: center;
  color: var(--c-text-secondary);
  margin-top: 40px;
}
.thumbnails-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(70px, 1fr));
  gap: 12px;
}
.thumbnail {
  aspect-ratio: 1 / 1;
  border-radius: var(--radius-md);
  background-color: var(--c-background);
  background-size: cover;
  background-position: center;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}
.thumbnail:hover {
  transform: scale(1.05);
  border-color: var(--c-primary-hover);
}
</style>
