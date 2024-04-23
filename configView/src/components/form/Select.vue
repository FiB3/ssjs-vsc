<template>
	<div class="setting-item-contents settings-row-inner-container" data-key="files.autoSave"
		data-id="commonlyUsed_files_autoSave">
		<div class="setting-item-title">
			<div class="setting-item-cat-label-container">
				<span class="setting-item-category" title="files.autoSave">{{ title }}</span>
				<span class="setting-item-label" title="files.autoSave">{{ title2 }}</span>
			</div>
			<div class="setting-indicators-container" role="toolbar" style="display: none;"></div>
		</div>
		<div class="setting-item-description">
			{{ description }}
		</div>
		<div class="setting-item-enumDescription"></div>
		<div class="setting-item-modified-indicator" title="The setting has been configured in the current scope."></div>
		<div class="setting-item-value">
			<div class="setting-item-control select-container">
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
			</div>
		</div>
		<div class="setting-item-deprecation-message">
			<div class="codicon codicon-error"></div>
		</div>
		<!-- <div class="setting-toolbar-container">
			<div class="monaco-toolbar">
				<div class="monaco-action-bar">
					<ul class="actions-container" role="toolbar">
						<li class="action-item" role="presentation">
							<div class="monaco-dropdown">
								<div class="dropdown-label"><a class="action-label codicon codicon-settings-more-action" role="button" aria-haspopup="true" aria-expanded="false" aria-label="More Actions...  (⇧F9)" tabindex="0"></a>
								</div>
							</div>
						</li>
					</ul>
				</div>
			</div>
		</div> -->
	</div>
</template>

<script setup>
import { ref, watch, defineModel } from 'vue';

const value = defineModel();

defineProps({
	id: {
		type: String,
		required: true
	},
	title: {
		type: String,
		required: true
	},
	title2: {
		type: String,
		required: false
	},
	description: {
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

<style scoped></style>