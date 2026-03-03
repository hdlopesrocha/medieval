<template>
  <div v-if="visible" class="confirm-overlay" @click.self="onCancel">
    <div class="confirm-box">
      <div class="confirm-title">{{ title }}</div>
      <div class="confirm-message">{{ message }}</div>
      <div class="confirm-actions">
        <ion-button size="small" @click="handleCancel" fill="clear">Cancel</ion-button>
        <ion-button size="small" color="primary" @click="handleConfirm">Confirm</ion-button>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import { IonButton } from '@ionic/vue'

export default defineComponent({
  name: 'ConfirmActionModal',
  components: { IonButton },
  props: {
    visible: { type: Boolean, required: true },
    title: { type: String, required: false, default: 'Confirm' },
    message: { type: String, required: false, default: '' }
  },
  emits: ['confirm', 'cancel'],
  setup(_, { emit }) {
    function handleConfirm() { emit('confirm') }
    function handleCancel() { emit('cancel') }
    return { handleConfirm, handleCancel }
  }
})
</script>

<style scoped>
.confirm-overlay{
  position: fixed;
  left:0;right:0;top:0;bottom:0;
  display:flex;align-items:center;justify-content:center;
  background: rgba(0,0,0,0.35);
  z-index: 1000;
}
.confirm-box{
  background: #fff;
  padding: 14px;
  border-radius: 8px;
  min-width: 260px;
  max-width: 90%;
  box-shadow: 0 6px 20px rgba(0,0,0,0.15);
  display:flex;flex-direction:column;gap:12px;
}
.confirm-title{font-weight:700;font-size:16px}
.confirm-message{color:#333;font-size:14px}
.confirm-actions{display:flex;gap:8px;justify-content:flex-end}
</style>
