<template src="./App.html"></template>

<script lang="ts" src="./App.ts"></script>

<style>
ion-app {
	display: flex;
	flex-direction: column;
	min-height: 100vh;
}

.app-global-board {
	flex: 0 0 auto;
}

.app-global-view {
	position: relative;
	flex: 1 1 auto;
	min-height: 0;
}

ion-modal,
ion-popover,
ion-alert,
ion-action-sheet,
ion-loading,
ion-picker {
	z-index: 20000 !important;
}

ion-modal {
	--width: 100vw;
	--height: 100vh;
	--max-width: 100vw;
	--max-height: 100vh;
}
</style>
