import { autoBattle } from "./data/object.js";
import { LZString } from "./lz-string.js";
import { build as buildObject } from "./data/buildObject.js";
import { u2Mutations } from "./data/mutations.js";
import ABC from "./controller.js";

let simConfig = ABC.defaultConfig();
simConfig.fights = 1000; // max enemy/Huffy deaths
simConfig.framesPerChunk = 200;
simConfig.onFightResult = null; // function to call
simConfig.onSimInterrupt = null; // function to call
simConfig.onSimComplete = null; // function to call
simConfig.onUpdate = null; // function to call
simConfig.seconds = 8 * 60 * 60; // default 8h
simConfig.updateInterval = 1000; // ms
ABC.reconfigure(simConfig);
// ABC.modifiedAB() needed whenever equips or levels change to stop the sim

document.addEventListener("DOMContentLoaded", function () {
    setup();
    elements = getElements();
});

let AB = autoBattle;
let LZ = LZString;
let startTime;
let save;
let formatter = new Intl.NumberFormat("en-GB", { minimumFractionDigits: 3 });

function format(num) {
    num = formatter.format(num);
    return num.replaceAll(",", " ");
}

let elements;
let ABresults = {
    dustPs: undefined,
    dust: undefined,
    shardDust: undefined,
};
let autoRunChecked = false;
let colours = {
    dust: "rgb(229, 204, 201)",
    shard: "rgb(53, 88, 104)",
    oneTimer: "rgb(231, 209, 86)",
    selected: "rgba(242, 140, 40, 0.5)",
    unlock: "rgb(0, 255, 127)",
    theRing: "rgb(119, 165, 187)",
};

function getElements() {
    return {
        buildCostDust: document.getElementById("buildCostDust"),
        buildCostShards: document.getElementById("buildCostShards"),
        timeSpent: document.getElementById("timeSpent"),
        processedTime: document.getElementById("processedTime"),
        enemiesKilled: document.getElementById("enemiesKilled"),
        trimpsKilled: document.getElementById("trimpsKilled"),
        clearingTime: document.getElementById("clearingTime"),
        remainingTime: document.getElementById("remainingTime"),
        dustPs: document.getElementById("dustPs"),
        averageFightTime: document.getElementById("averageFightTime"),
        averageKillTime: document.getElementById("averageKillTime"),
        averageHealthLeft: document.getElementById("averageHealthLeft"),
        averageHealthLeftLoses: document.getElementById(
            "averageHealthLeftLoses"
        ),
        bestFight: document.getElementById("bestFight"),
        shardsPs: document.getElementById("shardsPs"),
        limbsUsed: document.getElementById("limbsUsed"),
        ringMods: document.getElementById("ringModsDiv"),
        baseDustPs: document.getElementById("baseDustPs"),
        baseShardsPs: document.getElementById("baseShardsPs"),
        baseInfo: document.getElementById("baseInfo"),
    };
}

const enemyCount = (level) => {
    if (level < 20) return 10 * level;
    return 190 + 15 * (level - 19);
};

const wrapup = () => {
    const time = ABC.getTimeUsed();
    const WR =
        AB.sessionEnemiesKilled /
        (AB.sessionEnemiesKilled + AB.sessionTrimpsKilled);
    const toKill = enemyCount(AB.enemyLevel);
    const base_dust = AB.getDustPs();

    setABResults({ dustPs: base_dust });

    elements.timeSpent.innerHTML = time + " ms";

    let timeSpent = AB.lootAvg.counter;
    elements.processedTime.innerHTML =
        convertTimeMs(timeSpent) +
        (ABC.isRunning() ? "/" + ABC.seconds / 3600 + "h" : " (stopped)");

    let enemiesKilled = AB.sessionEnemiesKilled;
    elements.enemiesKilled.innerHTML = enemiesKilled;

    let trimpsKilled = AB.sessionTrimpsKilled;
    let per = 100 * format(WR);
    elements.trimpsKilled.innerHTML =
        trimpsKilled + " [" + per.toString().slice(0, 4) + "%]";

    let clearingTime =
        ((toKill / AB.sessionEnemiesKilled) * AB.lootAvg.counter) / 1000;
    elements.clearingTime.innerHTML = convertTime(clearingTime);
    elements.dustPs.innerHTML = toScientific(base_dust) + " D/s";

    let base_shards = AB.enemyLevel >= 51 ? base_dust / 1e9 : 0;
    elements.shardsPs.innerHTML = toScientific(base_shards) + " S/s";

    if (base_dust > 0) {
        let unmultipliedDust = base_dust;
        if (AB.scruffyLvl21) {
            unmultipliedDust /= 5;
        }
        if (u2Mutations.tree.Dust.purchased) {
            unmultipliedDust /=
                1.25 + (u2Mutations.tree.Dust2.purchased ? 0.25 : 0);
        }
        if (AB.oneTimers.Dusty_Tome.owned) {
            unmultipliedDust /= 1 + 0.05 * (AB.maxEnemyLevel - 1);
        }
        // <standarization stuff>
        let assumeTomeLevel = 43;
        let assumeDustierLevel = 85;
        // </standarization stuff>
        if (AB.enemyLevel >= assumeTomeLevel) {
            unmultipliedDust *= 1 + 0.05 * AB.enemyLevel;
        }
        if (AB.enemyLevel >= assumeDustierLevel) {
            unmultipliedDust *= 1.5;
        }
        elements.baseDustPs.innerHTML = toScientific(unmultipliedDust) + " D/s";
        elements.baseShardsPs.innerHTML =
            toScientific(AB.enemyLevel >= 51 ? unmultipliedDust / 1e9 : 0) +
            " S/s";
        elements.baseInfo.innerHTML =
            "Assuming " +
            (AB.enemyLevel >= assumeTomeLevel ? "Tome (>=" : "no Tome (<") +
            assumeTomeLevel +
            ") and " +
            (AB.enemyLevel >= assumeDustierLevel
                ? "Dustier (>="
                : "no Dustier (<") +
            assumeDustierLevel +
            ")";
    } else {
        elements.baseDustPs.innerHTML = "0 D/s";
        elements.baseShardsPs.innerHTML = "0 D/s";
        elements.baseInfo.innerHTML = "great success.";
    }

    let fightTime = timeSpent / (enemiesKilled + trimpsKilled);
    elements.averageFightTime.innerHTML = convertTimeMs(fightTime, 2);

    let averageFightTime = timeSpent / enemiesKilled;
    elements.averageKillTime.innerHTML = convertTimeMs(averageFightTime, 2);

    if (save) {
        let remainingTime =
            averageFightTime *
            (toKill - save.global.autoBattleData.enemiesKilled);
        elements.remainingTime.innerHTML = convertTimeMs(remainingTime, 2);
    }

    let rc = ABC.resultCounter;
    elements.averageHealthLeft.innerHTML =
        Math.round((rc.healthSum / rc.fights) * 100 * 10) / 10 + "%";
    elements.averageHealthLeftLoses.innerHTML =
        rc.loses > 0
            ? Math.round((rc.healthSum / rc.loses) * 100 * 10) / 10 + "%"
            : "-";
    let rb = ABC.resultBest;
    elements.bestFight.innerHTML = rb.win
        ? "win in " + convertTimeMs(rb.time, 2)
        : "loss in " +
          convertTimeMs(rb.time, 2) +
          " with " +
          Math.round(rb.enemy * 100 * 10) / 10 +
          "% enemy health left";
};

