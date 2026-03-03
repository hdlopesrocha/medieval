<template src="./CardViewer.html"></template>

<script lang="ts" src="./CardViewer.ts"></script>

<style scoped>


.deck-card-slot {
	display: flex;
	flex-direction: column;
	gap: 6px;
	flex: 0 0 auto;
	/* Make each slot use half of the grid height so there are 2 rows */
	height: calc((100% - 8px) / 2);
	width: auto;
	align-items: stretch;
	aspect-ratio: 2 / 3; /* width will be computed from height (2:3 => width:height*2/3) */
}

.cards-list {
	/* allow the list element to size to its children so it grows horizontally */
	display: inline-flex;
	flex-direction: row;
	flex-wrap: nowrap;
	overflow-y: auto;
	overflow-x: auto;
	height: 100%;
	width: auto;
	padding-bottom: 64px;
}


.card-item {
	display: flex;
	/* keep each card at its intrinsic width (from aspect-ratio/height) */
	flex: 0 0 auto;
	flex-direction: column;
	aspect-ratio: 2 / 3;
	padding: 16px;
}

ion-button,
.card-action-btn {
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
