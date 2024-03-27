<template>
	<div class="setting-item-contents settings-row-inner-container is-configured"
				data-key="editor.insertSpaces"
				data-id="commonlyUsed_editor_insertSpaces"
			>
			<div class="setting-item-title">
				<span class="setting-item-category" title="editor.insertSpaces - Modified">{{ title }}</span>
				<span class="setting-item-label" title="editor.insertSpaces - Modified">{{ title2 }}</span>
			</div>
			<div class="setting-item-value-description">
				<div class="setting-item-bool-control">
					<!-- <div class="monaco-custom-toggle codicon codicon-check setting-value-checkbox setting-control-focus-target"
							tabindex="-1"
							role="checkbox"
							aria-checked="false"
							aria-label="editor.insertSpaces"
							data-focusable="true"
							style="color: inherit;"
							
						> -->
						<!-- v-model="value" -->
						<input
								:id="id"
								class="setting-value-checkbox setting-control-focus-target"
								style="color: inherit;"
								type="checkbox"
								v-model="value"
							/>
							<label
									:for="id"
								>{{ description }}
							</label>
							
					<!-- </div> -->
				</div>
				<!-- <div class="setting-item-description">
					<div class="rendered-markdown setting-item-markdown">
						<p>{{ description }}</p>
					</div>
				</div> -->
			</div>
			<div class="setting-item-modified-indicator" title="The setting has been configured in the current scope.">
			</div>
			<div class="setting-item-deprecation-message">
				<div class="codicon codicon-error">
				</div>
			</div>
			<!-- <div class="setting-toolbar-container">
				<div class="monaco-toolbar">
					<div class="monaco-action-bar">
						<ul class="actions-container" role="toolbar">
							<li class="action-item" role="presentation"><div class="monaco-dropdown">
								<div class="dropdown-label"><a class="action-label codicon codicon-settings-more-action" role="button" aria-haspopup="true" aria-expanded="false" aria-label="More Actions...  (⇧F9)" tabindex="-1" data-focusable="true"></a></div></div>
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
});
</script>

<style scoped></style>