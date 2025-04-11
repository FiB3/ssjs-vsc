<script setup>
import { onMounted, ref } from 'vue';
const changelog = ref('');

onMounted(() => {
	window.addEventListener('message', (event) => {
		if (event.data.command === 'changelogLoaded') {
			changelog.value = event.data.changelog;
		}
	});
});

// NOTE: `loadChangelog` called from `App.vue`
</script>

<template>
  <div>
		<div v-html="changelog"></div>
  </div>
</template>

<style scoped>
div {
	width: 100%;
	height: 100%;
}
</style>