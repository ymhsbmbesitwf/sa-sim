var app = new Vue({
  el: "#app",
  data: {
    imageFiles: [
      "images/ferrari.png",
      "images/ferrari.png",
      "images/alfa_romeo.png",
      "images/alfa_romeo.png",
      "images/haas.png",
      "images/haas.png",
      "images/renault.png",
      "images/renault.png",
      "images/red_bull.png",
      "images/red_bull.png",
      "images/alpha_tauri.png",
      "images/alpha_tauri.png",
      "images/mclaren.png",
      "images/mclaren.png",
      "images/racing_point.png",
      "images/racing_point.png"
    ],
    currentImages: [],
    flips: 0,
    currentTurn: 1,
    player1Score: 0,
    player2Score: 0,
    time: 0,
    timer: null,
    winner: null
  },
  created: function() {
    this.shuffle();
    this.startTimer();
  },
  methods: {
    shuffle() {
      /**
       * Shuffles array in place using Fisher-Yates shuffle algorithm.
       */
      for (let i = this.imageFiles.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this.imageFiles[i], this.imageFiles[j]] = [
          this.imageFiles[j],
          this.imageFiles[i]
        ];
      }
    },
    sendCard(image) {
      this.currentImages.push(image);
      this.checkCards();
      this.flips++;
    },
    checkCards() {
      if (this.currentImages.length === 2) {
        if (
          this.currentImages[0].imageName === this.currentImages[1].imageName
        ) {
          this.updateScore();
          app.currentImages = [];
          if (this.checkVictory()) {
            alert("Game is over!");
          }
        } else {
          setTimeout(function() {
            app.currentImages[0].flipped = false;
            app.currentImages[1].flipped = false;
            app.currentImages = [];
          }, 1000);
          this.updateTurn();
        }
      }
    },
    updateTurn() {
      if (this.currentTurn === 1) {
        this.currentTurn = 2;
      } else {
        this.currentTurn = 1;
      }
    },
    updateScore() {
      if (this.currentTurn === 1) {
        this.player1Score++;
      } else {
        this.player2Score++;
      }
    },
    startTimer() {
      this.timer = setInterval(() => {
        this.time++;
      }, 1000);
    },
    stopTimer() {
      clearInterval(this.timer);
    },
    checkVictory() {
      if (this.player1Score + this.player2Score === 8) {
        this.stopTimer();
        if (this.player1Score === this.player2Score) {
          this.winner = "no one. It's a draw!";
        } else if (this.player1Score > this.player2Score) {
          this.winner = "Player 1!";
        } else {
          this.winner = "Player 2!";
        }
        return true;
      }
      return false;
    }
  }
});
