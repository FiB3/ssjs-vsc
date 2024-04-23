<template>
	<div
			:data-id="id"
			class="setting-item-contents settings-row-inner-container">
		<div class="setting-item-title">
			<div class="setting-item-cat-label-container"><span class="setting-item-category" :title="title">{{ title }}
				</span><span class="setting-item-label" :title="title">{{ title2 }}</span></div>
			<div class="setting-indicators-container" role="toolbar" style="display: none;"></div>
		</div>
		<div class="setting-item-description">{{ description }}</div>
		<div class="setting-item-modified-indicator" title="The setting has been configured in the current scope."></div>
		<div class="setting-item-value">
			<div class="setting-item-control">
				<div class="monaco-inputbox idle"
					style="background-color: var(--vscode-settings-numberInputBackground); color: var(--vscode-settings-numberInputForeground); border: 1px solid var(--vscode-settings-numberInputBorder, transparent);">
					<div class="ibwrapper">
						<div v-if="inputType == 'password'" class="lock"></div>
						<input
							:id="id"
							class="input setting-control-focus-target" autocorrect="off"
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
		<div class="setting-item-deprecation-message">
			<div class="codicon codicon-error"></div>
		</div>
		<div class="setting-item-validation-message"></div>
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
	.lock {
    display: inline-block;
    vertical-align: middle;
    background: currentColor;
    border-radius: 3px;
    width: 23px;
    height: 13px;
    margin-top: 5px;
    margin-left: 5px;
    position: relative;
	}

	.lock:before {
    content: "";
    display: inline-block;
    position: absolute;
    border:3px solid currentColor;
    top: -10px;
    left: 2.3px;
    width: 12px;
    height: 17px;
    border-radius: 35px 35px 0 0;
	}

	div.lock + input {
		width: calc(100% - 40px) !important;
		margin-left: 5px;
	}
</style>