<script setup>
import { RouterView } from 'vue-router'
import SubscriptionModal from '@/components/modals/SubscriptionModal.vue'
import ImageAdjustmentsModal from '@/components/modals/ImageAdjustmentsModal.vue'
</script>

<template>
  <RouterView />
  <SubscriptionModal />
  <ImageAdjustmentsModal />
</template>

<style>
/* Estilos globais podem vir aqui se necessário, mas para começar, pode deixar vazio */
</style>
