<template src="./CardViewer.html"></template>

<script lang="ts" src="./CardViewer.ts"></script>

<style scoped>
.deck-grid {
	display: flex;
	flex-wrap: nowrap;
	gap: 8px;
	overflow-x: auto;
	overflow-y: hidden;
	-webkit-overflow-scrolling: touch;
	scrollbar-width: none;
	-ms-overflow-style: none;
}

.deck-grid::-webkit-scrollbar {
	display: none;
}

.deck-card-slot {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 0 0 auto;
}
</style>