const startSimulation = () => {
    if (ABC.isRunning()) {
        return;
    }

    sets();
    calcBuildCost(false);

    simConfig.onFightResult = null;
    simConfig.onSimInterrupt = null;
    simConfig.onSimComplete = null;
    simConfig.onUpdate = wrapup;
    ABC.reconfigure(simConfig);

    runSimulation();
};

const stopSimulation = () => {
    ABC.stop();
};

function setup() {
    makeEquipBtns();
    makeOneTimersBtns();
    addListeners();
    addSelectAffordTime();
}

const prettify = (num) => {
    return num.toLocaleString("en-GB", {
        maximumSignificantDigits: 4,
        notation: "compact",
        compactDisplay: "short",
    });
};

function sets() {
    setActiveItems();
    setActiveOneTimers();
    setLevels();
}

function makeEquipBtns() {
    let equipDiv = document.getElementById("equipDiv");
    for (let i = 0; i < 2; i++) {
        let partDiv = partEquipDiv(2, i);
        equipDiv.appendChild(partDiv);
    }
}

function partEquipDiv(parts, ind) {
    let items = orderByUnlock();
    let size = Math.round(items.length / parts);
    let start = size * ind;
    let end = size * (ind + 1);
    end = items.length < end ? items.length : end;
    let partDiv = document.createElement("div");
    partDiv.className = "partDiv";
    for (let i = start; i < end; i++) {
        let item = items[i];
        let div = document.createElement("div");
        div.className = "equipInpDiv";
        partDiv.appendChild(div);

        let button = document.createElement("button");
        let name = item.replaceAll("_", " ");
        button.innerHTML = name;
        button.id = item + "_Button";
        button.className = "uncheckedButton";
        div.appendChild(button);
        addChangeForButtonEquip(button);

        let input = document.createElement("input");
        input.type = "number";
        input.value = 1;
        input.className = "equipInput";
        input.id = item + "_Input";
        addChangeForLevel(input);
        div.appendChild(input);
    }
    return partDiv;
}

function makeOneTimersBtns() {
    let parDir = document.getElementById("oneTimersDiv");
    for (const oneTimer in AB.oneTimers) {
        if (Object.hasOwnProperty.call(AB.oneTimers, oneTimer)) {
            let div = document.createElement("div");
            div.className = "oneTimersInpDiv";
            parDir.appendChild(div);

            // If ring
            if (oneTimer === "The_Ring") {
                let topDiv = document.createElement("div");
                topDiv.id = "topDiv";
                let button = document.createElement("button");
                button.innerHTML = "The Ring";
                button.id = "The_Ring_Button";
                button.classList.add("uncheckedButton", "oneTimerButton");
                addChangeForButton(button);
                topDiv.appendChild(button);

                let input = document.createElement("input");
                input.type = "number";
                input.value = 1;
                input.id = "The_Ring_Input";
                addChangeForRingInput(input);
                topDiv.appendChild(input);
                div.appendChild(topDiv);

                let modDiv = document.createElement("div");
                modDiv.id = "ringModsDiv";
                div.appendChild(modDiv);
                for (const mod in AB.ringStats) {
                    let modifier = document.createElement("button");
                    modifier.innerHTML = mod;
                    modifier.className = "uncheckedButton";
                    addChangeForButton(modifier);
                    modDiv.appendChild(modifier);
                }
            } else {
                let button = document.createElement("button");
                let name = oneTimer.replaceAll("_", " ");
                button.innerHTML = name;
                button.id = oneTimer + "_Button";
                button.classList.add("uncheckedButton", "oneTimerButton");
                div.appendChild(button);
                addChangeForButton(button);
            }
        }
    }

    let mutationsDiv = document.createElement("div");
    mutationsDiv.id = "mutationsDiv";
    mutationsDiv.className = "oneTimersInpDiv";
    parDir.appendChild(mutationsDiv);

    // Button 1
    let mutationsButton = document.createElement("button");
    mutationsButton.innerHTML = "Dusty";
    mutationsButton.id = "Mutations_Button";
    mutationsButton.classList.add("uncheckedButton", "button");
    mutationsDiv.appendChild(mutationsButton);
    addChangeForMutation(mutationsButton, 1);

    // Button 2
    mutationsButton = document.createElement("button");
    mutationsButton.innerHTML = "Dustier";
    mutationsButton.id = "Mutations_Button_2";
    mutationsButton.classList.add("uncheckedButton", "button");
    mutationsDiv.appendChild(mutationsButton);
    addChangeForMutation(mutationsButton, 2);

    // Scruffy 21
    let scruffyButton = document.createElement("button");
    scruffyButton.innerHTML = "S21";
    scruffyButton.id = "S21_Button";
    scruffyButton.classList.add("uncheckedButton", "button");
    mutationsDiv.appendChild(scruffyButton);
    addChangeForScruffy(scruffyButton);
}

function addChangeForLevel(item) {
    item.addEventListener("change", (event) => {
        let value = event.target.value;
        if (parseInt(Number(value)) >= 1) {
            let name = item.id.replace("_Input", "");
            value = Number(value).toString();
            event.target.value = value;
            AB.items[name].level = value;
            ABC.modifiedAB();
        } else {
            event.target.value = 1;
        }
        calcBuildCost(true);
        if (autoRunChecked) startSimulation();
    });
}

function addChangeForButton(button) {
    button.addEventListener("click", (event) => {
        swapChecked(button);
        calcBuildCost(true);
        if (autoRunChecked && button.classList.contains("checkedButton"))
            startSimulation();
    });
}

