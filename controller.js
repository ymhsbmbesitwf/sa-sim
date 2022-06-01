const controller = {
  interval: null,
  lastFrame: 0,
  halt: false,
  onUpdate: null,
  seconds: 8 * 60 * 60,
  sim: null,
  stuffModified: false,
  timeStart: 0,
  timeUsed: 0,
  updateInterval: 1000,
  defaultConfig: function() {
    return {
      framesPerChunk: 1000,
      onUpdate: null,
      seconds: 8 * 60 * 60,
      updateInterval: 1000,
    };
  },
  getTimeUsed: function () {
    return this.timeUsed + (this.interval == null ? 0 : Date.now() - this.timeStart);
  },
  init: function (autoBattleObject, configuration) {
    if (this.sim != null || this.interval != null) {
      console.log("Warning: controller reinitialization attempt");
      return;
    }
    if (autoBattleObject == null || configuration == null) {
      console.log("Warning: dev error");
      return;
    }
    this.chunk = configuration.framesPerChunk;
    this.onUpdate = configuration.onUpdate;
    this.sim = autoBattleObject;
    this.seconds = configuration.seconds;
    this.updateInterval = configuration.updateInterval;
  },
  isRunning: function () {
    return this.interval != null;
  },
  modifiedAB: function () {
    this.halt = true;
    this.stuffModified = true;
  },
  reconfigure: function (configuration) {
    // TODO: check for garbage input
    this.chunk = configuration.framesPerChunk;
    this.onUpdate = configuration.onUpdate;
    this.seconds = configuration.seconds;
    this.updateInterval = configuration.updateInterval;
  },
  resetStats: function () {
    this.sim.resetAll();
    this.timeUsed = 0;
  },
  start: function () {
    if (this.interval != null) {
      console.log("Warning: trying to start while previous simulation in progress");
      return;
    }
    if (this.stuffModified) {
      this.resetStats();
      this.stuffModified = false;
    }
    this.halt = false;
    this.lastUpdate = Date.now();
    this.timeStart = this.lastUpdate;
    this.interval = setInterval(this.loop, 0);
  },
  stop: function () {
    this.halt = true;
  },
  loop: function () {
    for (let saframe = 0; !controller.halt && saframe < controller.chunk; ++saframe) {
      controller.sim.update();
      controller.halt |= controller.sim.lootAvg.counter / 1000 >= controller.seconds;
    }
    let now = Date.now();
    if (controller.halt) {
      clearInterval(controller.interval);
      controller.interval = null;
      controller.timeUsed = now - controller.timeStart;
    }
    if (controller.halt || (now - controller.lastUpdate >= controller.updateInterval)) {
      controller.lastUpdate = now;
      if (controller.onUpdate) {
        controller.onUpdate();
      }
    }
  },
};

export { controller as default };
