<template>
	<!-- <div class="setting-item-contents settings-row-inner-container"
		data-id="commonlyUsed_files_autoSave"> -->
		<!-- <div class="setting-item-value">
			<div class="setting-item-control select-container"> -->
				<select
					:id="id"
					class="monaco-select-box monaco-select-box-dropdown-padding setting-control-focus-target"
						tabindex="0" aria-label="files.autoSave"
						style="background-color: var(--vscode-settings-dropdownBackground); color: var(--vscode-settings-dropdownForeground); border-color: var(--vscode-settings-dropdownBorder);" aria-expanded="false"
						v-model="value"
					>
					<option v-for="option in options" :value="option.value" :key="option.value">
						{{ option.text }}
					</option>
				</select>
			<!-- </div>
		</div> -->
	<!-- </div> -->
</template>

<script setup>
import { ref, watch, defineModel } from 'vue';

const value = defineModel();

defineProps({
	id: {
		type: String,
		required: true
	},
	options: {
		type: Array,
		default: [{ value: 'off', text: 'Not set.' }],
		required: false
	}
});
</script>

<style scoped>
	/* select {
		width: 15%;
		max-width: 200px;
	} */
</style>