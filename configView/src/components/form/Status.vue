<template>
  <div :id="id">

		<p>
			<span v-if="ok" class="strong">✓</span><span v-else class="strong">✗</span>
			<span
					:class="ok ? 'status-ok' : 'status-nok'"
				>
				<span class="strong"> Status:</span> {{ statusText }}
			</span>
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

	.status-ok {
		font-weight: 100;
	}

	.status-nok {
		font-weight: bold;
		font-size: 1.20em;
	}
</style>