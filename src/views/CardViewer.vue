<template src="./CardViewer.html"></template>

<script lang="ts" src="./CardViewer.ts"></script>

<style scoped>


.card-slot {
	flex-direction: column;
	gap: 6px;
	flex: 0 0 auto;
	display: inline-flex;
	padding: 16px;
	height: 100%;
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
		padding-bottom: 128px;

}

.card-item {

	height: 100%;
  	align-items: stretch;
  	justify-content: stretch;

	display: inline-flex;
	flex: 0 0 auto;
	flex-direction: column;
	padding: 0px;



}


.card-wrapper {
	height: 100%;
	display: inline-flex;
	flex: 0 0 auto;
	flex-direction: row;

	width: auto;
	align-items: stretch;
	aspect-ratio: 2 / 3; /* width will be computed from height (2:3 => width:height*2/3) */
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