function addChangeForButtonEquip(button) {
    button.addEventListener("click", (event) => {
        let lvl = document.getElementById(
            button.id.replace("_Button", "_Input")
        );
        let name = button.id.replace("_Button", "");
        if (parseInt(lvl.value) > 0) {
            AB.equip(name);
            ABC.modifiedAB();
        }

        // Set limbs.
        elements.limbsUsed.innerHTML = countLimbsUsed();
    });
    addChangeForButton(button);
}

function addChangeForRingInput(input) {
    input.addEventListener("change", (event) => {
        let value = event.target.value;
        if (parseInt(Number(value)) >= 1) {
            value = Number(value).toString();
            event.target.value = value;
            AB.rings.level = value;
            ABC.modifiedAB();
        } else {
            event.target.value = 1;
        }
        calcBuildCost(true);
        if (autoRunChecked && button.classList.contains("checkedButton"))
            startSimulation();
    });
}

function addChangeForMutation(input, version) {
    input.addEventListener("click", () => {
        swapChecked(input);
        calcBuildCost(true);
        if (version === 1)
            u2Mutations.tree.Dust.purchased = !u2Mutations.tree.Dust.purchased;
        else
            u2Mutations.tree.Dust2.purchased =
                !u2Mutations.tree.Dust2.purchased;
        if (autoRunChecked && input.classList.contains("checkedButton"))
            startSimulation();
    });
}

function addChangeForScruffy(input) {
    input.addEventListener("click", () => {
        swapChecked(input);
        calcBuildCost(true);
        AB.scruffyLvl21 = !AB.scruffyLvl21;
        if (autoRunChecked && input.classList.contains("checkedButton"))
            startSimulation();
    });
}

function isInt(value) {
    return (
        !isNaN(value) &&
        parseInt(Number(value)) === value &&
        !isNaN(parseInt(value, 10))
    );
}

function setActiveItems() {
    clearItems();
    setItems();
}

function clearItems() {
    for (const item in AB.items) {
        AB.items[item].owned = false;
        if (AB.items[item].equipped) AB.equip(item);
        AB.items[item].hidden = false;
        AB.items[item].level = 1;
    }
    ABC.modifiedAB();
}

function setItems() {
    let items = document.querySelectorAll("input.equipInput");
    let ogItems = AB.items;
    for (const ogItem in ogItems) {
        items.forEach((item) => {
            let name = item.id.replace("_Input", "");
            let val = parseInt(item.value);
            if (ogItem === name && val > 0) {
                AB.items[name].owned = true;
                AB.items[name].level = val;
                if (item.previousSibling.classList.contains("checkedButton")) {
                    AB.equip(name);
                }
            }
        });
    }
    ABC.modifiedAB();
}

function setActiveOneTimers() {
    clearOneTimers();
    setOneTimers();
}

function clearOneTimers() {
    for (const oneTimer in AB.oneTimers) {
        if (Object.hasOwnProperty.call(AB.oneTimers, oneTimer)) {
            AB.oneTimers[oneTimer].owned = false;
        }
    }
    //ring levels above 10 do stuff even if ring isn't equipped
    AB.rings.level = 1;
    AB.rings.mods = [];
    ABC.modifiedAB();
}

function setOneTimers() {
    let oneTimers = document.querySelectorAll("button.oneTimerButton");
    oneTimers.forEach((oneTimer) => {
        if (oneTimer.classList.contains("checkedButton")) {
            let name = oneTimer.id.replace("_Button", "");
            AB.oneTimers[name].owned = true;
            if (name === "The_Ring") {
                AB.rings.mods = [];
                // Loop through children in div
                let children = elements.ringMods.children;
                for (let i = 0; i < children.length; i++) {
                    if (children[i].classList.contains("checkedButton")) {
                        AB.rings.mods.push(children[i].innerHTML);
                    } else {
                        let ind = AB.rings.mods.indexOf(children[i].innerHTML);
                        if (ind >= 0) {
                            AB.rings.mods.splice(ind, 1);
                        }
                    }
                }
                let input = document.getElementById("The_Ring_Input");
                AB.rings.level = input.value;
            }
        }
    });
    ABC.modifiedAB();
}

function calcBuildCost(set = false) {
    if (set) sets();
    let dustCost = 0;
    let shardCost = 0;
    for (let itemID in AB.items) {
        let item = AB.items[itemID];
        if (item.equipped) {
            let cost =
                (item.startPrice || 5) *
                ((1 - Math.pow(item.priceMod || 3, item.level - 1)) /
                    (1 - (item.priceMod || 3)));
            if (item.dustType === "shards") {
                shardCost += cost;
            } else {
                dustCost += cost;
            }
        }
    }

    // Price for contracts.
    let oneTimers = document.querySelectorAll("input.oneTimerInput");
    for (let i = 0; i < oneTimers.length; i++) {
        if (oneTimers[i].checked) {
            let name = oneTimers[i].id.replace("_Input", "");
            let cost = AB.oneTimerPrice(name);
            if (AB.oneTimers[name].useShards) {
                shardCost += cost;
            } else {
                dustCost += cost;
            }
        }
    }

    // Price for ring.
    if (AB.oneTimers["The_Ring"].owned && AB.rings.level > 1) {
        shardCost += Math.ceil(15 * Math.pow(2, AB.rings.level) - 30); // Subtracting 30 for the first level or something.
    }

    // Price for extra limbs.
    let extraLimbs = countLimbsUsed() - 4;
    AB.bonuses["Extra_Limbs"].level = extraLimbs;
    for (let i = 1; i < extraLimbs; i++) {
        let price = AB.bonuses["Extra_Limbs"].price;
        let mod = AB.bonuses["Extra_Limbs"].priceMod;
        dustCost += Math.ceil(price * Math.pow(mod, i));
    }

    elements.buildCostDust.innerHTML = toScientific(dustCost);
    elements.buildCostShards.innerHTML = toScientific(shardCost);
}

function setLevels() {
    let curr = document.getElementById("currentLevel");
    AB.enemyLevel = parseInt(curr.value);
    let maxLvl = document.getElementById("highestLevel");
    AB.maxEnemyLevel = parseInt(maxLvl.value);
    ABC.modifiedAB();
}

