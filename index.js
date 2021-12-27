import { autoBattle } from "./object.js";
import { LZString } from "./lz-string.js";

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

function getElements() {
	return {
		buildCostDust: document.getElementById("buildCostDust"),
		buildCostShards: document.getElementById("buildCostShards"),
		timeSpent: document.getElementById("timeSpent"),
		processedTime: document.getElementById("processedTime"),
		enemiesKilled: document.getElementById("enemiesKilled"),
		trimpsKilled: document.getElementById("trimpsKilled"),
		clearingTime: document.getElementById("clearingTime"),
		dustPs: document.getElementById("dustPs"),
		averageFightTime: document.getElementById("averageFightTime"),
		averageKillTime: document.getElementById("averageKillTime"),
		shardsPs: document.getElementById("shardsPs"),
		limbsUsed: document.getElementById("limbsUsed"),
		ringMods: document.getElementById("ringModsDiv"),
	};
}

const startSimulation = () => {
	AB.bonuses.Extra_Limbs.level = 100; // For safety
	sets();
	calcBuildCost();
	runSimulation(100000);
	wrapup();
};

const enemyCount = (level) => {
	if (level < 20) return 10 * level;
	return 190 + 15 * (level - 19);
};

const wrapup = () => {
	const endTime = Date.now();
	const time = endTime - startTime;
	const WR =
		AB.sessionEnemiesKilled /
		(AB.sessionEnemiesKilled + AB.sessionTrimpsKilled);
	const toKill = enemyCount(AB.enemyLevel);
	const base_dust = AB.getDustPs();

	elements.timeSpent.innerHTML = time + " ms";

	let timeSpent = AB.lootAvg.counter;
	elements.processedTime.innerHTML = convertTimeMs(timeSpent);

	let enemiesKilled = AB.sessionEnemiesKilled;
	elements.enemiesKilled.innerHTML = enemiesKilled;

	let trimpsKilled = AB.sessionTrimpsKilled;
	elements.trimpsKilled.innerHTML =
		trimpsKilled + " [" + 100 * format(WR) + "%]";

	let clearingTime = ((toKill / AB.sessionEnemiesKilled) * AB.lootAvg.counter) / 1000;

	elements.clearingTime.innerHTML = convertTime(clearingTime);
	elements.dustPs.innerHTML = format(base_dust) + " D/s";

	let fightTime = timeSpent / (enemiesKilled + trimpsKilled);
	elements.averageFightTime.innerHTML = format(fightTime) + " ms";

	fightTime = timeSpent / enemiesKilled;
	elements.averageKillTime.innerHTML = format(fightTime) + " ms";

	let base_shards = AB.enemyLevel >= 51 ? base_dust / 1e9 : 0;
	elements.shardsPs.innerHTML = format(base_shards) + " S/s";
};

function setup() {
	makeEquipBtns();
	makeOneTimersBtns();
	addListeners();
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

		let span = document.createElement("span");
		let name = item.replaceAll("_", " ");
		span.textContent = name;
		div.appendChild(span);

		let inpDiv = document.createElement("div");
		inpDiv.className = "inputAndCheckDiv";
		div.appendChild(inpDiv);

		let input = document.createElement("input");
		input.type = "number";
		input.value = 1;
		input.className = "equipInput";
		input.id = item + "_Input";
		addChangeForEquip(input);
		inpDiv.appendChild(input);

		let checkBox = document.createElement("input");
		checkBox.type = "checkBox";
		checkBox.id = item + "_CheckBox";
		addChangeForCheckBox(checkBox);
		inpDiv.appendChild(checkBox);
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

			let span = document.createElement("span");
			let name = oneTimer.replaceAll("_", " ");
			span.innerHTML = name;
			div.appendChild(span);

			let rightDiv = document.createElement("div");
			rightDiv.className = "inputAndCheckRingDiv";
			div.appendChild(rightDiv);

			if (oneTimer === "The_Ring") {
				let input = document.createElement("input");
				input.type = "number";
				input.value = 1;
				input.id = "The_Ring_Input";
				rightDiv.appendChild(input);

				let modDiv = document.createElement("div");
				modDiv.id = "ringModsDiv";
				div.appendChild(modDiv);
				for (const mod in AB.ringStats) {
					let modifier = document.createElement("button");
					modifier.innerHTML = mod;
					modifier.className = "uncheckedButton";
					modifier.addEventListener("click", () => {
						if (modifier.classList.contains("uncheckedButton")) {
							modifier.classList.add("checkedButton");
							modifier.classList.remove("uncheckedButton");
						} else {
							modifier.classList.add("uncheckedButton");
							modifier.classList.remove("checkedButton");
						}
					});
					modDiv.appendChild(modifier);
				}
			}

			let checkBox = document.createElement("input");
			checkBox.type = "checkBox";
			checkBox.className = "oneTimerInput";
			checkBox.id = oneTimer + "_Input";

			// Only for ring really :/
			checkBox.addEventListener("change", () => {
				calcBuildCost();
			});
			rightDiv.appendChild(checkBox);
		}
	}
}

