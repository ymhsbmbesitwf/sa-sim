Vue.component("card", {
  template: `
    <div class="outer" v-on:click="flip()">
        <div class="card front" v-bind:style="{ transform: flipped? 'rotateY(180deg)': 'none' }">
            <img :src="imageName">
        </div>
        <div class="card back" v-bind:style="{ transform: flipped? 'rotateY(180deg)': 'none' }">
            <img src="images/backside.png">
        </div>
    </div>
    `,
  props: {
    imageName: String
  },
  data() {
    return {
      flipped: false
    };
  },
  methods: {
    flip() {
      if (this.flipped) {
      } else {
        if (app.currentImages.length < 2) {
          this.flipped = true;
          this.$emit("sendcard", this);
        }
      }
    }
  }
});
