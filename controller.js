import { autoBattle as sim } from "./object.js";

const controller = {
  chunk: 100,
  battles: 1000,
  battleCount: 0,
  complete: false,
  interval: null,
  lastFrame: 0,
  halt: false,
  onFightResult: null,
  onSimInterrupt: null,
  onSimComplete: null,
  onUpdate: null,
  seconds: 8 * 60 * 60,
  stuffModified: true,
  timeStart: 0,
  timeUsed: 0,
  updateInterval: 1000,
  defaultConfig: function() {
    return {
      fights: 1000,
      framesPerChunk: 100,
      onFightResult: null,
      onSimInterrupt: null,
      onSimComplete: null,
      onUpdate: null,
      seconds: 8 * 60 * 60,
      updateInterval: 1000,
    };
  },
  getProgress: function () {
    return this.complete ? 1 : Math.max(sim.lootAvg.counter / 1000 / this.seconds, this.battleCount / this.battles);
  },
  getTimeUsed: function () {
    return this.timeUsed + (this.interval == null ? 0 : Date.now() - this.timeStart);
  },
  isRunning: function () {
    return this.interval != null;
  },
  modifiedAB: function () {
    this.halt = true;
    this.stuffModified = true;
  },
  reconfigure: function (configuration) {
    if (!configuration) {
      return;
    }
    // ideally i'd check for garbage input... however, yolo
    this.battles = configuration.fights;
    this.chunk = configuration.framesPerChunk;
    this.onFightResult = configuration.onFightResult;
    this.onSimInterrupt = configuration.onSimInterrupt;
    this.onSimComplete = configuration.onSimComplete;
    this.onUpdate = configuration.onUpdate;
    this.seconds = configuration.seconds;
    this.updateInterval = configuration.updateInterval;
  },
  resetStats: function () {
    sim.resetAll();
    this.timeUsed = 0;
  },
  start: function () {
    if (this.interval != null) {
      return;
    }
    if (this.stuffModified) {
      this.resetStats();
      this.stuffModified = false;
    }
    this.battleCount = sim.sessionEnemiesKilled + sim.sessionTrimpsKilled;
    this.complete = false;
    this.halt = false;
    this.lastUpdate = Date.now();
    this.timeStart = this.lastUpdate;
    this.interval = setInterval(this.loop, 0);
  },
  stop: function () {
    this.halt = true;
  },
  loop: function () {
    for (let currentBattleCount, saframe = 0; !controller.halt && saframe < controller.chunk; ++saframe) {
      sim.update();
      currentBattleCount = sim.sessionEnemiesKilled + sim.sessionTrimpsKilled;
      if (currentBattleCount > controller.battleCount) {
        controller.battleCount = currentBattleCount;
        if (controller.onFightResult) {
          controller.onFightResult();
        }
      }
      controller.complete = (sim.lootAvg.counter / 1000 >= controller.seconds) || (controller.battleCount >= controller.battles);
      controller.halt |= controller.complete;
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
      if (controller.halt) {
        if (controller.complete) {
          if (controller.onSimComplete) {
            controller.onSimComplete();
          }
        } else if (controller.onSimInterrupt) {
          controller.onSimInterrupt();
        }
      }
    }
  },
};

export { controller as default };