function setItemsInHtml(
    itemsList,
    oneTimersList,
    currentLevel,
    maxLevel,
    rings,
    mutations,
    scruffy
) {
    let itemBoxes = document.querySelectorAll("input.equipInput");
    let limbsUsed = 0;
    itemBoxes.forEach((box) => {
        box.value = 1;
        let item = box.id.replace("_Input", "");
        if (itemsList.hasOwnProperty(item)) {
            box.value = itemsList[item].level;
            let button = box.previousSibling;
            if (itemsList[item].equipped) {
                button.classList.remove("uncheckedButton");
                button.classList.add("checkedButton");
                limbsUsed += 1;
            } else {
                button.classList.remove("checkedButton");
                button.classList.add("uncheckedButton");
            }
        }
    });

    let OTButtons = document.querySelectorAll("button.oneTimerButton");
    OTButtons.forEach((OTButton) => {
        let OT = OTButton.id.replace("_Button", "");
        if (oneTimersList.hasOwnProperty(OT)) {
            if (oneTimersList[OT]) swapChecked(OTButton);
            if (OT === "The_Ring") {
                let children = elements.ringMods.children;
                for (let i = 0; i < children.length; i++) {
                    // check if mod is selected
                    if (rings.mods.includes(children[i].innerHTML)) {
                        children[i].classList.add("checkedButton");
                        children[i].classList.remove("uncheckedButton");
                    } else {
                        children[i].classList.add("uncheckedButton");
                        children[i].classList.remove("checkedButton");
                    }
                }
                let inputLvl = document.getElementById("The_Ring_Input");
                inputLvl.value = rings.level;
            }
        }
    });

    let target = document.getElementById("currentLevel");
    target.value = parseInt(currentLevel);

    target = document.getElementById("highestLevel");
    target.value = maxLevel;

    // Set limbs
    elements.limbsUsed.innerHTML = limbsUsed;

    // Set mutations
    let mutBtn = document.getElementById("Mutations_Button");
    let mut = mutations[0];
    if (mut) {
        u2Mutations.tree.Dust.purchased = true;
        mutBtn.classList.add("checkedButton");
        mutBtn.classList.remove("uncheckedButton");
    }

    mut = mutations[1];
    mutBtn = document.getElementById("Mutations_Button_2");
    if (mut) {
        u2Mutations.tree.Dust2.purchased = true;
        mutBtn.classList.add("checkedButton");
        mutBtn.classList.remove("uncheckedButton");
    }

    let scruffyBtn = document.getElementById("S21_Button");
    if (scruffy > 1466015503701000) {
        AB.scruffyLvl21 = true;
        scruffyBtn.classList.add("checkedButton");
        scruffyBtn.classList.remove("uncheckedButton");
    }
}

function resetItemsInHtml() {
    let itemBoxes = document.querySelectorAll("input.equipInput");
    itemBoxes.forEach((box) => {
        box.value = 1;
        let button = box.previousSibling;
        button.classList.remove("checkedButton");
        button.classList.add("uncheckedButton");
    });

    let OTBoxes = document.querySelectorAll("button.oneTimerButton");
    OTBoxes.forEach((button) => {
        button.classList.remove("checkedButton");
        button.classList.add("uncheckedButton");
    });

    let target = document.getElementById("currentLevel");
    target.value = 1;

    target = document.getElementById("highestLevel");
    target.value = 1;

    // Set limbs
    elements.limbsUsed.innerHTML = 0;
}

function orderByUnlock() {
    let order = AB.getItemOrder();
    let sorted = [];
    let n = order.length;
    for (let i = 0; i < n; i++) {
        let item = order[i];
        sorted.push(item.name);
    }
    return sorted;
}

function addListeners() {
    let target;
    // Start button
    document
        .getElementById("startButton")
        .addEventListener("click", startSimulation);

    // Stop button
    document
        .getElementById("stopButton")
        .addEventListener("click", stopSimulation);

    // Config
    document.getElementById("simHours").addEventListener("change", (event) => {
        simConfig.seconds = parseInt(event.target.value) * 60 * 60;
        ABC.reconfigure(simConfig);
    });
    document.getElementById("simFights").addEventListener("change", (event) => {
        simConfig.fights = parseInt(event.target.value);
        ABC.reconfigure(simConfig);
    });

    // SA level
    target = document.getElementById("currentLevel");
    target.value = AB.enemyLevel;
    target.addEventListener("change", (event) => {
        let value = parseInt(event.target.value);
        let maxLvl = document.getElementById("highestLevel");
        if (value < 1) {
            value = 1;
            event.target.value = value;
        }
        if (parseInt(maxLvl.value) < value) {
            maxLvl.value = value;
        }
        let effects = document.getElementById("effects");
        effects.innerHTML = AB.getEffects(value);

        if (autoRunChecked) startSimulation();
    });

    // SA highest level
    target = document.getElementById("highestLevel");
    target.value = AB.maxEnemyLevel;
    target.addEventListener("change", (event) => {
        let value = parseInt(event.target.value);
        if (value < 1) event.target.value = 1;
        if (autoRunChecked) startSimulation();
    });

    // Verbose enemy info
    /*
	target = document.getElementById("verboseEnemyButton")
	target.addEventListener("click", (event) => {
		displayVerboseEnemy(target);
	});
	*/

    // Input for save
    document.getElementById("saveInput").addEventListener("paste", (event) => {
        onSavePaste(event);
    });

    // Reset to save button
    document.getElementById("resetToSave").addEventListener("click", () => {
        resetToSave();
        if (autoRunChecked) startSimulation();
    });

    // Calculator buttons
    document
        .getElementById("bestUpgradesButton")
        .addEventListener("click", () => {
            findBestDps(true);
        });

    document
        .getElementById("bestDowngradesButton")
        .addEventListener("click", () => {
            findBestDps(false);
        });

    document
        .getElementById("bestRingModsButton")
        .addEventListener("click", () => {
            ringModsResults.startUp();
        });

    /*
	document
		.getElementById("theoreticalWin")
		.addEventListener("click", maxLuck);
*/

    document
        .getElementById("affordTimeBtn")
        .addEventListener("click", affordTime);

    target = document.getElementById("etherealChanceButton");
    target.addEventListener("click", (event) => {
        setEtherealChance(event.target);
    });

    target = document.getElementById("autoRun");
    target.addEventListener("click", (event) => {
        autoRunChecked = !autoRunChecked;
        swapChecked(event.target);
    });

    // Colours for afford time select.
    target = document.getElementById("affordTimeSelect");
    target.addEventListener("change", (event) => {
        let select = event.target;
        let option = select.querySelector(`option[value=${select.value}]`);
        target.style.backgroundColor = option.style.backgroundColor;
    });
}

