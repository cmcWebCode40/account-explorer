<template>
  <div class="home mt-5">
    <div class="content">
      <h1>Account Explorer</h1>
      <p class="mt-1">
        Use this to search through your account. Search what account you have
        access to, and find the DIDs that you need.
      </p>
      <div class="content-search my-3">
        <search-input />
      </div>
      <pulse-loader v-if="loader" />
      <search-list
        v-else-if="profile.name"
        :profile="profile"
        :path="path"
        :url="[`/did/${profile.did}`]"
      />
    </div>
    <div class="landing-image">
      <img src="@/assets/images/Illustration_desktop.svg" alt="desktop" />
    </div>
  </div>
</template>
<script lang="ts">
import { defineComponent } from "vue";
import { mapState } from "vuex";
import { SearchList, SearchInput, PulseLoader } from "@/components";

export default defineComponent({
  name: "Home",
  components: {
    SearchList,
    SearchInput,
    PulseLoader,
  },
  data: () => ({
    path: "",
  }),
  computed: {
    ...mapState(["profile", "loader"]),
  },
  beforeMount() {
    this.path = this.$route.path;
  },
});
</script>
