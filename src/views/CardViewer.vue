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
	align-items: flex-start;
	height: auto;
}

.deck-grid::-webkit-scrollbar {
	display: none;
}

.deck-card-slot {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 0 0 auto;
	height: auto;
	width: auto;
	align-items: stretch;
}

.deck-card-slot > *:not(.card-action-btn) {
	flex: 0 0 auto;
	min-height: 0;
	width: 100%;
	aspect-ratio: 3 / 5;
	object-fit: contain;
}

.deck-card-slot ion-button,
.deck-card-slot .card-action-btn {
	height: 64px !important;
	min-height: 64px !important;
	max-height: 64px !important;
	width: 100%;
	align-self: flex-end;
	flex: 0 0 auto !important;
	visibility: visible !important;
	display: flex !important;
}
</style>