let findBestStorage = {
    currDps: 0,
    currentIndex: 0,
    dustForItems: null,
    noValue: "-",
    ldiv: null,
    mdiv: null,
    rdiv: null,
    finalStuff: function (skipMessage = false) {
        // Split into dust and shards items.
        let dustItems = [];
        let shardItems = [];
        let copyDFI = [...findBestStorage.dustForItems];

        for (let item of copyDFI) {
            if (item.data.dustType === "shards") {
                shardItems.push(item);
            } else {
                dustItems.push(item);
            }
        }

        // Find best dust upgrades.
        let bestUpgradeDust;
        let bestPaybackDust;
        if (dustItems.length) {
            bestUpgradeDust = dustItems.reduce((a, b) =>
                a.increase > b.increase ? a : b
            );
            bestPaybackDust = dustItems.reduce((a, b) =>
                a.time < b.time ? a : b
            );
        }

        // Find best shards upgrades.
        let bestUpgradeShards;
        let bestPaybackShards;
        if (shardItems.length) {
            bestUpgradeShards = shardItems.reduce((a, b) =>
                a.increase > b.increase ? a : b
            );
            bestPaybackShards = shardItems.reduce((a, b) =>
                a.time < b.time ? a : b
            );
        }

        for (
            let index = 0;
            index < findBestStorage.dustForItems.length;
            ++index
        ) {
            let item = findBestStorage.dustForItems[index];
            let span2 = findBestStorage.mdiv.children[1 + index];
            let span3 = findBestStorage.rdiv.children[1 + index];

            if (item.name === bestUpgradeDust?.name) {
                // Bold the best dust upgradeCost
                span2.style.fontWeight = "bold";
            }

            if (item.name === bestPaybackDust?.name) {
                // Add bold to the best payback time
                span3.style.fontWeight = "bold";
            }

            if (item.name === bestUpgradeShards?.name) {
                // Italic the best shard upgradeCost
                span2.style.fontStyle = "italic";
            }

            if (item.name === bestPaybackShards?.name) {
                // Add italics to the best shard payback time
                span3.style.fontStyle = "italic";
            }
        }

        if (!skipMessage) {
            findBestStorage.message("Complete.");
        }
    },
    interruptedStuff: function () {
        findBestStorage.message("u borked it");
        for (let item of findBestStorage.dustForItems) {
            if (item.time == findBestStorage.noValue) {
                item.time = Infinity;
            }
        }
        findBestStorage.finalStuff(true);
    },
    message: function (string) {
        document.getElementById("bestUpgradesMessage").innerHTML = string;
    },
    onUpdate: function () {
        let item = findBestStorage.dustForItems[findBestStorage.currentIndex];
        findBestStorage.message(
            "Testing " +
                item.displayName +
                " " +
                Math.floor(ABC.getProgress() * 100) +
                "%"
        );

        let newDps = AB.getDustPs();
        let increase = newDps - findBestStorage.currDps;
        let percentage = (increase / findBestStorage.currDps) * 100;

        // How long until upgrade is paid back.
        item.time = increase <= 0 ? Infinity : item.upgradeCost / increase;

        // Check if upgrade costs shards.
        if (item.data.dustType === "shards") item.time *= 1e9;

        item.increase = percentage;
        let span2 =
            findBestStorage.mdiv.children[1 + findBestStorage.currentIndex];
        let span3 =
            findBestStorage.rdiv.children[1 + findBestStorage.currentIndex];
        span2.innerHTML = toScientific(item.increase, 2, true);
        span3.innerHTML = convertTime(item.time);
    },
    stage2: function () {
        findBestStorage.currDps = AB.getDustPs();
        findBestStorage.currentIndex = 0;
        findBestStorage.startNextSim(true);
    },
    startNextSim: function (firstItem = false) {
        if (!firstItem) {
            let item =
                findBestStorage.dustForItems[findBestStorage.currentIndex];
            let target = item.name === "Ring" ? AB.rings : AB.items[item.name];
            if (findBestStorage.upgrade) target.level--;
            else target.level++;
            ABC.modifiedAB();
            ++findBestStorage.currentIndex;
        }

        if (
            findBestStorage.currentIndex >= findBestStorage.dustForItems.length
        ) {
            findBestStorage.finalStuff();
            return;
        }

        let item = findBestStorage.dustForItems[findBestStorage.currentIndex];
        if (item.name === "Doppelganger_Signet") {
            item.time = Infinity;
            item.increase = 0;
            findBestStorage.startNextSim();
            return;
        }

        let target = item.name === "Ring" ? AB.rings : AB.items[item.name];
        if (findBestStorage.upgrade) target.level++;
        else target.level--;
        ABC.modifiedAB();

        simConfig.onFightResult = null;
        simConfig.onSimInterrupt = findBestStorage.interruptedStuff;
        simConfig.onSimComplete = findBestStorage.startNextSim;
        simConfig.onUpdate = findBestStorage.onUpdate;
        ABC.reconfigure(simConfig);
        runSimulation();
    },
    upgrade: true,
};
function findBestDps(upgrade = true) {
    if (ABC.isRunning()) {
        return;
    }
    sets();
    if (getEquippedItems().length) {
        findBestStorage.upgrade = upgrade;
        let items = getEquippedItems();
        if (
            document
                .getElementById("The_Ring_Button")
                .classList.contains("checkedButton")
        ) {
            items.push({ name: "Ring", data: { dustType: "shards" } });
        }
        findBestStorage.dustForItems = [];
        for (let item of items) {
            findBestStorage.dustForItems.push({
                name: item.name,
                displayName: item.name.replaceAll("_", " "),
                increase: 0,
                time: findBestStorage.noValue,
                upgradeCost:
                    item.name === "Ring"
                        ? AB.getRingLevelCost()
                        : AB.upgradeCost(item.name),
                data: item.data,
            });
        }

        let div = document.getElementById("bestUpgradesDiv");
        // Clear earlier data.
        findBestStorage.ldiv = null;
        findBestStorage.mdiv = null;
        findBestStorage.rdiv = null;
        div.innerHTML = "";

        let ldiv = document.createElement("div");
        let mdiv = document.createElement("div");
        let rdiv = document.createElement("div");
        div.appendChild(ldiv);
        div.appendChild(mdiv);
        div.appendChild(rdiv);
        findBestStorage.ldiv = ldiv;
        findBestStorage.mdiv = mdiv;
        findBestStorage.rdiv = rdiv;
        ldiv.innerHTML = "<span>Item ±1 level</span>";
        mdiv.innerHTML = "<span>~+%</span>";
        rdiv.innerHTML = "<span>Time until profit</span>";

        findBestStorage.dustForItems.forEach((item) => {
            let span1 = document.createElement("span");
            let span2 = document.createElement("span");
            let span3 = document.createElement("span");
            span1.innerHTML = item.displayName;
            span2.innerHTML = toScientific(item.increase, 2, true);
            span3.innerHTML = item.time; //convertTime(item.time);
            ldiv.appendChild(span1);
            mdiv.appendChild(span2);
            rdiv.appendChild(span3);
        });

        findBestStorage.message("Obtaining build stats...");

        simConfig.onFightResult = null;
        simConfig.onSimInterrupt = null;
        simConfig.onSimComplete = findBestStorage.stage2;
        simConfig.onUpdate = wrapup;
        ABC.reconfigure(simConfig);
        runSimulation();
    }
}

