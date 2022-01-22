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
let ABresults = {
	dustPs: undefined,
	dust: undefined,
	shardDust: undefined,
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
		dustPs: document.getElementById("dustPs"),
		averageFightTime: document.getElementById("averageFightTime"),
		averageKillTime: document.getElementById("averageKillTime"),
		shardsPs: document.getElementById("shardsPs"),
		limbsUsed: document.getElementById("limbsUsed"),
		ringMods: document.getElementById("ringModsDiv"),
	};
}

const startSimulation = () => {
	sets();
	calcBuildCost(false);
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
	let per = 100 * format(WR);
	elements.trimpsKilled.innerHTML =
		trimpsKilled + " [" + per.toString().slice(0, 4) + "%]";

	let clearingTime =
		((toKill / AB.sessionEnemiesKilled) * AB.lootAvg.counter) / 1000;

	elements.clearingTime.innerHTML = convertTime(clearingTime);
	elements.dustPs.innerHTML = toScientific(base_dust) + " D/s";

	let base_shards = AB.enemyLevel >= 51 ? base_dust / 1e9 : 0;
	elements.shardsPs.innerHTML = toScientific(base_shards) + " S/s";

	let fightTime = timeSpent / (enemiesKilled + trimpsKilled);
	elements.averageFightTime.innerHTML = convertTimeMs(fightTime, 2);

	fightTime = timeSpent / enemiesKilled;
	elements.averageKillTime.innerHTML = convertTimeMs(fightTime, 2);
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
		addChangeForButton(button);

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

			let span = document.createElement("span");
			let name = oneTimer.replaceAll("_", " ");
			span.innerHTML = name;
			div.appendChild(span);

			let rightDiv = document.createElement("div");

			// If ring
			if (oneTimer.includes("Ring")) {
				rightDiv.id = "inputAndCheckRingDiv";
				rightDiv.addEventListener("change", () => {
					calcBuildCost(true);
				});
			}
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
						swapChecked(modifier);
					});
					modDiv.appendChild(modifier);
				}
			}

			let checkBox = document.createElement("input");
			checkBox.type = "checkBox";
			checkBox.className = "oneTimerInput";
			checkBox.id = oneTimer + "_Input";

			rightDiv.appendChild(checkBox);
		}
	}
}

function addChangeForLevel(item) {
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
		calcBuildCost(true);
	});
}

