<script setup>
</script>

<template>
  <div>
		<div>
			<h2>v0.6.5: New Preview and Snippets</h2>
			<p>
				New Preview for Text resource. It allows for full interactivity, including JSON formatting and search. Handy information about the page processing are also included in the preview.
				<br/>
				New snippets (Platform Request).
			</p>
		</div>
		<div>
			<h2>v0.6.4: API Call Counter and Snippets</h2>
			<p>
				Counter for SFMC API calls.
				<br/>
				New snippets (WS Proxy filter examples, front-end JS in SSJS).
				<br/>
				Improved error message for when deploying duplicate assets.
				<br/>
				Replaced obsolete NPM modules to increase security.
			</p>
		</div>

		<div>
			<h2>v0.6.1: On-save hooks</h2>
			<p>
				On-save hooks that allow running terminal/command line commands before saving scripts to SFMC.
				<br/>
				This allows combining <strong>SSJS Manager</strong> with tools like <strong>generator-ssjs</strong>.
			</p>
		</div>
		
		<div>
			<h2>v0.5.1: Debug Panel</h2>

			<p>
				Speed up your development process with the new Debug Panel.
				<br/>
				Access this panel using the "SSJS: Run" or "Play" icon.
				<br/>
				The Debug Panel will show you the output of your script or Preview of your Cloud Page.
				<br/>
				This effectively replaces the need to open the browser for most of your testing.
				<br/>
				You can still open in the browser or copy the url to your clipboard using the preferences.
			</p>
		</div>

		<div>
			<h2>v0.4.5: Templating in Config Panel</h2>

			<p>
				Configure the Templating Tags for your project in the Config panel.
				<br/>
				Access this panel using the "SSJS: Show Config" command at any time and choose the "Templating" tab.
				<br/>
				<br/>
				You can also quickly open your script using the new "play" icon on the top right of the editor.
				<br/>
				The new preference option lets you choose if the code should be opened in the browser or it's url copied to your clipboard.
				<br/>
				<br/>
				Commands (in the command palette) are now filtered by the available features based on your current configuration.
			</p>
		</div>

		<div>
			<h2>v0.4.3: Visual Config for SSJS Manager</h2>

			<p>
				You can now visually configure your SSJS Manager settings in the Config panel.
				<br/>
				This panel will guide you through the configuration process step by step.
				<br/>
				Access this panel using the "SSJS: Show Config" command at any time.
				<br/>
				<br/>
				You will be soon able to configure the Templating tags for your project.
			</p>
		</div>
  </div>
</template>

<style scoped>

</style>