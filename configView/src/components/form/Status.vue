<template>
  <div :id="id">

		<p>
			<span v-if="ok" class="strong">✓</span><span v-else class="strong">✗</span>
			<span class="strong"> Status:</span> {{ statusText }}
		</p>
	</div>
</template>

<script>
export default {
  props: {
    id: {
      type: String,
      required: true
    },
    statusText: {
      type: String,
      required: false
    },
		ok: {
			type: Boolean,
			required: false
		}
  },
}
</script>

<style scoped>
	.strong {
		font-weight: bold;
	}
</style>