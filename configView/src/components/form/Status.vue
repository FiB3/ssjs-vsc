<template>
  <div :id="id">

		<p>Status: {{ statusText }}</p>
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

</style>