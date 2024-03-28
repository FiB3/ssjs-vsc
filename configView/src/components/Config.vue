<script setup>
import { ref, reactive, inject, computed } from 'vue'
import Accordion from './Accordion/Accordion.vue'
import AccordionSection from './Accordion/AccordionSection.vue'
import Button from './form/Button.vue'
import Input from './form/Input.vue'
import Select from './form/Select.vue'
import Checkbox from './form/Checkbox.vue'
import Status from './form/Status.vue'

const vscode = inject('vscode');
const securityOptions = ref([
	{ value: 'token', text: 'Token-Protected' },
	{ value: 'basic', text: 'Basic-Auth' },
	{ value: 'auth', text: 'None' }
]);

let providerStatus = ref({
	ok: false,
	status: 'Unsupported Code Provider.'
});
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
	status: 'Not Configured',
});
let anyScriptsDeployedStatus = ref({
	ok: false,
	status: 'Not Deployed (check me once done).',
});
let devReadStatus = reactive({
	ok: false,
	status: 'READ ME.',
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

let resources = ref({
	pageUrl: '',
	pageSecurity: '',
	pageOk: false,
	textUrl: '',
	textSecurity: '',
	textOk: false
});

const overall = computed(() => {
	let ok = workspaceStatus.value.ok && sfmcApiStatus.value.ok && folderStatus.value.ok && devPagesStatus.value.ok && anyScriptsDeployedStatus.value.ok && devReadStatus.ok;
	return {
		ok,
		status: ok ? 'All Configured.' : 'Not Configured'
	};
});

function validateConnection() {
	console.log('validateConnection', JSON.stringify(sfmc.value));
	vscode.postMessage({
		command: 'validateConnection',
		...sfmc.value
	});
}

function createFolder() {
	console.log('createFolder', JSON.stringify(folder.value));
	vscode.postMessage({
		command: 'createFolder',
		...folder.value
	});
}

function setAnyScript() {
	let pagesData = [];
	if (emptyfy(resources.value.pageUrl) && emptyfy(resources.value.pageSecurity)) {
		pagesData.push({
			devPageContext: 'page',
			url: emptyfy(resources.value.pageUrl),
			authOption: resources.value.pageSecurity
		});
	}

	if (emptyfy(resources.value.textUrl) && emptyfy(resources.value.textSecurity)) {
		pagesData.push({
			devPageContext: 'text',
			url: emptyfy(resources.value.textUrl),
			authOption: emptyfy(resources.value.textSecurity)
		});
	}

	vscode.postMessage({
		command: 'setAnyScript',
		pagesData
	});
}

function validateAnyScriptConfig(message) {
	if (message.cloudPageData.devPageUrl && message.cloudPageData.devAuth) {
		resources.value.pageUrl = message.cloudPageData.devPageUrl;
		resources.value.pageSecurity = message.cloudPageData.devAuth;
		if (message.cloudPageData.devSnippetId) {
			resources.value.pageOk = true;
		}
	}
	if (message.textResourceData.devPageUrl && message.textResourceData.devAuth) {
		resources.value.textUrl = message.textResourceData.devPageUrl;
		resources.value.textSecurity = message.textResourceData.devAuth;
		if (message.textResourceData.devSnippetId) {
			resources.value.textOk = true;
		}
	}
	if (resources.value.pageOk && resources.value.textOk) {
		devPagesStatus.value.ok = true;
		devPagesStatus.value.status = 'Resources Set.';
	}
}

function copyResourceCode(devPageContext = 'page') {
	vscode.postMessage({
		command: 'copyResourceCode',
		devPageContext
	});
}

function checkManualStep() {
	vscode.postMessage({
		command: 'manualStepDone',
		anyScriptsDeployed: anyScriptsDeployedStatus.value.ok,
		devRead: devReadStatus.ok
	});

	anyScriptsDeployedStatus.value.status = anyScriptsDeployedStatus.value.ok ? 'Deployed.' : 'Not Deployed (check me once done).';
	devReadStatus.status = devReadStatus.ok ? 'Read.' : 'Not Read (check me once done).';
}

function checkCodeProviders(codeProvider) {
	if (codeProvider === 'Asset') {
		return true;
	}
	// disable UI:
	providerStatus.value.ok = false;

	if (codeProvider === 'Server') {
		providerStatus.value.status = 'Server Code Provider is not supported within UI.';
	} else {
		providerStatus.value.status = 'Only Asset Code Provider is currently supported within UI.';
	}
	return false;
}

window.addEventListener('message', event => {
	const message = event.data;
	switch (message.command) {
		case 'init':
			console.log(`INIT Response 2:`, message);
			if (!checkCodeProviders(message.codeProvider)) {
				return false;
			}
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
			validateAnyScriptConfig(message);
			anyScriptsDeployedStatus.value.ok = message.anyScriptsDeployed;
			anyScriptsDeployedStatus.value.status = message.anyScriptsDeployed ? 'Deployed.' : 'Not Deployed (check me once done).';
			devReadStatus.ok = message.devRead;
			devReadStatus.status = message.devRead ? 'Read.' : 'Not Read (check me once done).';
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
		case 'anyScriptsSet':
			console.log(`Any Script Set Response:`, message);
			// validateAnyScriptConfig(message);
			devPagesStatus.value.ok = message.ok;
			devPagesStatus.value.status = message.status;
			break;
	}
});

function emptyfy(value) {
	return !value || (typeof(value) === 'string' && value.trim() === '') ? false : value;
}
</script>

<template>
  <div class="greetings">
		<div class="hint">
			<p>
				To utilize the SSJS Manager fully (including code previews within SFMC), configuration is necessary.
				<br/>
				This is a one-time setup per project.
				<br/>
				We'll provide step-by-step guidance on this screen.
				<br/>
				NOTE: Commands are available via the Command Palette (Ctrl+Shift+P or CMD+Shift+P or F1).
			</p>
		</div>
		<Status id="configStatus" :statusText="overall.status" :ok="overall.ok" />

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
							A Visual Studio Code workspace is essentially the folder you're working in. 
							<br/>
							It's vital for extensions to function correctly and for organizing projects, customizing settings, and more.
						</p>
						<p>
							To create a workspace, simply open a folder in VSCode. 
							<br/>
							You can do this via "File" > "Open Folder" or using the "Explorer" on the left sidebar > "Open Folder".
						</p>
					</div>
					<Status id="workspaceStatus" :statusText="workspaceStatus.status" :ok="workspaceStatus.ok" />
				</div>
      </template>
			<template #right-side>	
				<div>
					<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/walkthrough/noWorkspace.png" />
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
								We require your Salesforce Marketing Cloud API keys for account connection.
								<br/>
								The Client Secret is securely stored in VSCode Secret Storage and is only transmitted to the SFMC Auth API.
								<p>
									To obtain your API keys, create a new installed package in your SFMC account.
								</p>
								We suggest creating a new package for each developer.
								<br/>
								The Installed Package should be of Server-to-Server type.
								<br/>
								The minimum required scopes (currently) are:
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
			<template #right-side>	
				<div>
					<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/walkthrough/installedPackage.png" />
				</div>
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
								SSJS Manager needs to create a new folder in Content Builder to store the assets.
								<br/>
								This is to keep your assets organized.
							</p>
						</div>

						<Input
								id="parentFolder"
								inputType="text"
								title="Parent Folder Name"
								description="Folder, within which to create the new folder. Defaults to 'Content Builder' (if empty)."
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
			<template #right-side>	
				<div>
					<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/walkthrough/assetFolder.png" />
				</div>
      </template>
    </AccordionSection>
		<!-- CLOUD PAGES -->
		<AccordionSection :ok="devPagesStatus.ok">
      <template #title>
        Cloud Page Resources
      </template>
      <template #content>
				<div id="cloudPageResources">
					<div class="hint">
						<p>
							To preview your code in SFMC, create a Cloud Page and a Text Code Resource.
							<br/>
							Navigate to "Web Studio" > "Cloud Pages" > Choose Collection (preferably your dev Collection).
							<br/>
							Add a Cloud Page via "Add Content" > "Landing Page" (leave the template empty).
							<br/>
							Also, create a Text Code Resource via "Add Content" > "Code Resource" > "Text" (leave content empty).
							<br/>
							You will need the published URLs of both.
						</p>
					</div>

					<form id="cloudPageResources">
						
						<Input
								id="pageUrl"
								inputType="url"
								title="Cloud Page Url"
								description="URL of the Cloud Page you've created."
								v-model="resources.pageUrl"
							/>

						<Select
								id="pageSecurity"
								title="Cloud Page Security"
								description="Security mechanism for the Cloud Page you've created."
								:options="securityOptions"
								v-model="resources.pageSecurity"
							/>

						<Input
								id="textUrl"
								inputType="url"
								title="Cloud Text Resource Url"
								description="URL of the Cloud Text Resource you've created."
								v-model="resources.textUrl"
							/>

						<Select
								id="textSecurity"
								title="Text Resource Security"
								description="Security mechanism for the Cloud Text Resource you've created."
								:options="securityOptions"
								v-model="resources.textSecurity"
							/>

						<div>
							<Button id="setAnyScript" @click="setAnyScript()" text="Set Dev Resources" />
						</div>
						<Status id="createFolderStatus" :statusText="devPagesStatus.status" :ok="devPagesStatus.ok" />
					</form>
				</div>
      </template>
			<template #right-side>	
				<div>
					<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/walkthrough/createCloudPage.png" />
				</div>
      </template>
    </AccordionSection>
		<AccordionSection :ok="anyScriptsDeployedStatus.ok">
      <template #title>
        Deploy Cloud Page & Text Resource
      </template>
      <template #content>
				<div id="develop">
					<div class="hint">
						<p>
							After successful creation, populate both the Cloud Page and Text Resource with the provided content.
							<br/>
							You can access the content in the following files or via buttons below.
							<br/>
							Once the content is filled, publish both. Your task is complete!
							<ul>
								<li>./vscode/deploy.me.page.ssjs</li>
								<li>./vscode/deploy.me.text.ssjs</li>
							</ul>
						</p>
					</div>
					<div>
						<Button id="getCloudPageCode" @click="copyResourceCode('page')" text="Get Cloud Page Code" />
						<br/>
						<Button id="getTextResourceCode" @click="copyResourceCode('text')" text="Get Text Resource Code" />
					</div>
					<!-- TODO: Checkbox -->
					<br/>
					<Checkbox
							id="anyScriptsDeployed"
							title="Scripts deployed?"
							description="I have deployed both scripts to SFMC per instructions."
							v-model="anyScriptsDeployedStatus.ok"
							@change="checkManualStep()"
						/>
				</div>
      </template>
			<template #right-side>	
				<div>
					<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/walkthrough/setCloudPage.png" />
				</div>
      </template>
    </AccordionSection>
		<AccordionSection :ok="devReadStatus.ok">
      <template #title>
        Develop
      </template>
      <template #content>
				<div id="develop">
					<div class="hint">
						<p>
							Ready to develop SSJS code!
							<br/>
							Use `.ssjs`, `.amp`, or `.html` files.
							<br/>
							First deployment via `SSJS: Upload Script` command (Ctrl+Shift+P or CMD+Shift+P or F1, then type command name).
							<br/>
							Subsequent deployments automatic on file save (Ctrl + S or CMD + S).
							<br/>
							Run in Cloud Page or Resource - one page for all scripts!
							<br/>
							Get page parameters to clipboard with `SSJS: Get Dev Path` command.
						</p>
					</div>

					<Checkbox
							id="devRead"
							title="Dev Instructions Read?"
							description="I have read the dev instuctions."
							v-model="devReadStatus.ok"
							@change="checkManualStep()"
						/>
				</div>
			</template>
			<template #right-side>	
				<div>
					<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo1.2.gif" />
				</div>
      </template>
    </AccordionSection>
  </Accordion>


  </div>
</template>

<style scoped>
	form {
		max-width: 400px;
	}

	img {
		width: 100%;
	}
</style>