function addChangeForEquip(item) {
	item.addEventListener("change", (event) => {
		let value = event.target.value;
		if (parseInt(Number(value)) >= 1) {
			let name = item.id.replace("_Input", "");
			value = Number(value).toString();
			event.target.value = value;
			AB.items[name].level = value;
		} else {
			event.target.value = 1;
		}
		calcBuildCost();
	});
}

function addChangeForCheckBox(checkBox) {
	checkBox.addEventListener("change", (event) => {
		let lvl = document.getElementById(
			checkBox.id.replace("_CheckBox", "_Input")
		);
		let name = checkBox.id.replace("_CheckBox", "");
		if (parseInt(lvl.value) > 0) {
			AB.equip(name);
		}

		// Set limbs.
		elements.limbsUsed.innerHTML = countLimbsUsed();

		calcBuildCost();
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
				if (item.nextSibling.checked) {
					AB.equip(name);
				}
			}
		});
	}
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
}

function setOneTimers() {
	let oneTimers = document.querySelectorAll("input.oneTimerInput");
	oneTimers.forEach((oneTimer) => {
		if (oneTimer.checked) {
			let name = oneTimer.id.replace("_Input", "");
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
				let val = oneTimer.previousSibling;
				AB.rings.level = val.value;
			}
		}
	});
}

function calcBuildCost() {
	sets();
	let dustCost = 0;
	let shardCost = 0;
	for (let itemID in AB.items) {
		let item = AB.items[itemID];
		if (item.equipped) {
			let cost = (item.startPrice || 5) *
				((1 -
					Math.pow(
						item.priceMod || 3,
						item.level - 1
					)) /
					(1 - (item.priceMod || 3)));
			if (item.dustType === "shards") {
				shardCost += cost;
			} else {
				dustCost += cost;
			}
		}
	}
	// Check ring.
	if (AB.oneTimers["The_Ring"].owned) {
		shardCost += Math.ceil(15 * Math.pow(2, AB.rings.level));
	}

	elements.buildCostDust.innerHTML = prettify(dustCost);
	elements.buildCostShards.innerHTML = prettify(shardCost);
}

function setLevels() {
	let curr = document.getElementById("currentLevel");
	AB.enemyLevel = parseInt(curr.value);
	let maxLvl = document.getElementById("highestLevel");
	AB.maxEnemyLevel = parseInt(maxLvl.value);
}

function setItemsInHtml(
	itemsList,
	oneTimersList,
	currentLevel,
	maxLevel,
	rings
) {
	let itemBoxes = document.querySelectorAll("input.equipInput");
	let limbsUsed = 0;
	itemBoxes.forEach((box) => {
		box.value = 1;
		let item = box.id.replace("_Input", "");
		if (itemsList.hasOwnProperty(item)) {
			box.value = itemsList[item].level;
			if (itemsList[item].equipped) {
				box.nextSibling.checked = true;
				limbsUsed += 1;
			} else {
				box.nextSibling.checked = false;
			}
		}
	});

	let OTBoxes = document.querySelectorAll("input.oneTimerInput");
	OTBoxes.forEach((box) => {
		let OT = box.id.replace("_Input", "");
		if (oneTimersList.hasOwnProperty(OT)) {
			if (oneTimersList[OT]) box.checked = true;
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
				let lvl = box.previousSibling;
				lvl.value = rings.level;
			}
		}
	});

	let target = document.getElementById("currentLevel");
	target.value = parseInt(currentLevel);

	target = document.getElementById("highestLevel");
	target.value = maxLevel;

	// Set limbs
	elements.limbsUsed.innerHTML = limbsUsed;
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
	});

	// SA highest level
	target = document.getElementById("highestLevel");
	target.value = AB.maxEnemyLevel;
	target.addEventListener("change", (event) => {
		let value = parseInt(event.target.value);
		if (value < 1) event.target.value = 1;
	});

	// Input for save
	target = document.getElementById("saveInput");
	target.addEventListener("paste", (event) => {
		onSavePaste(event);
	});

	// Reset to save button
	target = document.getElementById("resetToSave");
	target.addEventListener("click", (event) => {
		resetToSave();
	});

	// Calculator buttons
	document
		.getElementById("bestUpgradesButton")
		.addEventListener("click", findBestDpsUpgrade);

	document
		.getElementById("theoreticalWin")
		.addEventListener("click", maxLuck);
}

