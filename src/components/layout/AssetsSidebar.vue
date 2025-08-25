<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '@/supabase'
import { useCanvasStore } from '@/stores/canvasStore'

const props = defineProps({
  isVisible: Boolean,
})
const emit = defineEmits(['close'])

const store = useCanvasStore()
const categories = ref([])
const loading = ref(true)

// Computada para garantir que só mostramos categorias que de fato têm mockups
const mockupCategories = computed(() => {
  return categories.value.filter((c) => c.assets.length > 0)
})

function getThumbUrl(path) {
  // Busca a URL pública da imagem diretamente do bucket 'mockups'
  const { data } = supabase.storage.from('mockups').getPublicUrl(path)
  return data.publicUrl
}

function handleAssetClick(asset) {
  // Adiciona a camada ao canvas, definindo o tipo como 'mockup'
  store.addLayer(asset, 'mockup')
  emit('close')
}

async function fetchAssets() {
  loading.value = true
  try {
    // Modificamos a query para buscar na tabela 'categories' apenas as que são do tipo 'mockups'
    // e trazer os seus 'assets' relacionados.
    const { data, error } = await supabase
      .from('categories')
      .select(`name, type, assets (id, name, file_path, metadata)`)
      .eq('type', 'mockups') // <-- Esta linha é a chave da nova lógica
      .order('name', { referencedTable: 'assets', ascending: true })

    if (error) throw error
    categories.value = data
  } catch (error) {
    console.error('Erro ao buscar mockups:', error)
  } finally {
    loading.value = false
  }
}

onMounted(fetchAssets)
</script>

<template>
  <div v-if="isVisible" class="assets-sidebar-overlay" @click.self="emit('close')">
    <aside class="assets-sidebar">
      <div class="assets-header">
        <h3>Adicionar Mockup</h3>
      </div>

      <div class="assets-content">
        <div v-if="loading" class="loader">A carregar Mockups...</div>
        <div v-else-if="mockupCategories.length === 0" class="empty-state">
          Nenhum mockup encontrado.
        </div>
        <div v-else class="categories-list">
          <div v-for="category in mockupCategories" :key="category.name" class="category-box">
            <h4 class="category-title">{{ category.name }}</h4>
            <div class="thumbnails-grid">
              <div
                v-for="asset in category.assets"
                :key="asset.id"
                class="thumbnail"
                :style="{ backgroundImage: `url(${getThumbUrl(asset.file_path)})` }"
                @click="handleAssetClick(asset)"
                :title="asset.name"
              ></div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
.assets-sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 250;
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

/* Cabeçalho fixo que substitui as abas */
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
.category-box {
  margin-bottom: 24px;
}
.category-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--c-text-secondary);
  text-transform: uppercase;
  margin-bottom: 12px;
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
