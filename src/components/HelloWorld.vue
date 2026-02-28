<template>
  <section>
    <h1>{{ msg }}</h1>
    <p>Edit <code>src/App.vue</code> to get started.</p>
  </section>
</template>

<script>
export default {
  name: 'HelloWorld',
  props: {
    msg: { type: String, default: 'Hello' }
  }
}
</script>
