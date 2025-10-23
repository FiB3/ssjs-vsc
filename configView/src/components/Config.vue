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
	{ value: 'token', text: 'Token-Protected (Token in URL / Headers)' },
	{ value: 'basic', text: 'Login Form (Basic-Auth)' },
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
	status: 'Not Deployed or validated.',
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
	pageSecurity: 'token',
	pageOk: false,
	textUrl: '',
	textSecurity: 'token',
	textOk: false
});

let testingConfiguration = ref({
	running: false,
	status: 'Testing Configuration...'
})

const overall = computed(() => {
	let ok = workspaceStatus.value.ok && sfmcApiStatus.value.ok && folderStatus.value.ok && devPagesStatus.value.ok && anyScriptsDeployedStatus.value.ok;
	let minutesToFinish = 0;
	if (!ok) {
		minutesToFinish = 15;
		minutesToFinish -= !workspaceStatus.value.ok ? 0 : 1;
		minutesToFinish -= !sfmcApiStatus.value.ok ? 0 : 5;
		minutesToFinish -= !folderStatus.value.ok ? 0 : 2;
		minutesToFinish -= !devPagesStatus.value.ok ? 0 : 4;
		minutesToFinish -= !anyScriptsDeployedStatus.value.ok ? 0 : 3;
	}
	return {
		ok,
		status: ok ? 'All Configured.' : 'Not Configured',
		minutesToFinish: minutesToFinish
	};
});

