<template src="./CardViewer.html"></template>

<script lang="ts" src="./CardViewer.ts"></script>

<style scoped>


.card-slot {
	flex-direction: column;
	gap: 6px;
	flex: 0 0 auto;
	display: inline-flex;
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
	padding-bottom: 100px;
}



ion-button,
.card-action-btn {
	height: 64px;
	align-self: flex-start;
	display: inline-flex;
}
</style>
