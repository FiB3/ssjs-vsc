<template>
	<a
			:id="id"
			:href="'#' + id"
			role="button"
			
			:class="['monaco-button', 'setting-item-extension-toggle-button', 'monaco-text-button', { 'disabled': disabled }]"
			tabindex="-1"  data-focusable="true"
			style="color: var(--vscode-button-foreground); background-color: var(--vscode-button-background);"
		>{{ text }}</a>
</template>
<script>
export default {
  props: {
    id: {
      type: String,
      required: true
    },
    text: {
      type: String,
      required: true
    },
		disabled: {
			type: Boolean,
			required: false
		}
  },
  methods: {
  }
}
</script>

<style scoped>
	a {
		max-width: 250px;
	}

	a.disabled {
		pointer-events: none;
	}
</style>