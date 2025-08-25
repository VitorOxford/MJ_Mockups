<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/supabase'
import { useCanvasStore } from '@/stores/canvasStore'

const props = defineProps({
  isVisible: Boolean,
})
const emit = defineEmits(['close'])

const store = useCanvasStore()
const mockupList = ref([]) // Uma lista simples para guardar os arquivos encontrados
const loading = ref(true)

function getThumbUrl(path) {
  // Esta função continua correta, ela pega a URL pública do arquivo no bucket
  const { data } = supabase.storage.from('mockups').getPublicUrl(path)
  return data.publicUrl
}

function handleAssetClick(asset) {
  // Prepara o objeto de dados que a `canvasStore` espera
  const assetData = {
    name: asset.name,
    file_path: asset.name, // Para o storage, o nome do arquivo é o seu caminho
    metadata: { dpi: 96 }, // Adiciona um DPI padrão
  }
  store.addLayer(assetData, 'mockup')
  emit('close')
}

async function fetchAssets() {
  loading.value = true
  try {
    // --- LÓGICA PRINCIPAL ALTERADA ---
    // Agora, listamos os arquivos DIRETAMENTE do bucket 'mockups'
    const { data, error } = await supabase.storage.from('mockups').list()

    if (error) throw error

    // Filtra a lista para garantir que estamos a lidar apenas com imagens
    // e remove ficheiros de sistema que o Supabase possa criar.
    mockupList.value = data.filter(file =>
      /\.(png|jpg|jpeg|webp)$/i.test(file.name)
    )

  } catch (error) {
    console.error('Erro ao varrer o bucket de mockups:', error)
    mockupList.value = [] // Garante que a lista fica vazia em caso de erro
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
        <div v-else-if="mockupList.length === 0" class="empty-state">
          Nenhum mockup encontrado.
        </div>

        <div v-else class="thumbnails-grid">
          <div
            v-for="asset in mockupList"
            :key="asset.id"
            class="thumbnail"
            :style="{ backgroundImage: `url(${getThumbUrl(asset.name)})` }"
            @click="handleAssetClick(asset)"
            :title="asset.name"
          ></div>
        </div>
      </div>
    </aside>
  </div>
</template>

<style scoped>
/* Os estilos foram mantidos e simplificados, removendo a necessidade de classes de categoria */
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