function addChangeForButton(button) {
	button.addEventListener("click", (event) => {
		let lvl = document.getElementById(
			button.id.replace("_Button", "_Input")
		);
		let name = button.id.replace("_Button", "");
		if (parseInt(lvl.value) > 0) {
			AB.equip(name);
		}

		swapChecked(button);

		// Set limbs.
		elements.limbsUsed.innerHTML = countLimbsUsed();

		calcBuildCost(true);
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
				if (item.previousSibling.classList.contains("checkedButton")) {
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
	// Check ring.
	if (AB.oneTimers["The_Ring"].owned) {
		shardCost += Math.ceil(15 * Math.pow(2, AB.rings.level));
	}

	// Price for extra limbs.
	let extraLimbs = countLimbsUsed() - 4;
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
		let effects = document.getElementById("effects");
		effects.innerHTML = AB.getEffects(value);
	});

	// SA highest level
	target = document.getElementById("highestLevel");
	target.value = AB.maxEnemyLevel;
	target.addEventListener("change", (event) => {
		let value = parseInt(event.target.value);
		if (value < 1) event.target.value = 1;
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
		.getElementById("theoreticalWin")
		.addEventListener("click", maxLuck);

	document
		.getElementById("affordTimeBtn")
		.addEventListener("click", affordTime);

	target = document.getElementById("etherealChanceButton");
	target.addEventListener("click", () => {
		setEtherealChance(target);
	});
}

function findBestDps(upgrade = true) {
	sets();

	if (getEquippedItems().length) {
		let speed = 200069;
		runSimulation(speed);
		let currDps = AB.getDustPs();
		let items = getEquippedItems();
		let ringChecked = document.getElementById("The_Ring_Input").nextSibling;
		if (ringChecked.checked) {
			items.push({ name: "Ring", data: { dustType: "shards" } });
		}
		let dustForItems = [];

		AB.getRingLevelCost();
		for (const ind in items) {
			let name = items[ind].name;
			let newDps = dustWithGrade(name, speed, upgrade);
			let increase = newDps - currDps;
			increase = currDps / increase > 10000 ? 0 : increase;

			// How long until upgrade is paid back.
			let upgradeCost =
				name === "Ring"
					? AB.getRingLevelCost()
					: AB.upgradeCost(items[ind].name);

			let time = upgradeCost / increase;
			if (time < 0) {
				time = Infinity;
			}

			// Check if upgrade costs shards.
			let shard = items[ind].data.dustType === "shards";
			if (shard) time *= 1e9;
			if (name === "Doppelganger_Signet") {
				time = Infinity;
				increase = 0;
			}

			dustForItems.push({
				name: name,
				increase: increase,
				time: time,
				data: items[ind].data,
			});
		}

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
		text.innerHTML = `Item ${upgrade ? "+" : "-"}1 level`;
		ldiv.appendChild(text);

		let text2 = document.createElement("span");
		text2.innerHTML = "~+DpS";
		mdiv.appendChild(text2);

		let text3 = document.createElement("span");
		text3.innerHTML = "Time until profit";
		rdiv.appendChild(text3);

		// Split into dust and shards items.
		let dustItems = [];
		let shardItems = [];
		let copyDFI = [...dustForItems];

		for (const ind in copyDFI) {
			let item = copyDFI[ind];
			if (item.data.dustType === "shards") {
				shardItems.push(item);
			} else {
				dustItems.push(item);
			}
		}

		// Find best dust upgrades.
		let bestUpgradeDust = dustItems.reduce((a, b) =>
			a.increase > b.increase ? a : b
		);
		let bestPaybackDust = dustItems.reduce((a, b) =>
			a.time < b.time ? a : b
		);

		// Find best shards upgrades.
		let bestUpgradeShards = shardItems.reduce((a, b) =>
			a.increase > b.increase ? a : b
		);
		let bestPaybackShards = shardItems.reduce((a, b) =>
			a.time < b.time ? a : b
		);

		dustForItems.forEach((item) => {
			let name = item.name.replaceAll("_", " ");
			let span1 = document.createElement("span");
			let span2 = document.createElement("span");
			let span3 = document.createElement("span");
			span1.innerHTML = name;
			span2.innerHTML = toScientific(item.increase);
			span3.innerHTML = convertTime(item.time);
			ldiv.appendChild(span1);
			mdiv.appendChild(span2);
			rdiv.appendChild(span3);

			if (item.name === bestUpgradeDust.name) {
				// Bold the best dust upgradeCost
				span2.style.fontWeight = "bold";
			}
			
			if (item.name === bestPaybackDust.name) {
				// Add bold to the best payback time
				span3.style.fontWeight = "bold";
			}

			if (item.name === bestUpgradeShards.name) {
				// Italic the best shard upgradeCost
				span2.style.fontStyle = "italic";
			}

			if (item.name === bestPaybackShards.name) {
				// Add italics to the best shard payback time
				span3.style.fontStyle = "italic";
			}
		});
	}
	runSimulation();
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

function dustWithGrade(name, speed, upgrade) {
	let target = name === "Ring" ? AB.rings : AB.items[name];
	if (upgrade) target.level++;
	else target.level--;
	runSimulation(speed);
	let dust = AB.getDustPs();
	if (upgrade) target.level--;
	else target.level++;
	return dust;
}

function runSimulation(speed = 100000) {
	AB.eth = 0;
	AB.total = 0;
	AB.speed = speed;
	AB.resetAll();
	let res;
	startTime = Date.now();

	// Check if max and min luck gives the same results.
	AB.oneFight(1);
	let maxLuckTime = AB.lootAvg.counter;
	let maxLuckRewards = AB.lootAvg.accumulator;
	AB.oneFight(-1);
	let minLuckTime = AB.lootAvg.counter - maxLuckTime;
	let minLuckRewards = AB.lootAvg.accumulator - maxLuckRewards;

	// Otherwise run simulation.
	if (maxLuckTime !== minLuckTime || maxLuckRewards !== minLuckRewards) {
		AB.resetAll();
		startTime = Date.now();
		AB.update();
	}
	res = {
		dustPs: AB.getDustPs(),
	};
	setABResults(res);
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
	time = time.toFixed(1);
	if (time == Infinity) return time;
	else if (time === NaN) {
		return "error";
	} else if (time < 3600) {
		return time + "s";
	} else if (time < 86400) {
		return (time / 3600).toFixed(1) + "h";
	} else {
		time = time / 86400;
		let days = Math.floor(time);
		let hours = (time - days) * 24;
		return days + "d " + hours.toFixed(1) + "h";
	}
}

function convertTimeMs(time, accuracy = 1) {
	// Return time as milliseconds, seconds, hours or days.
	time = time.toFixed(accuracy);
	if (time == Infinity) return time;
	else if (time === NaN) {
		return "error";
	} else if (time < 1000) {
		return time + "ms";
	} else if (time < 3600000) {
		return (time / 1000).toFixed(accuracy) + "s";
	} else if (time < 86400000) {
		return (time / 3600000).toFixed(accuracy) + "h";
	} else {
		time = time / 86400000;
		let days = Math.floor(time);
		let hours = (time - days) * 24;
		return days + "d " + hours.toFixed(1) + "h";
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
		let limbs = save.global.autoBattleData.bonuses.Extra_Limbs;
		setItemsInHtml(items, oneTimers, currentLevel, maxLevel, ring);

		sets();
		AB.bonuses.Extra_Limbs.level = limbs;
		runSimulation();
		let res = {
			dustPs: AB.getDustPs(),
			dust: save.global.autoBattleData.dust,
			shardDust: save.global.autoBattleData.shards,
		};
		setABResults(res);

		calcBuildCost(true);
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

	// Add each equip to select.
	let items = orderByUnlock();
	let option;
	for (let i = 0; i < items.length; i++) {
		let item = items[i];
		if (item === "Doppelganger_Signet") continue;
		option = document.createElement("option");
		option.value = item;
		item = item.replaceAll("_", " ");
		option.innerHTML = item;
		select.appendChild(option);
	}
	// Add ring to select.
	option = document.createElement("option");
	option.value = "The_Ring";
	option.innerHTML = "The Ring";
	select.appendChild(option);

	// Add limbs to select.
	option = document.createElement("option");
	option.value = "Extra_Limbs";
	option.innerHTML = "Next Limb";
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
		select.appendChild(option);
	}
}

function affordTime() {
	let item = document.getElementById("affordTimeSelect").value;
	let remainingCost;

	// If upgrade costs shards.
	if (item === "The_Ring") {
		remainingCost = AB.getRingLevelCost() * 1e9;
		remainingCost -= ABresults.shardDust * 1e9;
	} else if (item === "Extra_Limbs") {
		remainingCost = AB.getBonusCost(item) - ABresults.dust;
	} else if (AB.oneTimers[item] || item === "Unlock_The_Ring") {
		// Check one timers.
		if (item === "Unlock_The_Ring") {
			item = "The_Ring";
		}
		let ot = AB.oneTimers[item];
		if (ot.useShards) {
			remainingCost = AB.oneTimerPrice(item) - ABresults.shardDust;
		} else remainingCost = AB.oneTimerPrice(item) - ABresults.dust;
	} else if (AB.items[item].dustType === "shards") {
		remainingCost = AB.upgradeCost(item) * 1e9;
		remainingCost -= ABresults.shardDust * 1e9;
	} else {
		remainingCost = AB.upgradeCost(item) - ABresults.dust;
	}
	let time = remainingCost / ABresults.dustPs;
	let span = document.getElementById("affordTimeSpan");
	while (span.firstChild) {
		span.removeChild(span.lastChild);
	}

	if (time > 0) {
		time = convertTime(time);
		span.innerHTML = "You can afford this upgrade in " + time + ".";
	} else if (time <= 0) {
		span.innerHTML = "You can afford this upgrade now.";
	} else if (isNaN(time)) {
		span.innerHTML = "You can never afford this upgrade.";
	} else {
		span.innerHTML = "Big Bad";
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
		// Revmoe all children.
		while (hiddenDiv.firstChild) {
			hiddenDiv.removeChild(hiddenDiv.lastChild);
		}
		target.classList.remove("uncheckedButton");
		target.classList.add("checkedButton");
		hiddenDiv.style.display = "block";
		sets();
		runSimulation(1);
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
		button.classList.remove("checkedButton");
		button.classList.add("uncheckedButton");
		AB.setEthChance = false;
	} else {
		button.classList.remove("uncheckedButton");
		button.classList.add("checkedButton");
		AB.setEthChance = true;
	}
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

function toScientific(number, accuracy = 2) {
	// Convert number to scientific notation.
	if (number <= 0) return 0;
	if (number < Math.pow(10, accuracy + 2)) return number.toFixed(accuracy);
	number = number.toExponential(accuracy);
	let str = number.toString();
	str = str.replace("+", "");
	return str;
}
