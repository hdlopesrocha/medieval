<template src="./MainPage.html"></template>

<script lang="ts" src="./MainPage.ts"></script>

<style scoped>
textarea { font-family: monospace }

:deep(.role-switch-button) {
	--border-radius: 12px;
	--background: rgba(15, 28, 46, 0.78);
	--background-hover: rgba(15, 28, 46, 0.88);
	--background-activated: rgba(15, 28, 46, 0.92);
	--color: #e7f1ff;
	--border-color: rgba(189, 211, 238, 0.45);
}

:deep(.role-switch-button)::part(native) {
	background: rgba(15, 28, 46, 0.78) !important;
	border-color: rgba(189, 211, 238, 0.45) !important;
	color: #e7f1ff !important;
}

:deep(.role-switch-button.button-solid)::part(native) {
	background: rgba(29, 100, 237, 0.9) !important;
}

.qr-image-wrap {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	margin: 8px 0;
}

.qr-image {
	display: block;
	margin: 0 auto;
	max-height: 600px;
	width: 100%;
	object-fit: contain;
}

.scanner-reader-wrap {
	display: flex;
	justify-content: center;
	align-items: center;
	width: 100%;
	margin-top: 8px;
}

:deep(.scanner-reader) {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	width: auto !important;
	max-width: 100%;
}

:deep(#qr-reader) {
	display: inline-flex;
	justify-content: center;
	align-items: center;
	width: auto !important;
	margin: 0 auto !important;
	max-width: 100%;
}

:deep(#qr-reader__scan_region) {
	display: flex;
	justify-content: center;
	align-items: center;
	height: 600px;
	max-height: 600px;
}

:deep(.scanner-reader video),
:deep(.scanner-reader img),
:deep(.scanner-reader canvas),
:deep(#qr-reader__scan_region img) {
	height: 600px !important;
	max-height: 600px !important;
	max-width: 100% !important;
	width: auto !important;
	display: block;
	margin: 0 auto;
	object-fit: contain;
}
</style>
