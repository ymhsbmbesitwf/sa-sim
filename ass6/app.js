var app = new Vue({
  el: "#app",
  data: {
    imageFiles: [],
    currentImages: [],
    flippedImages: [],
    flips: 0,
    currentTurn: 1,
    player1Score: 0,
    player2Score: 0,
    time: 0,
    timer: null,
    winner: null
  },
  created: function() {
    this.themeFormula1();
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
      this.flippedImages.push(image);
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
      this.time = 0;
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
    },
    themeFormula1() {
      this.newGame();
      this.imageFiles = [
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
      ];
      this.shuffle();
    },
    themeColors() {
      this.newGame();
      this.imageFiles = [
        "images/nevermind.png",
        "images/nevermind.png",
        "images/beigepink_tinge.png",
        "images/beigepink_tinge.png",
        "images/fish_food.png",
        "images/fish_food.png",
        "images/h.png",
        "images/h.png",
        "images/island_grotto.png",
        "images/island_grotto.png",
        "images/rosabelle.png",
        "images/rosabelle.png",
        "images/tiger_black.png",
        "images/tiger_black.png",
        "images/vwe75.png",
        "images/vwe75.png"
      ];
      this.shuffle();
    },
    newGame() {
      if (this.timer) {
        this.stopTimer();
      }
      for (const image of this.flippedImages) {
        image.flipped = false;
      }
      this.player1Score = 0;
      this.player2Score = 0;
      this.flips = 0;
      this.currentTurn = 1;
      this.winner = null;
      this.startTimer();
    }
  }
});
