<script setup>
import { ref } from 'vue'

const props = defineProps({
  disabled: {
		type: Boolean,
	},
	ok: {
		Boolean
	}
});

let show = ref(false)

const toggleShow = () => {
  if (!props.disabled) {
    show.value = !show.value
  }
}
</script>

<template>
  <div>
    <div class="title" :class="{ 'title-open': show, 'title-disabled': props.disabled }" @click="toggleShow">
      <span>
				<span v-if="ok">✓</span><span v-else>✗</span>
				<slot name="title"></slot>
			</span>

      <div class="toggle-icon">
        <div class="plus" :class="{ 'plus-open': show }"></div>
      </div>
    </div>
    <div v-show="show" class="content">
      <slot name="content"></slot>
    </div>
  </div>
</template>

<style scoped>
.title {
  font-size: 1.5em;
  /* border: 1px solid black; */
	border-bottom-width: 1px;
	border-bottom-style: solid;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5em;
}

.toggle-icon {
  cursor: pointer;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background-color: #f2f2f2;
  display: flex;
  justify-content: center;
  align-items: center;
}

.plus {
  width: 12px;
  height: 2px;
  background-color: transparent;
  border: 1px solid black;
  position: relative;
  transition: transform 0.3s ease;
}

.plus::before {
  content: "";
  position: absolute;
  width: 2px;
  height: 12px;
  background-color: transparent;
  border: 1px solid black;
  left: 5px;
  top: -5px;
}

.toggle-icon {
  cursor: pointer;
}

.plus {
  width: 12px;
  height: 2px;
  background-color: black;
  position: relative;
  transition: transform 0.3s ease;
}

.plus::before {
  content: "";
  position: absolute;
  width: 2px;
  height: 12px;
  background-color: black;
  left: 4px;
  top: -6px;
}

.plus-open {
  transform: rotate(45deg);
}

.content {
  /* border: 1px solid; lightgray */
  padding: 0.5em;
}
</style>