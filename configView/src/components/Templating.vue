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
	// {
	// 	key: 'IS_PROD',
	// 	prod: 'true',
	// 	dev: 'false',
	// 	preview: 'false'
	// },
	// {
	// 	key: 'ENV',
	// 	prod: 'prod',
	// 	dev: 'dev',
	// 	preview: 'live-preview'
	// },
	// {
	// 	key: 'LIB_TEST',
	// 	type: 'lib',
	// 	prod: 'file://./libs/testLib1.js',
	// 	dev: 'file://./libs/testLib1.js',
	// 	preview: 'file://./libs/testLib1.js'
	// }
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

function emptyfy(value) {
	return !value || (typeof(value) === 'string' && value.trim() === '') ? false : value;
}

onMounted(() => {
	vscode.postMessage({ command: 'templatingInit' });
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
				<Button id="addTag" @click="addTag()" text="Add Row" />
			</div>

			<div>
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
	.tags-header {
		display: flex;
		flex-direction: row;
		align-items: center;
		margin-bottom: 3px;
	}

	.tags-header > div {
		/* padding: 0 6px; */
		margin-right: 3px;
	}

	.tags > div {
		margin-bottom: 3px;
	}

	.tag-input, .tag-header-key, .tag-header-prod, .tag-header-dev, .tag-header-preview {
		width: 20%;
		max-width: 250px;
		margin-right: 3px;
	}

	/* .tag-header-key, .tag-header-prod, .tag-header-dev, .tag-header-preview {	
		width: calc(20% - 2*6px);
	} */

	.tag-input-value {
		width: 26%;
	}

	.remove-tag {
		margin-left: 7px;
		width: 10%;
		max-width: 120px;
		display: inline;
	}

	select.tag-input, .tag-header-type {
		width: 15%;
		max-width: 200px;
	}

	/* .tag-header-type {
		width: calc(15% - 12px);
	} */

	a#addTag {
		width: 20%;
		max-width: 250px;
	}
</style>