function getEquippedItems() {
    let equipped = [];
    for (const item in AB.items) {
        if (AB.items[item].equipped) {
            equipped.push({ name: item, data: AB.items[item] });
        }
    }
    return equipped;
}

function onSavePaste(event) {
    let paste = event.clipboardData.getData("text");
    if (paste.slice(-1) === "=" || paste.slice(-1) === "A") {
        save = JSON.parse(LZ.decompressFromBase64(paste));
        resetToSave();
    } else if (paste.includes("||") || paste.includes("\t")) {
        buildObject.loadFromSheet(paste);
    } else {
        console.log("Error importing!");
    }
}

function runSimulation() {
    AB.eth = 0;
    AB.total = 0;

    ABC.start();
}

function maxLuck() {
    sets();
    AB.resetAll();
    let whoDied = AB.oneFight(1);
    let span = document.getElementById("theoreticalWinSpan");

    if (span) {
        // Clear earlier data.
        while (span.firstChild) {
            span.removeChild(span.lastChild);
        }
        span.innerHTML = "You can theoretically win: " + !whoDied.isTrimp;
    } else {
        let parent = document.getElementById("theoreticalWin").parentElement;
        let span = document.createElement("span");
        span.id = "theoreticalWinSpan";
        span.innerHTML = "You can theoretically win: " + !whoDied.isTrimp;
        parent.appendChild(span);
    }
}

function convertTime(time) {
    // Return time as seconds, hours or days.
    if (time === Infinity) return time;
    time = time.toFixed(1);
    if (time === NaN) {
        return "error";
    } else if (time < 60) {
        return time + "s";
    } else if (time < 3600) {
        let seconds = time % 60;
        let minutes = (time - seconds) / 60;
        return Math.floor(minutes) + "m " + Math.floor(seconds) + "s";
    } else if (time < 86400) {
        let minutes = time % 3600;
        let hours = (time - minutes) / 3600;
        return Math.floor(hours) + "h " + Math.floor(minutes / 60) + "m";
    } else {
        time = time / 86400;
        let days = Math.floor(time);
        let hours = (time - days) * 24;
        return days + "d " + hours.toFixed(1) + "h";
    }
}

function convertTimeMs(time, accuracy = 1) {
    // Return time as milliseconds, seconds, hours or days.
    if (time == Infinity) return time;
    time = time.toFixed(accuracy);
    if (time === NaN) {
        return "error";
    } else if (time < 1000) {
        return time + "ms";
    } else if (time < 60000) {
        return (time / 1000).toFixed(accuracy) + "s";
    } else if (time < 3600000) {
        let seconds = time % 60000;
        let minutes = (time - seconds) / 60000;
        return Math.floor(minutes) + "m " + Math.floor(seconds / 1000) + "s";
    } else if (time < 86400000) {
        let minutes = time % 3600000;
        let hours = (time - minutes) / 3600000;
        return Math.floor(hours) + "h " + Math.floor(minutes / 60000) + "m";
    } else {
        time = time / 86400000;
        let days = Math.floor(time);
        let hours = (time - days) * 24;
        return days + "d " + hours.toFixed(1) + "h";
    }
}

function resetToSave() {
    if (save) {
        // Reset all values in Html.
        resetItemsInHtml();
        // Reset all values to the save.
        let items = save.global.autoBattleData.items;
        let oneTimers = save.global.autoBattleData.oneTimers;
        let currentLevel = save.global.autoBattleData.enemyLevel;
        let maxLevel = save.global.autoBattleData.maxEnemyLevel;
        let ring = save.global.autoBattleData.rings;
        let limbs = save.global.autoBattleData.bonuses.Extra_Limbs;
        let dusty = save.global.u2MutationData.Dust;
        let dustier = save.global.u2MutationData.Dust2;
        let scruffy = save.global.fluffyExp2;
        let mutations = [dusty, dustier];
        setItemsInHtml(
            items,
            oneTimers,
            currentLevel,
            maxLevel,
            ring,
            mutations,
            scruffy
        );

        sets();
        AB.bonuses.Extra_Limbs.level = limbs;

        let res = {
            dustPs: AB.getDustPs(),
            dust: save.global.autoBattleData.dust,
            shardDust: save.global.autoBattleData.shards,
        };
        setABResults(res);

        calcBuildCost(true);

        ABC.modifiedAB();
        if (autoRunChecked) startSimulation();
    }
}

function countLimbsUsed() {
    let count = 0;
    for (const item in AB.items) {
        if (AB.items[item].equipped) {
            count++;
        }
    }
    return count;
}

function addSelectAffordTime() {
    let select = document.getElementById("affordTimeSelect");
    select.style.backgroundColor = colours.dust;

    // Add each equip to select.
    let items = orderByUnlock();
    let option;
    for (let i = 0; i < items.length; i++) {
        let item = items[i];
        if (item === "Doppelganger_Signet") continue;
        option = document.createElement("option");
        option.value = item;
        option.innerHTML = item.replaceAll("_", " ");
        select.appendChild(option);

        let type = AB.items[item].dustType;
        switch (type) {
            case "shards":
                option.style.backgroundColor = colours.shard;
                break;
            default:
                option.style.backgroundColor = colours.dust;
        }
    }
    // Add ring to select.
    option = document.createElement("option");
    option.value = "The_Ring";
    option.innerHTML = "The Ring";
    option.style.backgroundColor = colours.theRing;
    select.appendChild(option);

    // Add limbs to select.
    option = document.createElement("option");
    option.value = "Extra_Limbs";
    option.innerHTML = "Next Limb";
    option.style.backgroundColor = colours.unlock;
    select.appendChild(option);

    // Add bonuses to select.
    for (let bonus in AB.oneTimers) {
        option = document.createElement("option");
        option.value = bonus;
        if (bonus === "The_Ring") {
            bonus = "Unlock the Ring";
            option.value = "Unlock_The_Ring";
        }
        bonus = bonus.replaceAll("_", " ");
        option.innerHTML = bonus;
        option.style.backgroundColor = colours.oneTimer;
        select.appendChild(option);
    }
}