function findBestDpsUpgrade() {
	sets();

	if (getEquippedItems().length) {
		let speed = 200069;
		runSimulation(speed);
		let currDps = AB.getDustPs();
		let items = getEquippedItems();
		if (autoBattle.rings?.level) {
			items.push({ name: "Ring", data: { dustType: "shards" } })
		}
		let dustForItems = [];
		for (const ind in items) {
			let name = items[ind].name;
			let newDps = dustWithUpgrade(name, speed);
			let increase = newDps - currDps;
			increase = (currDps / increase > 10000) ? 0 : increase;

			// How long until upgrade is paid back.
			let upgradeCost = (name == "Ring" ? AB.getRingLevelCost() : AB.upgradeCost(items[ind].name));
			let time = upgradeCost / increase;
			if (time < 0) {
				time = Infinity;
			}

			// Check if upgrade costs shards.
			let shard = items[ind].data.dustType == "shards";
			if (shard) time *= 1e9;
			if (name === "Doppelganger_Signet") {
				time = Infinity;
				increase = 0;
			}

			dustForItems.push({
				name: name,
				increase: increase,
				time: time,
			});
		}

		// Find the best upgrade.
		let bestUpgrade = dustForItems.reduce((a, b) =>
			a.increase > b.increase ? a : b
		);

		// Find the lowest payback time.
		let bestPayback = dustForItems.reduce((a, b) =>
			a.time < b.time ? a : b
		);

		let div = document.getElementById("bestUpgradesDiv");
		// Clear earlier data.
		while (div.firstChild) {
			div.removeChild(div.lastChild);
		}

		let ldiv = document.createElement("div");
		let mdiv = document.createElement("div");
		let rdiv = document.createElement("div");
		div.appendChild(ldiv);
		div.appendChild(mdiv);
		div.appendChild(rdiv);

		let text = document.createElement("span");
		text.innerHTML = "Item +1 level";
		ldiv.appendChild(text);

		let text2 = document.createElement("span");
		text2.innerHTML = "~+DpS";
		mdiv.appendChild(text2);

		let text3 = document.createElement("span");
		text3.innerHTML = "Time until profit";
		rdiv.appendChild(text3);

		dustForItems.forEach((item) => {
			let name = item.name.replaceAll("_", " ");
			let span1 = document.createElement("span");
			let span2 = document.createElement("span");
			let span3 = document.createElement("span");
			span1.innerHTML = name;
			span2.innerHTML = prettify(item.increase);
			span3.innerHTML = convertTime(item.time);
			ldiv.appendChild(span1);
			mdiv.appendChild(span2);
			rdiv.appendChild(span3);

			if (item.name === bestUpgrade.name) {
				// Bold the best upgradeCost
				span2.style.fontWeight = "bold";
			}

			if (item.name === bestPayback.name) {
				// Add astrix to the best payback time
				span3.style.fontWeight = "bold";
			}
		});
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
	save = JSON.parse(LZ.decompressFromBase64(paste));
	resetToSave();
}

function dustWithUpgrade(name, speed) {
	let target = (name == "Ring" ? AB.rings : AB.items[name])
	target.level++;
	runSimulationNoSet(speed);
	let dust = AB.getDustPs();
	target.level--;
	return dust;
}

function runSimulation(speed = 100000) {
	AB.speed = speed;
	AB.resetAll();
	sets();
	startTime = Date.now();
	AB.update();
}

function runSimulationNoSet(speed = 100000) {
	AB.speed = speed;
	AB.resetStats()
	AB.update();
}

function maxLuck() {
	sets();
	let whoDied = AB.oneFight();
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
	time = time.toFixed(1);
	if (time == Infinity) {
		return time;
	} else if (time < 3600) {
		return time + "s";
	} else if (time < 86400) {
		return (time / 3600).toFixed(1) + "h";
	} else {
		return (time / 86400).toFixed(1) + "d";
	}
}

function convertTimeMs(time) {
	// Return time as milliseconds, seconds, hours or days.
	time = time.toFixed(1);
	if (time < 1000) {
		return time + "ms";
	} else if (time < 3600000) {
		return (time / 1000).toFixed(1) + "s";
	} else if (time < 86400000) {
		return (time / 3600000).toFixed(1) + "h";
	} else {
		return (time / 86400000).toFixed(1) + "d";
	}
}

function resetToSave() {
	if (save) {
		// Reset all values to the save.
		let items = save.global.autoBattleData.items;
		let oneTimers = save.global.autoBattleData.oneTimers;
		let currentLevel = save.global.autoBattleData.enemyLevel;
		let maxLevel = save.global.autoBattleData.maxEnemyLevel;
		let ring = save.global.autoBattleData.rings;
		setItemsInHtml(items, oneTimers, currentLevel, maxLevel, ring);
		calcBuildCost();
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