function validateConnection() {
	let redactedSfmc = { ...sfmc.value };
	if (typeof redactedSfmc.clientSecret === 'string' && redactedSfmc.clientSecret.length > 4) {
		redactedSfmc.clientSecret = redactedSfmc.clientSecret.substring(0, 2) + '*******' + redactedSfmc.clientSecret.substring(redactedSfmc.clientSecret.length - 2);
	}
	console.log('validateConnection', JSON.stringify(redactedSfmc));

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

/**
 * Validate, if the Cloud Page and Text Resource are set.
 * Does not check the validity of the URLs - use: `validateDevAssets` event for that.
 * @param message 
 */
function validateAnyScriptConfig(message) {
	if (message.cloudPageData?.devPageUrl && message.cloudPageData?.devAuth) {
		resources.value.pageUrl = message.cloudPageData.devPageUrl;
		resources.value.pageSecurity = message.cloudPageData.devAuth;
		if (message.cloudPageData.devSnippetId) {
			resources.value.pageOk = true;
		}
	}
	if (message.textResourceData?.devPageUrl && message.textResourceData?.devAuth) {
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

function testConfigufation() {
	testingConfiguration.value.running = true;
	vscode.postMessage({
		command: 'testConfigufation'
	});
}

function copyResourceCode(devPageContext = 'page') {
	vscode.postMessage({
		command: 'copyResourceCode',
		devPageContext
	});
}

function checkManualStep() {
	vscode.postMessage({
		command: 'validateDevAssets'
	});
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

			if (message.sfmc) {
				sfmcApiStatus.value.ok = true;
				sfmcApiStatus.value.status = sfmcApiStatus.value.ok
						? 'SFMC Connection Set.'
						: 'SFMC Connection not set. This is required to work with the extension.';
			}
			
			if (message.configFileExists && message.sfmc) {
				sfmc.value = message.sfmc;
			}
			if (message.configFileExists && message.folder && message.folder.id) {
				folderStatus.value.ok = true;
				folderStatus.value.status = `Folder exists: ${message.folder.folderPath}.`;
				folder.value.parentName = message.folderNames.parent;
				folder.value.newName = message.folderNames.folder;
			}
			validateAnyScriptConfig(message);
			anyScriptsDeployedStatus.value.ok = message.anyScriptsDeployed;
			anyScriptsDeployedStatus.value.status = message.anyScriptsDeployed ? 'Deployed.' : 'Not Deployed or validated.';
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
		case 'devAssetsValidated':
			console.log(`Dev Assets Validated Response:`, message);
			anyScriptsDeployedStatus.value.ok = message.ok;
			anyScriptsDeployedStatus.value.status = message.status;
			break;
		case 'updateTestingConfigurationStatus':
			testingConfiguration.value.running = message.running;
			testingConfiguration.value.status = message.status;
			break;
	}
});

function emptyfy(value) {
	return !value || (typeof(value) === 'string' && value.trim() === '') ? false : value;
}
</script>

<template>
  <div class="greetings">
		<!-- v-if="overall.ok" -->
		<div  class="test-configufation-section">
			<h3>Test Configuration</h3>
			<p>
				To ensure everything is set up correctly, you can test the configuration.
			</p>
			<Button
					id="test-configufation-button"
					 text="Test Configuration."
					:disabled="testingConfiguration.running"
					@click="testConfigufation()"
				/>
			<p v-if="testingConfiguration.running">{{ testingConfiguration.status }}</p>
		</div>

		<Status id="configStatus" :statusText="overall.status" :ok="overall.ok" />
		<p v-if="!overall.ok">{{ overall.minutesToFinish }} minutes remaining</p>
		<div v-if="!overall.ok" class="hint">
			<p>
				To utilize the SSJS Manager fully (including Preview in VSCode), configuration is necessary.
				<br/>
				This is a one-time setup per project (project should be related to a single MC Business Unit).
				<br/>
				NOTE: "Commands" are available via the Command Palette (Ctrl+Shift+P or CMD+Shift+P or F1).
			</p>
		</div>

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
				<!-- <div class="lock"></div> -->
      </template>
      <template #content>
				<form id="sfmcConnection">
					<div>
						<div class="hint">
							<p>
								We require your Salesforce Marketing Cloud API keys for account connection.
								<br/>
								To obtain your API keys, create a new installed package in your SFMC account.
								<br/>
								We suggest creating a new package for each developer.
								<br/>
								The Installed Package should be of Server-to-Server type.
								<br/>
								The minimum required scopes (currently) are:
							</p>
							<ul>
								<li>Email: write</li>
								<li>Saved Content: write</li>
								<li>Documents and Images: read & write</li>
							</ul>

							<!-- <div class="lock"></div> -->
							<p>
								The Secret is safe and sound in your OS and we never see it!
							</p>
						</div>
						<!-- TODO: lock -->
						

						<Input
								id="subdomain"
								inputType="text"
								title="Subdomain / Auth URL"
								description="Provide Subdomain or Auth URL of SFMC instance."
								placeholder="e.g.: https://YOUR_SUBDOMAIN.auth.marketingcloudapis.com/"
								v-model="sfmc.subdomain"
							/>

						<Input
								id="clientId"
								inputType="text"
								title="Client ID"
								description="Provide Client ID of your Installed Package."
								placeholder="Your Client ID"
								v-model="sfmc.clientId"
							/>

						<Input
								id="clientSecret"
								inputType="password"
								title="Client Secret"
								description="This is stored securely within your OS."
								placeholder="Provide Client Secret of your Installed Package."
								v-model="sfmc.clientSecret"
							/>

							<Input
									id="mid"
									inputType="text"
									title="MID"
									description="Your Business Unit MID. You can leave it empty, if you want to work with the BU that created the package."
									placeholder="Business Unit MID"
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
								description="Folder, where to create the new folder. Defaults to 'Content Builder' (if empty). Don't set if using existing folder."
								placeholder="Folder Name in Content Builder (optional)."
								v-model="folder.parentName"
							/>

							<Input
									id="newFolder"
									inputType="text"
									title="Folder Name"
									description="Folder, within which we will store the assets - new or existing."
									placeholder="Name of new or existing folder."
									v-model="folder.newName"
								/>

						<div>
							<Button id="createFolder" @click="createFolder()" text="Create/Set Folder" />
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
								placeholder="e.g.: https://YOUR_SUBDOMAIN.pub.sfmc-content.com/page-abcd1234"
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
								placeholder="e.g.: https://YOUR_SUBDOMAIN.pub.sfmc-content.com/resource-abcd1234"
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
							Once the content is filled, publish both. Your task is almost done!
						</p>
						<ul>
							<li>./vscode/deploy.me.page.ssjs</li>
							<li>./vscode/deploy.me.text.ssjs</li>
						</ul>
					</div>
					<div>
						<Button id="getCloudPageCode" @click="copyResourceCode('page')" text="Get Cloud Page Code" />
						<br/>
						<Button id="getTextResourceCode" @click="copyResourceCode('text')" text="Get Text Resource Code" />
					</div>
					
					<br/>
					<div>
						<p>Last step!</p>
						<Button id="anyScriptsDeployed" @click="checkManualStep()" text="Validate deployed content." />
					</div>
					<Status id="anyScriptsDeployedStatus" :statusText="anyScriptsDeployedStatus.status" :ok="anyScriptsDeployedStatus.ok" />
				</div>
      </template>
			<template #right-side>	
				<div>
					<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/walkthrough/setCloudPage.png" />
				</div>
      </template>
    </AccordionSection>
		<AccordionSection :ok="overall.ok">
      <template #title v-if="overall.ok">
				Read the ... Manual
      </template>
			<template #title v-else>
				Some steps are missing...
			</template>
      <template #content>
				<div v-if="overall.ok" id="develop">
					<div class="hint">

						<p>Ready to develop SSJS code!
							<br/>
							Here are some tips to get you started:
						</p>
						<ul>							
							<li>Use `.ssjs`, `.amp`, or `.html` files.</li>
							<li>First deployment via `SSJS: Upload Script` command<sup>1</sup>.</li>
							<li>Don't forget to choose the way you want to preview your script when asked (you can change this later via `SSJS: Change Script Options`).</li>
							<li>For your automation scripts or APIs we recommend using Text Resource, for Cloud Pages use Cloud Page.</li>
							<li>Subsequent deployments automatic on file save<sup>2</sup>, unless disabled in settings<sup>3</sup>.</li>
							<li>Run using `SSJS: Run` command (or the "play" icon next to the file tabs) to preview directly in VSCode.</li>
							<li>Get page parameters to clipboard with `SSJS: Get Dev Path` command.</li>
						</ul>
						<hr>
						<p>
							<sup>1</sup>Ctrl+Shift+P or CMD+Shift+P or F1, then start to type the command name.
							<br/>
							<sup>2</sup>Save: Ctrl + S or CMD + S.
							<br/>
							<sup>3</sup>Disable in: Preferences > Extensions > SSJS Manager > Editor: Auto Save. New (cloud) icon is available in the top right corner of the editor.
						</p>

					</div>
				</div>
				<div>
					<p>Complete previous steps to gain access to the full functionality! And usage guide.</p>
				</div>
			</template>
			<template #right-side>	
				<div>
					<img src="https://raw.githubusercontent.com/FiB3/ssjs-vsc/main/images/ssjs-vsc-demo2.0.gif" />
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


	.lock {
    display: inline-block;
    vertical-align: middle;
    background: currentColor;
    border-radius: 3px;
    width: 25px;
    height: 17px;
    margin-top: 5px;
    margin-left: 5px;
    position: relative;
	}

	.lock:before {
    content: "";
    display: inline-block;
    position: absolute;
    border:3px solid currentColor;
    top: -13px;
    left: 2.3px;
    width: 14px;
    height: 21px;
    border-radius: 35px 35px 0 0;
	}

</style>