function affordTime() {
    let item = document.getElementById("affordTimeSelect").value;
    let totalCost;
    let remainingCost;
    let usesShards = false;

    // If upgrade costs shards.
    if (item === "The_Ring") {
        usesShards = true;
        totalCost = AB.getRingLevelCost() * 1e9;
        remainingCost = totalCost - ABresults.shardDust * 1e9;
    } else if (item === "Extra_Limbs") {
        totalCost = AB.getBonusCost(item);
        remainingCost = totalCost - ABresults.dust;
    } else if (AB.oneTimers[item] || item === "Unlock_The_Ring") {
        // Check one timers.
        if (item === "Unlock_The_Ring") {
            item = "The_Ring";
        }
        let ot = AB.oneTimers[item];
        if (ot.useShards) {
            usesShards = true;
            totalCost = AB.oneTimerPrice(item);
            remainingCost = totalCost - ABresults.shardDust;
        } else {
            totalCost = AB.oneTimerPrice(item);
            remainingCost = totalCost - ABresults.dust;
        }
    } else if (AB.items[item].dustType === "shards") {
        usesShards = true;
        totalCost = AB.upgradeCost(item) * 1e9;
        remainingCost = totalCost - ABresults.shardDust * 1e9;
    } else {
        totalCost = AB.upgradeCost(item);
        remainingCost = totalCost - ABresults.dust;
    }

    let time = remainingCost / ABresults.dustPs;
    let span = document.getElementById("affordTimeSpan");
    while (span.firstChild) {
        span.removeChild(span.lastChild);
    }

    if (time === Infinity || isNaN(time)) {
        span.innerHTML = "You can never afford this upgrade.";
    } else if (time > 0) {
        time = convertTime(time);
        span.innerHTML = "You can afford this upgrade in " + time + ".";
    } else if (time <= 0) {
        span.innerHTML = "You can afford this upgrade now.";
    } else if (isNaN(time)) {
        span.innerHTML = "You can never afford this upgrade.";
    } else {
        span.innerHTML = "Big Bad";
    }

    let totalTime = totalCost / ABresults.dustPs;
    span = document.getElementById("affordNilDustTimeSpan");
    while (span.firstChild) {
        span.removeChild(span.lastChild);
    }

    if (totalTime > 0 && totalTime !== Infinity) {
        totalTime = convertTime(totalTime);
        let type = usesShards ? "shards" : "dust";
        span.innerHTML =
            "You can afford this upgrade in " +
            totalTime +
            " from 0 " +
            type +
            ".";
    }
}

function setABResults(res) {
    for (let item in res) {
        ABresults[item] = res[item];
    }
}

function displayVerboseEnemy(target) {
    let hiddenDiv = document.getElementById("verboseEnemyDiv");
    if (target.classList.contains("uncheckedButton")) {
        // Remove all children.
        while (hiddenDiv.firstChild) {
            hiddenDiv.removeChild(hiddenDiv.lastChild);
        }
        target.classList.remove("uncheckedButton");
        target.classList.add("checkedButton");
        hiddenDiv.style.display = "block";
        sets();
        AB.setProfile();
        let effects = AB.profile;
        let effectsSpan = document.createElement("span");
        effectsSpan.innerHTML = effects;
        hiddenDiv.appendChild(effectsSpan);
    } else {
        target.classList.remove("checkedButton");
        target.classList.add("uncheckedButton");
        hiddenDiv.style.display = "none";
    }
}

function setEtherealChance(button) {
    // If the button is checked.
    if (button.classList.contains("checkedButton")) {
        AB.setEthChance = false;
    } else {
        AB.setEthChance = true;
    }
    ABC.modifiedAB();
    swapChecked(button);
}

function swapChecked(item) {
    // If item is checked, uncheck it.
    if (item.classList.contains("checkedButton")) {
        item.classList.remove("checkedButton");
        item.classList.add("uncheckedButton");
    } else {
        item.classList.remove("uncheckedButton");
        item.classList.add("checkedButton");
    }
}

function toScientific(number, accuracy = 2, negative = false) {
    // Convert number to scientific notation.
    number = Number(number);
    if (!negative && number <= 0) return 0;
    if (Math.abs(number) < Math.pow(10, accuracy + 2))
        return number.toFixed(accuracy);
    number = number.toExponential(accuracy);
    let str = number.toString();
    str = str.replace("+", "");
    return str;
}

function importFromSheet(input) {
    let data = input.split("||")[1];
    data = data.split(",");
    let equips = {};
    data.forEach((equip) => {
        equip = equip.trim();
        equip = equip.match(/[a-zA-Z]+|[0-9]+/g); // Split into words and numbers. Regex is uglier than your mom.
    });
}

function getIndexCombinations(n, x) {
    let max = Math.pow(2, n);
    let indexes = [];
    let result = [];

    for (let i = Math.pow(2, x) - 1; i < max; i++) {
        indexes = getAllIndexes(i.toString(2).padStart(n, "0").split(""), "1");
        if (indexes.length == x) result.push(indexes);
    }

    return result;
}

function getRingModCombinations() {
    let mods = elements.ringMods.children;
    let n = elements.ringMods.children.length;
    let slots = AB.getRingSlots();
    let max = Math.pow(2, n);
    let indexes = [];
    let names = [];
    let modCombinations = [[], []];

    for (let i = Math.pow(2, slots) - 1; i < max; i++) {
        indexes = getAllIndexes(i.toString(2).padStart(n, "0").split(""), "1");
        if (indexes.length == slots) {
            names = [];
            for (let j = 0; j < slots; j++)
                names.push(mods[indexes[j]].innerHTML);

            modCombinations[0].push(indexes);
            modCombinations[1].push(names);
        }
    }

    return modCombinations;
}

