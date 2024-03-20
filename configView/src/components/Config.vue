<script setup>
import { ref } from 'vue'

let showWorkspace = ref(false)
let showSfmcConnection = ref(false)
let showAssetFolder = ref(false)
let showDevResources = ref(false)

</script>

<template>
  <div class="greetings">
    <!-- <h1 class="green">{{ msg }}</h1> -->

		<p>Before you can start using the extension, you need to set up a few things:</p>

		<div id="workspace" v-show="showWorkspace === false">
			<h2>Create VSCode Workspace</h2>
			<p>
				A Visual Studio Code workspace is a collection of related files and folders opened together in the editor.
				<br/>
				It's required by many extensions to work properly, but also to organize projects, customize settings per project and more.
				<br/>
				To create a workspace, open a folder in Visual Studio Code. You can do that either by: "File" > "Open Folder" or by using the "Explorer" on the left sidebar > "Open Folder".
			</p>
		</div>

		<form id="sfmcConnection">
			<div>
				<h2>Store SFMC API Keys</h2>
				<p>
					<< TODO: Explanation, why this is needed, how the keys are secured & type of creds (server-to-server + min scopes) >>
				</p>
				
				<label for="subdomain">Subdomain / Auth URL:</label>
				<input id="subdomain" type="text">

				<div>
					<label for="clientId">Client ID:</label>
					<input id="clientId" type="text">

					<label for="clientSecret">Client Secret:</label>
					<input id="clientSecret" type="text">
				</div>

				<label for="mid">MID:</label>
				<input id="mid" type="text">

				<button type="button" onclick="validateConnection()">Store SFMC API Credentials</button>

				<p>Outcome: OK\/NOK</p>
			</div>
		</form>

		<div id="assets">
			<h2>Store SFMC API Keys</h2>
			<p>
				<< TODO: Explanation, why this is needed, how the keys are secured & type of creds (server-to-server + min scopes) >>
			</p>

			<label for="parentFolder">Parent folder Name:</label>
			<input id="parentFolder" type="text">

			<label for="assetFolder">New Folder Name:</label>
			<input id="assetFolder" type="text">

			<button type="button" onclick="validateConnection()">Create Content Builder Folder</button>
		</div>

		<div id="devResources">
			<h2>Set Dev Resrouces</h2>
			<p><< TODO: how to do this. >></p>
			<div>

			</div>
		</div>

  </div>
</template>

<style scoped>

</style>
