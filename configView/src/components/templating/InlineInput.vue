<template>
	<div class="setting-item-contents settings-row-inner-container"
		data-id="commonlyUsed_editor_fontSize">
		<div class="setting-item-value">
			<div class="setting-item-control">
				<div class="monaco-inputbox idle"
					style="background-color: var(--vscode-settings-numberInputBackground); color: var(--vscode-settings-numberInputForeground); border: 1px solid var(--vscode-settings-numberInputBorder, transparent);">
					<div class="ibwrapper">
						<input class="input setting-control-focus-target" autocorrect="off"
							autocapitalize="off" spellcheck="false" :type="inputType" wrap="off" tabindex="0" step="any"
							aria-label="editor.fontSize"
							style="background-color: inherit; color: var(--vscode-settings-numberInputForeground);"
							:placeholder="placeholder"
							v-model="value"
						>
					</div>
				</div>
			</div>
		</div>
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
	placeholder: {
		type: String,
		required: false
	},
	inputType: {
		type: String,
		default: 'text'
	}
});
</script>

<style scoped>
	div {
		display: inline-block;
		width: 100%;
	}

	.setting-item-contents {
		width: 15%;
		max-width: 200px;
	}
</style>