function getAllIndexes(arr, val) {
    let indexes = [];
    for (let i = 0; i < arr.length; i++) if (arr[i] === val) indexes.push(i);
    return indexes;
}

function formatNames(names) {
    let result = [];
    for (let i = 0; i < names.length; i++)
        result.push(names[i][0].toUpperCase() + names[i].substring(1));

    return result.join(", ");
}

let ringModsResults = {
    modCombinationIndexes: [],
    modCombinationNames: [],
    combinationIndex: 0,
    bestDPS: 0,
    bestKillTime: Infinity,
    bestDPSIndex: 0,
    bestKillTimeIndex: 0,
    startingMods: [],
    farm: 1,

    message: function (string) {
        document.getElementById("bestUpgradesMessage").innerHTML = string;
    },

    startUp: function () {
        if (ABC.isRunning()) {
            return;
        }

        let mods = elements.ringMods.children;
        let n = elements.ringMods.children.length;
        let slots = AB.getRingSlots();
        AB.rings.mods = [];
        ringModsResults.startingMods = [];

        for (let i = 0; i < mods.length; i++) {
            if (mods[i].classList.contains("checkedButton"))
                ringModsResults.startingMods.push(i);
            mods[i].className = "uncheckedButton";
        }

        [
            ringModsResults.modCombinationIndexes,
            ringModsResults.modCombinationNames,
        ] = getRingModCombinations();
        let currentCombo = ringModsResults.modCombinationIndexes[0];

        for (let j = 0; j < slots; j++)
            mods[currentCombo[j]].className = "checkedButton";

        sets();

        // Clear earlier data.
        ringModsResults.bestDPS = 0;
        ringModsResults.bestKillTime = Infinity;
        ringModsResults.bestDPSIndex = 0;
        ringModsResults.bestKillTimeIndex = 0;
        ringModsResults.combinationIndex = 0;

        let div = document.getElementById("bestUpgradesDiv");

        div.innerHTML = "";
        let ldiv = document.createElement("div");
        let mdiv = document.createElement("div");
        let rdiv = document.createElement("div");
        div.appendChild(ldiv);
        div.appendChild(mdiv);
        div.appendChild(rdiv);

        ldiv.innerHTML = "<span>Ring Mod(s)</span>";
        mdiv.innerHTML = "<span>Dust/s</span>";
        rdiv.innerHTML = "<span>Kill Time</span>";

        let names = [];
        for (let i = 0; i < ringModsResults.modCombinationIndexes.length; i++) {
            let span1 = document.createElement("span");
            let span2 = document.createElement("span");
            let span3 = document.createElement("span");

            names = ringModsResults.modCombinationNames[i];

            span1.innerHTML = formatNames(names);
            span2.innerHTML = "";
            span3.innerHTML = "";
            ldiv.appendChild(span1);
            mdiv.appendChild(span2);
            rdiv.appendChild(span3);
        }

        simConfig.onFightResult = null;
        simConfig.onSimInterrupt = null;
        simConfig.onSimComplete = ringModsResults.onComplete;
        simConfig.onUpdate = ringModsResults.onUpdate;
        ABC.reconfigure(simConfig);
        runSimulation();
    },

    onComplete: function () {
        if (ABC.isRunning()) {
            return;
        }

        let dps = AB.getDustPs();
        let killTime = AB.lootAvg.counter / AB.sessionEnemiesKilled;
        let div = document.getElementById("bestUpgradesDiv");
        let span2 =
            div.children[1].children[1 + ringModsResults.combinationIndex];
        let span3 =
            div.children[2].children[1 + ringModsResults.combinationIndex];
        span2.innerHTML = toScientific(dps, 2, true);
        span3.innerHTML = convertTimeMs(killTime);

        if (dps > ringModsResults.bestDPS) {
            ringModsResults.bestDPS = dps;
            ringModsResults.bestDPSIndex = ringModsResults.combinationIndex;
        }

        if (killTime < ringModsResults.bestKillTime) {
            ringModsResults.bestKillTime = killTime;
            ringModsResults.bestKillTimeIndex =
                ringModsResults.combinationIndex;
        }

        ringModsResults.combinationIndex++;
        if (
            ringModsResults.combinationIndex >=
            ringModsResults.modCombinationIndexes.length
        ) {
            ringModsResults.finalStuff();
            return;
        }

        let mods = elements.ringMods.children;
        let n = elements.ringMods.children.length;
        let slots = AB.getRingSlots();
        AB.rings.mods = [];

        for (let i = 0; i < mods.length; i++)
            mods[i].className = "uncheckedButton";

        let currentCombo =
            ringModsResults.modCombinationIndexes[
                ringModsResults.combinationIndex
            ];

        for (let j = 0; j < slots; j++)
            mods[currentCombo[j]].className = "checkedButton";

        sets();

        simConfig.onFightResult = null;
        simConfig.onSimInterrupt = null;
        simConfig.onSimComplete = ringModsResults.onComplete;
        simConfig.onUpdate = ringModsResults.onUpdate;
        ABC.reconfigure(simConfig);
        runSimulation();
    },

    onUpdate: function () {
        ringModsResults.message(
            "Testing " +
                formatNames(AB.rings.mods) +
                " " +
                Math.floor(ABC.getProgress() * 100) +
                "%"
        );

        let dps = AB.getDustPs();
        let killTime = AB.lootAvg.counter / AB.sessionEnemiesKilled;

        let div = document.getElementById("bestUpgradesDiv");
        let span2 =
            div.children[1].children[1 + ringModsResults.combinationIndex];
        let span3 =
            div.children[2].children[1 + ringModsResults.combinationIndex];
        span2.innerHTML = toScientific(dps, 2, true);
        span3.innerHTML = convertTimeMs(killTime);
    },

    finalStuff: function () {
        let mods = elements.ringMods.children;

        for (let i = 0; i < mods.length; i++)
            mods[i].className = "uncheckedButton";

        for (let j = 0; j < ringModsResults.startingMods.length; j++)
            mods[ringModsResults.startingMods[j]].className = "checkedButton";

        //set mod buttons back to original
        let div = document.getElementById("bestUpgradesDiv");
        let span2 = div.children[1].children[1 + ringModsResults.bestDPSIndex];
        let span3 =
            div.children[2].children[1 + ringModsResults.bestKillTimeIndex];
        span2.style.fontWeight = "bold";
        span3.style.fontWeight = "bold";
    },
};
