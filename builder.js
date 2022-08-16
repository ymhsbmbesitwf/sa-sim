import { autoBattle as sim } from "./data/object.js";
import controller from "./controller.js";

function scientificCost (n) {
  return n < 1e4
      ? Number(n).toFixed(0)
      : Number(n).toExponential(2).toString().replace("+", "");
}

const builder = {
  addItemCost: function (itemId) {
    let shards = sim.items[itemId].dustType == "shards";
    builder.costDust += builder.costCurrent[itemId] * !shards;
    builder.costShard += builder.costCurrent[itemId] * shards;
  },
  addOtherCosts: function () {
    for (let oneTimerId in sim.oneTimers) {
      let oneTimer = sim.oneTimers[oneTimerId];
      if (oneTimer.owned) {
        builder.costDust += builder.costUnlock[oneTimerId] * !oneTimer.useShards;
        builder.costShard += builder.costUnlock[oneTimerId] * !!oneTimer.useShards;
      }
    }
    builder.costShard += builder.costCurrent.The_Ring * sim.oneTimers.The_Ring.owned;
    builder.costDust += builder.limbs > 4 ? 100 * (Math.pow(100, builder.limbs - 4) - 1) / 99 : 0;
  },
  costCurrent: {},
  costDust: 0,
  costShard: 0,
  costUnlock: {},
  enemy: {
    bleed: 0,
    poison: 0,
    resistBleed: 0,
    resistPoison: 0,
    resistShock: 0,
    shank: 0,
    shanked: 0,
    shock: 0,
  },
  huffy: {
    bleedMax: 0,
    bleedMin: 0,
    canBleed: false,
    canPoison: false,
    canShock: false,
    poisonMax: 0,
    poisonMin: 0,
    resistAll: 0,
    resistBleed: 0,
    resistPoison: 0,
    resistShock: 0,
    shockMax: 0,
    shockMin: 0,
    warningAegis: false,
  },
  limbs: 0,
  modifiers: {
    Rusty_Dagger: function () {
      let chance = sim.items.Rusty_Dagger.bleedChance();
      builder.huffy.bleedMin += chance;
      builder.huffy.bleedMax += chance * 2;
      builder.huffy.canBleed = true;
    },
    Fists_of_Goo: function () {
      builder.huffy.canPoison = true;
      builder.huffy.poisonMin += 25;
      builder.huffy.poisonMax += 50;
    },
    Battery_Stick: function () {
      builder.huffy.canShock = true;
      builder.huffy.shockMin += 35;
      builder.huffy.shockMax += 70;
    },
    Chemistry_Set: function () {
      let chance = sim.items.Chemistry_Set.poisonChance();
      builder.huffy.poisonMin += chance;
      builder.huffy.poisonMax += chance + 50;
    },
    Comfy_Boots: function () {
      builder.huffy.resistAll += sim.items.Comfy_Boots.resistance();
    },
    Shock_and_Awl: function () {
      let chance = sim.items.Shock_and_Awl.shockChance();
      builder.huffy.canShock = true;
      builder.huffy.shockMin += chance;
      builder.huffy.shockMax += chance;
    },
    Tame_Snimp: function () {
      let chance = sim.items.Tame_Snimp.poisonChance();
      builder.huffy.canPoison = true;
      builder.huffy.poisonMin += chance;
      builder.huffy.poisonMax += chance;
    },
    Wired_Wristguards: function () {
      let chance = sim.items.Wired_Wristguards.shockChance();
      builder.huffy.shockMin += chance;
      builder.huffy.shockMax += chance;
      builder.huffy.resistAll += 50;
    },
    Sword_and_Board: function () {
      builder.huffy.resistAll += sim.items.Sword_and_Board.resists();
    },
    Bilious_Boots: function () {
      builder.huffy.resistAll += sim.items.Bilious_Boots.resists();
    },
    Bloodstained_Gloves: function() {
      let chance = sim.items.Bloodstained_Gloves.bleedChance();
      builder.huffy.bleedMin += chance;
      builder.huffy.bleedMax += chance;
    },
    Eelimp_in_a_Bottle: function () {
      let chance = sim.items.Eelimp_in_a_Bottle.shockChance();
      builder.huffy.shockMin += chance;
      builder.huffy.shockMax += chance;
      builder.huffy.resistShock += sim.items.Eelimp_in_a_Bottle.shockResist();
    },
    Big_Cleaver: function () {
      builder.huffy.bleedMin += 25;
      builder.huffy.bleedMax += 100;
      builder.huffy.canBleed = true;
    },
    Metal_Suit: function () {
      builder.huffy.resistBleed += sim.items.Metal_Suit.resist();
    },
    Nozzled_Goggles: function () {
      builder.huffy.resistPoison += sim.items.Nozzled_Goggles.resist();
    },
    Very_Large_Slime: function () {
      let chance = sim.items.Very_Large_Slime.poisonChance();
      builder.huffy.canPoison = true;
      builder.huffy.poisonMin += chance;
      builder.huffy.poisonMax += chance;
    },
    Fearsome_Piercer: function () {
      let chance = sim.items.Fearsome_Piercer.bleedChance();
      builder.huffy.bleedMin += chance;
      builder.huffy.bleedMax += chance;
    },
    Bag_of_Nails: function () {
      builder.huffy.canBleed = true;
    },
    Bad_Medkit: function () {
      let chance = sim.items.Bad_Medkit.bleedChance();
      builder.huffy.bleedMin += chance;
      builder.huffy.bleedMax += chance;
    },
    Putrid_Pouch: function () {
      let chance = sim.items.Putrid_Pouch.poisonChance();
      builder.huffy.poisonMin += chance;
      builder.huffy.poisonMax += chance;
    },
    Aegis: function () {
      let chance = sim.items.Aegis.shockChance();
      if (sim.items.Basket_of_Souls.equipped || sim.items.Nullifium_Armor.equipped) {
        builder.huffy.shockMin += chance;
        builder.huffy.warningAegis = true;
      }
      builder.huffy.shockMax += chance;
    },
  },
  readEnemy: function () {
    builder.resetEnemy();
    let profile = document.getElementById("effects").innerHTML;
    let s = /Bloodletting(| x(\d))(?=(,|$))/.exec(profile);
    builder.enemy.bleed = s ? Math.ceil(sim.enemyLevel * 3 * (2 - Math.pow(0.5, (s[2] ? parseInt(s[2]) : 1) - 1))) : 0;
    s = /Poisoning(| x(\d))(?=(,|$))/.exec(profile);
    builder.enemy.poison = s ? Math.ceil(sim.enemyLevel * 3 * (2 - Math.pow(0.5, (s[2] ? parseInt(s[2]) : 1) - 1))) : 0;
    s = /Shocking(| x(\d))(?=(,|$))/.exec(profile);
    builder.enemy.shock = s ? Math.ceil(sim.enemyLevel * 3 * (2 - Math.pow(0.5, (s[2] ? parseInt(s[2]) : 1) - 1))) : 0;
    s = Math.max(builder.enemy.bleed, builder.enemy.poison, builder.enemy.shock);
    if (s <= 0) {
      document.getElementById("enemyShank").innerHTML = "n/a";
    } else {
      builder.enemy.shank = s * 0.25;
      builder.enemy.shanked = builder.enemy.poison == s ? "poison" : (builder.enemy.bleed == s ? "bleed" : "shock");
      document.getElementById("enemyShank").innerHTML = builder.enemy.shanked;
    }
    builder.enemy.resistBleed = sim.enemyLevel * (/Bleed Resistant/.exec(profile) ? 11 : 1);
    builder.enemy.resistPoison = sim.enemyLevel * (/Poison Resistant/.exec(profile) ? 11 : 1);
    builder.enemy.resistShock = sim.enemyLevel * (/Shock Resistant/.exec(profile) ? 11 : 1);
  },
  readEquips: function () {
    builder.resetHuffy();
    builder.limbs = 0;
    for (let itemID in sim.items) {
      if (sim.items[itemID].equipped) {
        ++builder.limbs;
        if (builder.modifiers[itemID]) {
          builder.modifiers[itemID]();
        }
      }
    }
    document.getElementById("limbsUsed").innerHTML = builder.limbs;
    if (sim.oneTimers.The_Ring.owned) {
      let ringChance = sim.getRingStatusChance();
      if (ringChance > 0) {
        builder.huffy.bleedMax += ringChance;
        builder.huffy.bleedMin += ringChance;
        builder.huffy.poisonMax += ringChance;
        builder.huffy.poisonMin += ringChance;
        builder.huffy.shockMax += ringChance;
        builder.huffy.shockMin += ringChance;
      }
    }
    if (sim.items.Sacrificial_Shank.equipped) {
      builder.shank();
    } else {
      builder.shankInfo.shanked = false;
    }
  },
  recalcCost: function () {
    builder.resetCost();
    for (let itemId in sim.items) {
      if (sim.items[itemId].equipped) {
        builder.addItemCost(itemId);
      }
    }
    builder.addOtherCosts();
    builder.updateCostDisplay();
  },
  resetCost: function () {
    builder.costDust = 0;
    builder.costShard = 0;
  },
  resetEnemy: function () {
    for (let index in builder.enemy) {
      builder.enemy[index] = 0;
    }
  },
  resetHuffy: function () {
    for (let index in builder.huffy) {
      builder.huffy[index] = typeof builder.huffy[index] == "boolean" ? false : 0;
    }
  },
  setEnemyLevel: function (level, forceRead = false) {
    if (forceRead || sim.enemyLevel != level) {
      sim.enemyLevel = level;
      document.getElementById("effects").innerHTML = sim.getEffects(sim.enemyLevel);
      builder.readEnemy();
      builder.updateDisplay();
      controller.modifiedAB();
    }
  },
  setItem: function (itemId, equipped, level, massChange = false) {
    builder.limbs += equipped - sim.items[itemId].equipped;
    let modifiedLevel = sim.items[itemId].level != level;
    let modifiedEquipped = sim.items[itemId].equipped != equipped;
    sim.items[itemId].equipped = equipped;
    sim.items[itemId].level = level;
    if (modifiedLevel) {
      builder.updateItemCost(itemId);
    }
    if (!massChange && (modifiedEquipped || (equipped && modifiedLevel))) {
      if (builder.modifiers[itemId]) {
        builder.readEquips();
        builder.updateDisplay();
      }
      builder.recalcCost();
      controller.modifiedAB();
    }
  },
  setItemLevel: function (itemId, level) {
    if (sim.items[itemId].level == level) {
      return;
    }
    sim.items[itemId].level = level;
    builder.updateItemCost(itemId);
    if (sim.items[itemId].equipped) {
      if (builder.modifiers[itemId]) {
        builder.readEquips();
        builder.updateDisplay();
      }
      builder.recalcCost();
      controller.modifiedAB();
    }
  },
  setMaxEnemyLevel: function (level) {
    if (sim.maxEnemyLevel != level) {
      sim.maxEnemyLevel = level;
      controller.modifiedAB();
    }
  },
  setRingLevel: function (level, massChange = false) {
    if (sim.rings.level == level) {
      return;
    }
    if (sim.oneTimers.The_Ring.owned) {
      let flag = (level >= 10) || (sim.rings.level >= 10);
      sim.rings.level = level;
      builder.updateRingCost();
      if (!massChange) {
        if (flag) {
          builder.readEquips();
          builder.updateDisplay();
        }
        builder.recalcCost();
        controller.modifiedAB();
      }
    }
  },
  shank: function () {
    // don't even...
    let shankedBleed = false;
    let shankedPoison = false;
    let shankedShock = false;
    builder.shankInfo.bleed[0] = builder.huffy.bleedMin;
    builder.shankInfo.bleed[1] = 0;
    builder.shankInfo.poison[0] = builder.huffy.poisonMin;
    builder.shankInfo.poison[1] = 0;
    builder.shankInfo.reductionMax = 0;
    builder.shankInfo.reductionMin = Infinity;
    builder.shankInfo.shock[0] = builder.huffy.shockMin;
    builder.shankInfo.shock[1] = 0;
    for (let bleed of [builder.huffy.bleedMin, builder.huffy.bleedMax]) {
      for (let poison of [builder.huffy.poisonMin, builder.huffy.poisonMax]) {
        for (let shock of [builder.huffy.shockMin, builder.huffy.shockMax]) {
          let max = Math.max(bleed, poison, shock);
          let reduction = 0.25 * max;
          builder.shankInfo.reductionMin = Math.min(builder.shankInfo.reductionMin, reduction);
          builder.shankInfo.reductionMax = Math.max(reduction, builder.shankInfo.reductionMax);
          if (poison >= bleed && poison >= shock) {
            shankedPoison = true;
            if (poison - reduction < builder.shankInfo.poison[0]) {
              builder.shankInfo.poison[0] = poison - reduction;
            }
            if (poison - reduction > builder.shankInfo.poison[1]) {
              builder.shankInfo.poison[1] = poison - reduction;
            }
          } else if (bleed >= shock) {
            shankedBleed = true;
            if (bleed - reduction < builder.shankInfo.bleed[0]) {
              builder.shankInfo.bleed[0] = bleed - reduction;
            }
            if (bleed - reduction > builder.shankInfo.bleed[1]) {
              builder.shankInfo.bleed[1] = bleed - reduction;
            }
          } else {
            shankedShock = true;
            if (shock - reduction < builder.shankInfo.shock[0]) {
              builder.shankInfo.shock[0] = shock - reduction;
            }
            if (shock > builder.shankInfo.shock[1]) {
              builder.shankInfo.shock[1] = shock - reduction;
            }
          }
        }
      }
    }
    if (shankedPoison) {
      builder.shankInfo.bleed[1] = Math.max(builder.shankInfo.bleed[1], builder.huffy.bleedMax);
      builder.shankInfo.shock[1] = Math.max(builder.shankInfo.shock[1], builder.huffy.shockMax);
    } else {
      builder.shankInfo.poison[1] = builder.huffy.poisonMax;
    }
    if (shankedBleed) {
      builder.shankInfo.poison[1] = Math.max(builder.shankInfo.poison[1], builder.huffy.poisonMax);
      builder.shankInfo.shock[1] = Math.max(builder.shankInfo.shock[1], builder.huffy.shockMax);
    } else {
      builder.shankInfo.bleed[1] = builder.huffy.bleedMax;
    }
    if (shankedShock) {
      builder.shankInfo.poison[1] = Math.max(builder.shankInfo.poison[1], builder.huffy.poisonMax);
      builder.shankInfo.bleed[1] = Math.max(builder.shankInfo.bleed[1], builder.huffy.bleedMax);
    } else {
      builder.shankInfo.shock[1] = builder.huffy.shockMax;
    }
    document.getElementById("huffyShank").innerHTML = (shankedPoison ? "poison" + (shankedBleed || shankedShock ? "/" : "") : "") + (shankedBleed ? "bleed" + (shankedShock ? "/" : "") : "") + (shankedShock ? "shock" : "");
    builder.shankInfo.shanked = true;
  },
  shankInfo: {
    bleed: [0, 0],
    poison: [0, 0],
    reductionMax: 0,
    reductionMin: Infinity,
    shanked: false,
    shock: [0, 0],
  },
  toggleEquip: function (itemId) {
    if (!sim.items[itemId]) {
      return;
    }
    builder.limbs += sim.items[itemId].equipped ? -1 : 1;
    document.getElementById("limbsUsed").innerHTML = builder.limbs;
    sim.items[itemId].equipped = !sim.items[itemId].equipped;
    if (builder.modifiers[itemId]) {
      builder.readEquips();
    }
    builder.updateDisplay();
    builder.recalcCost();
    controller.modifiedAB();
  },
  toggleOneTimer: function (name) {
    sim.oneTimers[name].owned = !sim.oneTimers[name].owned;
    builder.recalcCost();
    controller.modifiedAB();
  },
  toggleRing: function () {
    if (sim.oneTimers.The_Ring.owned) {
      sim.oneTimers.The_Ring.owned = false;
      if (sim.rings.level >= 10) {
        builder.readEquips();
        builder.updateDisplay();
      }
      sim.rings.level = 1;
    } else {
      sim.oneTimers.The_Ring.owned = true;
      sim.rings.level = parseInt(document.getElementById("The_Ring_Input").value);
      builder.updateRingCost();
      if (sim.rings.level >= 10) {
        builder.readEquips();
        builder.updateDisplay();
      }
    }
    builder.recalcCost();
    controller.modifiedAB();
  },
  toggleRingSlot: function (modifier) {
    let modifierIndex = sim.rings.mods.indexOf(modifier);
    if (modifierIndex == -1) {
      sim.rings.mods.push(modifier);
    } else {
      sim.rings.mods.splice(modifierIndex, 1);
    }
    controller.modifiedAB();
  },
  updateCostDisplay: function () {
    document.getElementById("buildCostDust").innerHTML = scientificCost(builder.costDust);
    document.getElementById("buildCostShards").innerHTML = scientificCost(builder.costShard);
  },
  updateDisplay: function () {
    document.getElementById("enemyResistPoison").innerHTML = builder.enemy.resistPoison + "%";
    let resistBleed = builder.enemy.resistBleed;
    let resistShock = builder.enemy.resistShock;
    if (sim.items.Stormbringer.equipped) {
      resistBleed += resistShock;
      resistShock = 0;
    }
    document.getElementById("enemyResistBleed").innerHTML = resistBleed + "%";
    document.getElementById("enemyResistShock").innerHTML = resistShock + "%";
    if (sim.items.Sacrificial_Shank.equipped) {
      let resistAllMax = builder.huffy.resistAll + Math.floor((builder.shankInfo.reductionMax + builder.enemy.shank) / 10) * sim.items.Sacrificial_Shank.level;
      let resistAllMin = builder.huffy.resistAll + Math.floor((builder.shankInfo.reductionMin + builder.enemy.shank) / 10) * sim.items.Sacrificial_Shank.level;
      document.getElementById("enemyPoison").innerHTML = (builder.enemy.poison - resistAllMax - builder.huffy.resistPoison - (builder.enemy.shanked == "poison" ? builder.enemy.shank : 0)) + "%" + (resistAllMax == resistAllMin ? "" : " to " + (builder.enemy.poison - resistAllMin - builder.huffy.resistPoison - (builder.enemy.shanked == "poison" ? builder.enemy.shank : 0)) + "%");
      document.getElementById("enemyBleed").innerHTML = (builder.enemy.bleed - resistAllMax - builder.huffy.resistBleed - (builder.enemy.shanked == "bleed" ? builder.enemy.shank : 0)) + "%" + (resistAllMax == resistAllMin ? "" : " to " + (builder.enemy.bleed - resistAllMin - builder.huffy.resistBleed - (builder.enemy.shanked == "bleed" ? builder.enemy.shank : 0)) + "%");
      document.getElementById("enemyShock").innerHTML = (builder.enemy.shock - resistAllMax - builder.huffy.resistShock - (builder.enemy.shanked == "shock" ? builder.enemy.shank : 0)) + "%" + (resistAllMax == resistAllMin ? "" : " to " + (builder.enemy.shock - resistAllMin - builder.huffy.resistShock - (builder.enemy.shanked == "shock" ? builder.enemy.shank : 0)) + "%");
      document.getElementById("huffyPoison").innerHTML = builder.shankInfo.poison[0] == builder.shankInfo.poison[1] ? (builder.shankInfo.poison[1] - builder.enemy.resistPoison) + "%" : (builder.shankInfo.poison[0] - builder.enemy.resistPoison) + "% to " + (builder.shankInfo.poison[1] - builder.enemy.resistPoison) + "%";
      document.getElementById("huffyBleed").innerHTML = builder.shankInfo.bleed[0] == builder.shankInfo.bleed[1] ? (builder.shankInfo.bleed[1] - resistBleed) + "%" : (builder.shankInfo.bleed[0] - resistBleed) + "% to " + (builder.shankInfo.bleed[1] - resistBleed) + "%";
      document.getElementById("huffyShock").innerHTML = builder.shankInfo.shock[0] == builder.shankInfo.shock[1] ? (builder.shankInfo.shock[1] - resistShock) + "%" : (builder.shankInfo.shock[0] - resistShock) + "% to " + (builder.shankInfo.shock[1] - resistShock) + "%";
      builder.visible("huffyShankRow", true);
      builder.visible("enemyShankRow", true);
    } else {
      document.getElementById("enemyPoison").innerHTML = (builder.enemy.poison - builder.huffy.resistAll - builder.huffy.resistPoison) + "%";
      document.getElementById("enemyBleed").innerHTML = (builder.enemy.bleed - builder.huffy.resistAll - builder.huffy.resistBleed) + "%";
      document.getElementById("enemyShock").innerHTML = (builder.enemy.shock - builder.huffy.resistAll - builder.huffy.resistShock) + "%";
      document.getElementById("huffyPoison").innerHTML = builder.huffy.poisonMax == builder.huffy.poisonMin ? (builder.huffy.poisonMax - builder.enemy.resistPoison) + "%" : (builder.huffy.poisonMin - builder.enemy.resistPoison) + "% to " + (builder.huffy.poisonMax - builder.enemy.resistPoison)+ "%";
      document.getElementById("huffyBleed").innerHTML = builder.huffy.bleedMax == builder.huffy.bleedMin ? (builder.huffy.bleedMax - resistBleed) + "%" : (builder.huffy.bleedMin - resistBleed) + "% to " + (builder.huffy.bleedMax - resistBleed) + "%";
      document.getElementById("huffyShock").innerHTML = builder.huffy.shockMax == builder.huffy.shockMin ? (builder.huffy.shockMax - resistShock) + "%" : (builder.huffy.shockMin - resistShock) + "% to " + (builder.huffy.shockMax - resistShock) + "%";
      builder.visible("huffyShankRow", false);
      builder.visible("enemyShankRow", false);
    }
    builder.visible("enemyPoisonRow", builder.enemy.poison > 0);
    builder.visible("enemyBleedRow", builder.enemy.bleed > 0);
    builder.visible("enemyShockRow", builder.enemy.shock > 0);
    builder.visible("huffyPoisonRow", builder.huffy.canPoison);
    builder.visible("huffyBleedRow", builder.huffy.canBleed);
    builder.visible("huffyShockRow", builder.huffy.canShock);
  },
  updateItemCost: function (itemId) {
    let item = sim.items[itemId];
    builder.costCurrent[itemId] = builder.costUnlock[itemId]
        + (item.startPrice || 5)
        * (1 - Math.pow(item.priceMod || 3, item.level - 1))
        / (1 - (item.priceMod || 3));
  },
  updateRingCost: function () {
    builder.costCurrent.The_Ring = Math.ceil(15 * Math.pow(2, sim.rings.level) - 30);
  },
  visible: function (id, flag) {
    document.getElementById(id).setAttribute("class", flag ? "" : "displayNone");
  },
};

for (let oneTimer in sim.oneTimers) {
  builder.costUnlock[oneTimer] = sim.oneTimerPrice(oneTimer);
}
for (let itemId in sim.items) {
  builder.costUnlock[itemId] = sim.items[itemId].zone ? sim.contractPrice(itemId) : 0;
  builder.costCurrent[itemId] = builder.costUnlock[itemId];
}
builder.costCurrent.The_Ring = 0;

export { builder as default };
