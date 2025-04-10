<script setup>
import { ref, reactive, inject, onMounted } from 'vue';
import Button from './form/Button.vue';
import Status from './form/Status.vue';
import InlineButton from './templating/InlineButton.vue';
import InlineInput from './templating/InlineInput.vue';
import InlineSelect from './templating/InlineSelect.vue';

const vscode = inject('vscode');

const valueType = ref([
	{ value: 'value', text: 'Value' },
	{ value: 'lib', text: 'Library/File' }
]);

const configurable = ref(true);

const templatingStatus = reactive({
	ok: true,
	value: 'No changes.'
});

const tags = ref([
	// just for dev:
	{
		key: 'IS_PROD',
		prod: 'true',
		dev: 'false',
		preview: 'false'
	},
	{
		key: 'ENV',
		prod: 'prod',
		dev: 'dev',
		preview: 'live-preview'
	},
	{
		key: 'LIB_TEST',
		type: 'lib',
		prod: 'file://./libs/testLib1.js',
		dev: 'file://./libs/testLib1.js',
		preview: 'file://./libs/testLib1.js'
	}
]);

function removeTag(lineNum) {
	console.log('Remove Tag:', lineNum);
	if (lineNum > -1) {
		tags.value.splice(lineNum, 1);
	}
}

function addTag() {
	tags.value.push({
		key: '',
		type: 'value',
		dev: '',
		prod: ''
	});
}

function saveTags() {
	console.log(`Saving templating:`, tags.value);
	// check for rows:
	let problem = false;

	const tagsToSave = tags.value.map(t => {
		// console.log(`Checking tag: "${emptyfy(t.key)}" => "${emptyfy(t.dev)}" (${typeof(emptyfy(t.dev))}) || "${emptyfy(t.prod)}" (${typeof(emptyfy(t.prod))})`);
		if (!emptyfy(t.key) || !emptyfy(t.dev) || !emptyfy(t.prod)) {
			templatingStatus.value = 'All tags must have a key and values. Please fill in all fields and try again.';
			templatingStatus.ok = false;
			problem = true;
			console.log(`Problem with tag:`, t);
			return t;
		}
		if (t.type === 'lib') {
			let prodVal = t.prod.trim();
			let devVal = t.dev.trim();
			let previewVal = t.preview.trim();
			
			t.prod = prodVal.startsWith('file://') ? prodVal : `file://${prodVal}`;
			t.dev = devVal.startsWith('file://') ? devVal : `file://${devVal}`;
			t.preview = previewVal.startsWith('file://') ? previewVal : `file://${previewVal}`;
		} else {
			t.prod = t.prod.trim();
			t.dev = t.dev.trim();
			t.preview = t.preview.trim();
		}
		return { ...t};
	});
	
	console.log(`Tags to save:`, !problem, tagsToSave);
	if (!problem) {
		vscode.postMessage({
			command: 'setTemplatingTags',
			tags: tagsToSave
		});
	}
}

window.addEventListener('message', event => {
	const message = event.data;
	switch (message.command) {
		case 'templatingInitialized':
			console.log(`Templating Initialized:`, message);
			message.tags.forEach(t => {
				console.log(`Tag:`, t);

				if (
					(typeof(t.prod) === 'string' && t.prod.startsWith('file://'))
					|| (typeof(t.dev) === 'string' && t.dev.startsWith('file://'))
					|| (typeof(t.preview) === 'string' && t.preview.startsWith('file://'))
				) {
					t.type = 'lib';
					console.log(`Tag is a library:`, t);
					t.prod = typeof(t.prod) === 'string' ? t.prod.replace('file://', '') : '';
					t.dev = typeof(t.dev) === 'string' ? t.dev.replace('file://', '') : '';
					t.preview = typeof(t.preview) === 'string' ? t.preview.replace('file://', '') : '';
				} else {
					t.type = 'value';
				}
			});
			tags.value = message.tags;
			configurable.value = message.configurable;

			templatingStatus.ok = true;
			templatingStatus.value = message.saved ? 'Saved.' : 'No changes.';
			break;
	}
});

window.addEventListener('resize', resizeScrollbar);
document.addEventListener('DOMContentLoaded', resizeScrollbar);

function resizeScrollbar() {
	console.log('Window resized');
	let container = document.querySelector('.tags');
	let content = document.querySelector('.tabs-container');
	let scrollbar = document.querySelector('.scrollbar-container');
	let thumb = document.querySelector('.scrollbar-thumb');

	let containerWidth = container.offsetWidth;
	let contentWidth = content.offsetWidth;
	let thumbWidth = (containerWidth / contentWidth) * 100;
	let thumbWidthPx = Math.floor(containerWidth * thumbWidth / 100);

	const scrollLeft = container.scrollLeft;

	let scrollRatio = scrollLeft / contentWidth;
	if (scrollRatio * 100 + thumbWidth > 100) {
		scrollRatio = 1 - (thumbWidth / 100);
	}

	thumb.style.width = `${thumbWidth > 0 && thumbWidth < 100 ? thumbWidth : 0}%`;
	thumb.style.left = `${scrollRatio * 100}%`;

	console.log('Thumb width:', Math.round(thumbWidth), '%, from:', thumbWidthPx, 'of:', containerWidth, 'left:', scrollRatio, 'scrollLeft:', scrollLeft);
}

