<script setup>
import { ref, inject, watch } from 'vue'
import Accordion from './Accordion/Accordion.vue'
import AccordionSection from './Accordion/AccordionSection.vue'
import Button from './form/Button.vue'
import Input from './form/Input.vue'
import Status from './form/Status.vue'

const vscode = inject('vscode');

let configStatus = ref('Not Configured')

let workspaceStatus = ref({
	ok: false,
	status: 'Workspace not set.'
});
let sfmcApiStatus = ref({
	ok: false,
	status: 'Not Configured'
});
let folderStatus = ref({
	ok: false,
	status: 'Not Configured'
});
let devPagesStatus = ref({
	ok: false,
	status: 'Not Configured'
});

let sfmc = ref({
	subdomain: '',
	clientId: '',
	clientSecret: '',
	mid: ''
});

let folder = ref({
	parentName: '',
	newName: ''
});

function validateConnection() {
	console.log('validateConnection', JSON.stringify(sfmc.value));
	vscode.value.postMessage({
		command: 'validateConnection',
		...sfmc.value
	});
}

function createFolder() {
	console.log('createFolder', JSON.stringify(folder.value));
	vscode.value.postMessage({
		command: 'createFolder',
		...folder.value
	});
}

window.addEventListener('message', event => {
	const message = event.data;
	switch (message.command) {
		case 'init':
			console.log(`INIT Response 2:`, message);
			workspaceStatus.value.ok = message.workspaceSet;
			workspaceStatus.value.status = message.workspaceSet ? 'Workspace set.' : 'Workspace not set. This is required to work with the extension.';
			sfmcApiStatus.value.ok = message.configFileExists;
			sfmcApiStatus.value.status = message.configFileExists ? 'SFMC Connection Set.' : 'SFMC Connection not set. This is required to work with the extension.';

			if (message.configFileExists && message.sfmc) {
				sfmc.value = message.sfmc;
			}
			if (message.configFileExists && message.folder && message.folder.id) {
				folderStatus.value.ok = true;
				folderStatus.value.status = `Folder exists: ${message.folder.folderPath}.`;
			}
			break;
		case 'connectionValidated':
			console.log(`Validation Response:`, message);
			sfmcApiStatus.value.ok = message.ok;
			sfmcApiStatus.value.status = message.workspaceSet ? 'SFMC Connection Set.' : message.status;
			break;
		case 'folderCreated':
			console.log(`Folder Created Response:`, message);
			folderStatus.value.ok = message.ok;
			folderStatus.value.status = message.status;
			break;
	}
});

</script>

<template>
  <div class="greetings">

		<Status id="configStatus" :statusText="configStatus" :ok="false" />

		<Accordion>
		<!-- WORKSPACE -->
    <AccordionSection :ok="workspaceStatus.ok">
      <template #title>
        VSCode Workspace
      </template>
      <template #content>
        <div id="workspace">
					<div class="hint">
						<p>
							A Visual Studio Code workspace is basically just the folder you are working in.
							<br/>
							It's required by many extensions to work properly, but also to organize projects, customize settings per project and more.
						</p>
						<p>
							To create a workspace you only need to open a folder in VSCode.
							<br/>
							You can do that either by: "File" > "Open Folder" or by using the "Explorer" on the left sidebar > "Open Folder".
						</p>
						<!-- TODO: add an image to demonstrate -->
					</div>

					<Status id="workspaceStatus" :statusText="workspaceStatus.status" :ok="workspaceStatus.ok" />
				</div>
      </template>
    </AccordionSection>
    <!-- SFMC API KEYS -->
		<AccordionSection :ok="sfmcApiStatus.ok">
      <template #title>
        SFMC API Keys
      </template>
      <template #content>
				<form id="sfmcConnection">
					<div>
						<div class="hint">
							<p>
								We need your Salesforce Marketing Cloud API keys to connect to your account.
								<br/>
								The Client Secret is safely stored in the VSCode Secret Storage. It is only transmitted to the SFMC Auth API.
							</p>
							<p>
								To get your API keys, you need to create a new installed package in your SFMC account.
								We recommend to create a new package for each developer.
								<br/>
								The Installed Package must be of Server-to-Server type.
								<br/>
								The minimum required scopes (at the moment) are:
								<ul>
									<li>Email: write</li>
									<li>Saved Content: write</li>
									<li>Documents and Images: read & write</li>
								</ul>
							</p>
						</div>

						<Input
								id="subdomain"
								inputType="text"
								title="Subdomain / Auth URL"
								description="Provide Subdomain or Auth URL of SFMC instance."
								v-model="sfmc.subdomain"
							/>

						<Input
								id="clientId"
								inputType="text"
								title="Client ID"
								description="Provide Client ID of your Installed Package."
								v-model="sfmc.clientId"
							/>

						<Input
								id="clientSecret"
								inputType="password"
								title="Subdomain / Auth URL"
								description="Provide Client Secret of your Installed Package."
								v-model="sfmc.clientSecret"
							/>

							<Input
									id="mid"
									inputType="text"
									title="MID"
									description="Your Business Unit MID. You can leave it empty, if you want to work with the BU that created the package."
									v-model="sfmc.mid"
								/>

						<div>
							<Button id="storeSfmcCreds" @click="validateConnection()" text="Store SFMC API Credentials" />
						</div>

						<Status id="sfmcApiStatus" :statusText="sfmcApiStatus.status" :ok="sfmcApiStatus.ok" />
					</div>
				</form>
      </template>
    </AccordionSection>
    <!-- CONTENT BUILDER -->
		<AccordionSection :ok="folderStatus.ok">
      <template #title>
        Folder in Content Builder
      </template>
      <template #content>
				<form id="assetFolder">
					<div>
						<div class="hint">
							<p>
								SSJS Manager needs to create a folder in Content Builder to store the assets.
								<br/>
								We could use the root folder, but it's better to keep things organized.
							</p>
						</div>

						<Input
								id="parentFolder"
								inputType="text"
								title="Parent Folder Name"
								description="Folder, within which we will create the new folder. Uses the 'Content Builder' folder if empty."
								v-model="folder.parentName"
							/>

							<Input
									id="newFolder"
									inputType="text"
									title="New Folder Name"
									description="Folder, within which we will store the assets."
									v-model="folder.newName"
								/>

						<div>
							<Button id="createFolder" @click="createFolder()" text="Create Folder" />
						</div>

						<Status id="createFolderStatus" :statusText="folderStatus.status" :ok="folderStatus.ok" />
					</div>
				</form>
      </template>
    </AccordionSection>
		<!-- CLOUD PAGES -->
		<AccordionSection :ok="devPagesStatus.ok">
      <template #title>
        Cloud Page Resources
      </template>
      <template #content>
				<div id="cloudPageResources">
					<p>
						<< TODO: >>
					</p>

					<form id="cloudPageResources">
						
						<div >
							<!-- select from two options -->
							<Input id="cloudPageResources" title="Cloud Page Resources" description="Select Cloud Page Resources" />
						</div>

						<div>
							<Button id="setDevResources" onclick="setDevResources()" text="Set Dev Resources" />
						</div>
					</form>
				</div>
      </template>
    </AccordionSection>

  </Accordion>


  </div>
</template>

<style scoped>

</style>
