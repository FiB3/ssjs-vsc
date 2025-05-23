<script setup>
import { ref, reactive, onMounted, provide } from 'vue'
import Config from './components/Config.vue'
import Templating from './components/Templating.vue'
import Changelog from './components/Changelog.vue'

let currentTab = ref('config');
let reloadActive = ref(false);
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

const appStats = ref({
	apiCallsCount: 0,
	createdDate: `Unknown`
});

function autoShowSwitch() {
	vscode.postMessage({
		command: 'autoOpenChange',
		value: autoOpenEnabled.value
	});
}

function reloadConfig() {
	vscode.postMessage({
		command: 'reloadConfig'
	});

	reloadActive.value = true;
	setTimeout(() => {
		reloadActive.value = false;
	}, 1000);
}

onMounted(() => {
	vscode.postMessage({
		command: 'initialized'
	});
	vscode.postMessage({
		command: 'getStats'
	});

	window.addEventListener('message', event => {
		const message = event.data;
		switch (message.command) {
			case 'init':
				console.log(`INIT Response:`, message);
				appInfo.value.workspaceSet = message.workspaceSet;
				autoOpenEnabled.value = message.showPanelAutomatically;
				break;
			case 'stats':
				console.log(`STATS Response:`, message.data);
				appStats.value.apiCallsCount = message.data.apiCalls;
				// NOTE: could improve the format (like: 1s ago...)
				appStats.value.createdDate = new Date(message.data.createdDate).toUTCString()
				break;
		}
	});
})

function goToChangelog() {
	currentTab.value = 'changelog';
	vscode.postMessage({
		command: 'loadChangelog'
	});
}
</script>

<template>
  <div>
		<header>
			<div class="header-content">
				<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/logo.v1.2.png" class="header-icon" />
				<h1 class="header-title">SSJS Manager</h1>
				<button :class="{ 'refresh-button': true, 'active': reloadActive }" @click="reloadConfig">
					<span class="gg-sync" title="Refresh Config"></span>
				</button>
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
				>
					Templating
				</button>
				<button
					class="tab"
					:class="{ 'tab-selected': currentTab === 'changelog' }"
					@click="goToChangelog()"
				>
					Latest Changes
				</button>
			</nav>
		</header>

    <main>
      <Config v-show="currentTab === 'config'" />
      <Templating v-show="currentTab === 'templating'" />
      <Changelog v-show="currentTab === 'changelog'" />
    </main>

		<footer>
			<div class="app-stats">
				<p :title="'Count of API Calls used by the extension since: ' + appStats.createdDate + '.'">
					API Calls: {{ appStats.apiCallsCount }}
				</p>
			</div>

			<div class="config-other">
				<div id="auto-show-switch-container">
					<input id="auto-show-switch" type="checkbox" v-model="autoOpenEnabled" @change="autoShowSwitch()" />
					<label for="auto-show-switch">Show this panel automatically.
					</label>
				</div>
				<div id="bug-link-container">
					<a class="bug-link" href="https://github.com/fib3/ssjs-vsc/issues">
						<span class="gg-debug"></span>
						<span>Report bug of request feature.</span>
					</a>
				</div>
			</div>
		</footer>
  </div>
</template>

<style scoped>
	main {
		margin-bottom: 90px;
	}

	button {
		color: inherit;
	}

	button:disabled {
		color: #ccc;
	}

	.header-content {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.header-icon {
		width: 50px;
		height: 50px;
	}

	.header-title {
		margin-left: 10px;
		flex-grow: 1;
	}

	.refresh-button {
		background: transparent;
		border: none;
		cursor: pointer;
		padding: 5px;
		margin-right: 10px;
	}

	.refresh-button:hover {
		opacity: 0.8;
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
		position: fixed;
		bottom: 0;
		left: 0;
		width: 100%;
		padding: 10px 0px;
		background-color: var(--vscode-editorWidget-background, #ccc);

		display: inherit;
	}

	footer .app-stats {
		margin-left: 10px;
		float: left;
    width: fit-content;
	}

	footer .config-other {
		margin-right: 10px;
		float: right;
	}

	#auto-show-switch {
		margin: 5px 10px 5px 5px;
		width: 12px;
		height: 12px;
	}

	label#auto-show-switch {
		width: fit-content;
	}

	.bug-link {
		display: flex;
		align-items: center;
		text-decoration: none;
		color: inherit;
		padding: 0px;
	}

	.bug-link span:first-child {
		margin: 5px 10px 5px 5px;
	}

	/* Thanks to: https://github.com/astrit/css.gg */
	.gg-debug {
		box-sizing: border-box;
		position: relative;
		display: block;
		transform: scale(var(--ggs,1));
		width: 12px;
		height: 18px;
		border: 2px solid;
		border-radius: 22px
	}
	.gg-debug::after,
	.gg-debug::before {
		content: "";
		display: block;
		box-sizing: border-box;
		position: absolute
	}
	.gg-debug::before {
		width: 8px;
		height: 4px;
		border: 2px solid;
		top: -4px;
		border-bottom-left-radius: 10px;
		border-bottom-right-radius: 10px;
		border-top: 0
	}
	.gg-debug::after {
		background: currentColor;
		width: 4px;
		height: 2px;
		border-radius: 5px;
		top: 4px;
		left: 2px;
		box-shadow:
		0 4px 0,
		-6px -2px 0,
		-6px 2px 0,
		-6px 6px 0,
		6px -2px 0,
		6px 2px 0,
		6px 6px 0
	}

	.gg-sync {
		box-sizing: border-box;
		position: relative;
		display: block;
		transform: scale(var(--ggs, 1));
		border-radius: 40px;
		border: 2px solid;
		margin: 1px;
		border-left-color: transparent;
		border-right-color: transparent;
		width: 18px;
		height: 18px;
	}
	.gg-sync::after,
	.gg-sync::before {
		content: "";
		display: block;
		box-sizing: border-box;
		position: absolute;
		width: 0;
		height: 0;
		border-top: 4px solid transparent;
		border-bottom: 4px solid transparent;
		transform: rotate(-45deg);
	}
	.gg-sync::before {
		border-left: 6px solid;
		bottom: -1px;
		right: -3px;
	}
	.gg-sync::after {
		border-right: 6px solid;
		top: -1px;
		left: -3px;
	}

	.gg-sync:hover {
		opacity: 0.8;
		cursor: pointer;
		transition: opacity 0.3s ease;
		transform: scale(1.1);
	}

	.refresh-button.active .gg-sync {
		transform: rotate(-180deg);
		transition: transform 0.6s ease;
		animation: rotate 1s linear infinite;
	}

	@keyframes rotate {
		0% {
			transform: rotate(0deg);
		}
	}
</style>