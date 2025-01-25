<template>
  <div :id="id">

		<p>
			<span v-if="ok" class="strong">✓</span><span v-else class="strong">✗</span>
			<span
					:class="ok ? 'status-ok' : 'status-nok'"
				>
				<span class="strong"> Status: </span>
					<span v-if="statusText.length > 50" class="status-nok-lighter"><br/>{{ statusText }}</span>
					<span v-else>{{ statusText }}</span>
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

	.status-nok-lighter {
		font-weight: 500;
		font-size: 0.9em;
	}
</style>