function emptyfy(value) {
	return !value || (typeof(value) === 'string' && value.trim() === '') ? false : value;
}

onMounted(() => {
	vscode.postMessage({ command: 'templatingInit' });
	document.querySelector('.tags').addEventListener('scroll', () => {
		console.log('Scroll event');
		resizeScrollbar();
	});
});
</script>

<template>
	<div class="templating-form">
		<h2>Templating Tags</h2>
		<div class="hint">
			<p>
				Configure the <a href="https://fibworks.com/ssjs-vsc/4_templating" target="_blank">Tamplating Tags</a> for your project.
				<br/>
				You can use these tags to settings (like API keys) from your code...
				<br/>
				...and use "libraries" (files) for reusable snippets within your desktop workspace.
				Get the path by right-clicking the file in the Explorer and selecting "Copy Relative Path".
				<br/>
			</p>
		</div>

		<div class="form-group" v-if="configurable">
			<div class="tags">
				<div class="tabs-container">
					<div class="tags-header">
						<div class="tag-header-key">Key</div>
						<div class="tag-header-type">Type</div>
						<div class="tag-header-prod">Prod</div>
						<div class="tag-header-dev">Dev</div>
						<div class="tag-header-preview">Live Preview</div>
					</div>
					<div v-for="(key, index) in tags" :key="tags[index]" class="tag">
						<!-- Needs to use $index instead of tag.key to allow for proper key naming/renaming -->
						<InlineInput
								class="tag-input"
								:id="index + '-key-input'"
								type="text"
								v-model="tags[index].key"
								placeholder="Tag name"
							/>
						<InlineSelect
								class="tag-input"
								:id="index + '-type-selet'"
								v-model="tags[index].type"
								:options="valueType"
							/>
						<InlineInput
								class="tag-input tag-input-value"
								:id="index + '-prod-input'"
								type="text"
								v-model="tags[index].prod"
								placeholder="Prod value"
							/>
						<InlineInput
								class="tag-input tag-input-value"
								:id="index + '-dev-input'"		
								type="text"
								v-model="tags[index].dev"
								placeholder="Dev value"
							/>
							<InlineInput
									class="tag-input tag-input-value"
									:id="index + '-preview-input'"		
									type="text"
									v-model="tags[index].preview"
									placeholder="Live Preview value"
								/>
						<InlineButton
								class="remove-tag"
								id="index + '-remove'"
								@click="removeTag(index)"
								text="Remove"
							/>
					</div>
				</div>
			</div>
			<div class="scrollbar-container">
					<div class="scrollbar-track"></div>
					<div class="scrollbar-thumb"></div>
				</div>

			<div>
				<Button id="addTag" @click="addTag()" text="Add Row" />
				<br/>
				<Button id="Save" @click="saveTags()" text="Save" />
				<Status	:id="'templatingStatus'" :ok="templatingStatus.ok" :statusText="templatingStatus.value" />
			</div>
		</div>
		<div v-else>
			<h3>Workspace not configured.</h3>
		</div>
</div>
</template>

<style scoped>
	.tags {
		min-width: 500px;
		overflow-x: scroll; /* Force scrollbar to always show */
		padding-bottom: 12px;
		scrollbar-width: none;
	}

	.tabs-container {
		display: inline-block;
		min-width: 100%;
	}

	.scrollbar-container {
		position: relative;
		width: 100%;
		height: 4px;
	}

	.scrollbar-track {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: fit-content;
	}

	.scrollbar-thumb {
		position: absolute;
		top: 0;
		left: 0;
		width: 0%;
		height: 4px;
		background-color: var(--vscode-scrollbarSlider-background, lightgray);
		border-radius: 4px;
	}

	.tags-header, .tag {
		display: grid;
		grid-template-columns: 
				minmax(120px, 1fr)    /* Key */
				minmax(100px, 0.75fr) /* Type */
				minmax(150px, 1.3fr)  /* Prod */
				minmax(150px, 1.3fr)  /* Dev */
				minmax(150px, 1.3fr)  /* Preview */
				minmax(80px, 0.5fr);  /* Remove button */
		gap: 8px;
		align-items: center;
		padding: 4px 0;
	}

	.tags-header {
		font-weight: bold;
		border-bottom: 1px solid var(--vscode-panel-border);
		padding-bottom: 8px;
		margin-bottom: 8px;
	}

	.tag {
		/* Subtle visual separation between rows */
		padding: 4px 0;
	}

	.tag:hover {
		background-color: var(--vscode-list-hoverBackground);
	}

	/* Remove the now redundant width classes */
	.tag-input, 
	.tag-header-key, 
	.tag-header-prod, 
	.tag-header-dev, 
	.tag-header-preview,
	.tag-input-value,
	.remove-tag,
	select.tag-input, 
	.tag-header-type {
		width: 100%; /* Let grid handle the widths */
		max-width: none;
		margin-right: 0;
	}

	/* Add button styling */
	a#addTag {
		margin-top: 12px;
		width: 250px;
		max-width: none;
	}

	/* Container responsiveness */
	.templating-form {
		max-width: 100%;
		overflow-x: auto;
	}

	/* Optional: Sticky header */
	.tags-header {
		position: sticky;
		top: 0;
		background-color: var(--vscode-editor-background);
		z-index: 1;
	}
</style>