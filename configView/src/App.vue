<script setup>
import { ref, reactive, onMounted, provide } from 'vue'
import Config from './components/Config.vue'
import Templating from './components/Templating.vue'
import Changelog from './components/Changelog.vue'

import logoUri from './assets/logo.v1.2.png'

let currentTab = ref('config')
let autoOpenEnabled = ref(false)
let vscode;
setVsCodeReference();

function setVsCodeReference() {
	let vsc;
	if (typeof(acquireVsCodeApi) === "function") {
		vsc = acquireVsCodeApi();
	} else {
		vsc = {
			postMessage: data => {
				console.log("postMessage", data);
			}
		};
	}
	vscode = reactive(vsc);
	provide('vscode', vscode);
}

const appInfo = ref({
	workspaceSet: false
});

function autoShowSwitch() {
	vscode.postMessage({
		command: 'autoOpenChange',
		value: autoOpenEnabled.value
	});
}

onMounted(() => {
	vscode.postMessage({
		command: 'initialized'
	});

	window.addEventListener('message', event => {
		const message = event.data;
		switch (message.command) {
			case 'init':
				console.log(`INIT Response:`, message);
				appInfo.value.workspaceSet = message.workspaceSet;
				autoOpenEnabled.value = message.showPanelAutomatically;
				logoUri.value = message.logoUri;
				break;
		}
	});
})
</script>

<template>
  <div>
		<header>
			<div class="header-content">
				<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/logo.v1.2.png" class="header-icon" />
				<h1 class="header-title">SSJS Manager</h1>
			</div>

			<nav class="tab-nav">
				<button
					class="tab"
					:class="{ 'tab-selected': currentTab === 'config' }"
					@click="currentTab = 'config'"
				>
					Config
				</button>
				<button
					class="tab"
					:class="{ 'tab-selected': currentTab === 'templating' }"
					@click="currentTab = 'templating'"
					disabled
				>
					Templating
				</button>
				<button
					class="tab"
					:class="{ 'tab-selected': currentTab === 'changelog' }"
					@click="currentTab = 'changelog'"
					disabled
				>
					Changelog
				</button>
			</nav>
		</header>

    <main>
      <Config v-show="currentTab === 'config'" />
      <Templating v-show="currentTab === 'templating'" />
      <Changelog v-show="currentTab === 'changelog'" />
    </main>

		<footer>
			<label>
				<input type="checkbox" v-model="autoOpenEnabled" @change="autoShowSwitch()" />
				Show this panel automatically.
			</label>
			<!-- <p class="footnote">
				You can still access this panel using the "SSJS: Show Extension Config" command.
			</p> -->
		</footer>
  </div>
</template>

<style scoped>
	button {
		color: inherit;
	}

	button:disabled {
		color: #ccc;
	}

	.header-content {
		display: flex;
		align-items: center;
	}

	.header-icon {
		width: 50px;
		height: 50px;
	}

	.header-title {
		margin-left: 10px;
	}

	.tab-nav {
		display: flex;
	}

	.tab {
		flex: 1;
		padding: 10px;
		border: none;
		background: transparent;
		cursor: pointer;
		text-align: center;
		font-size: 16px;
		border-bottom: 2px solid transparent;
	}

	.tab-selected {
    font-weight: bold;
    border-bottom: 2px solid;
  }

	.tab:hover {
		border-bottom: 2px solid;
	}

	footer {
		position: absolute;
		/* left: 0; */
		right: 0;
		top: 0;
		/* width: calc(100% - 20px); */
		padding: 10px;
		background-color: inherit;
		opacity: 0.8;
		text-align: right;
	}

	.footnote {
		font-size: 0.8em;
	}
</style>
