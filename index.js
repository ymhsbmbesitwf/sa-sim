import { autoBattle } from "./object.js";

document.addEventListener("DOMContentLoaded", function () {
	setup();
	getElements();
});

let AB = autoBattle;
let startTime;
let formatter = new Intl.NumberFormat("en-IN", { minimumFractionDigits: 3 });
function format(num) {
	num = formatter.format(num);
	return num.replaceAll(",", " ");
}
let buildCost;
let elements;

let settings = {
	enemyLevel: 1,
	maxEnemyLevel: 1,
};

function getElements() {
	let ele = {
		buildCost: document.getElementById("buildCost"),
		timeSpent: document.getElementById("timeSpent"),
		processedTime: document.getElementById("processedTime"),
		enemiesKilled: document.getElementById("enemiesKilled"),
		trimpsKilled: document.getElementById("trimpsKilled"),
		clearingTime: document.getElementById("clearingTime"),
		dustPs: document.getElementById("dustPs"),
		averageFightTime: document.getElementById("averageFightTime"),
		averageKillTime: document.getElementById("averageKillTime"),
	};
	elements = ele;
}

const startSimulation = () => {
	// AB.resetAll();
	AB.enemyLevel = settings.enemyLevel;
	AB.maxEnemyLevel = settings.maxEnemyLevel;
	AB.bonuses.Extra_Limbs.level = 20; // TODO: make this better if needed?
	setActiveItems();
	setActiveOneTimers();
	setLevels();
	// calcBuildCost();

	let iterations = 1000;
	AB.speed = 100;
	AB.resetCombat();
	AB.resetStats();
	AB.update();

	let run = 0;
	startTime = Date.now();
	console.log(AB.items);
	console.log(AB.trimp);
	console.log(AB.enemy);
	while (run++ < iterations) {
		AB.update();
	}
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
	elements.processedTime.innerHTML = timeSpent + " ms";

	let enemiesKilled = AB.sessionEnemiesKilled;
	elements.enemiesKilled.innerHTML = enemiesKilled;

	let trimpsKilled = AB.sessionTrimpsKilled;
	elements.trimpsKilled.innerHTML =
		trimpsKilled + " [" + prettify(100 * WR) + "%]";
	elements.clearingTime.innerHTML =
		format(
			((toKill / AB.sessionEnemiesKilled) * AB.lootAvg.counter) / 1000
		) + " s";
	elements.dustPs.innerHTML = format(base_dust) + " D/s";

	let fightTime = timeSpent / (enemiesKilled + trimpsKilled);
	elements.averageFightTime.innerHTML = format(fightTime) + " ms";

	fightTime = timeSpent / enemiesKilled;
	elements.averageKillTime.innerHTML = format(fightTime) + " ms";
};

function setup() {
	makeEquipBtns();
	makeOneTimersBtns();
	// Start button
	document
		.getElementById("startButton")
		.addEventListener("click", startSimulation);
	// Levels
	let curr = document.getElementById("currentLevel");
	curr.value = AB.enemyLevel;
	curr.addEventListener("change", (event) => {
		let value = event.target.value;
		let maxLvl = document.getElementById("highestLevel");
		if (maxLvl.value < value) {
			maxLvl.value = value;
		}
	});
	let maxLvl = document.getElementById("highestLevel");
	maxLvl.value = AB.maxEnemyLevel;
}

const prettify = (num) => {
	return num.toLocaleString("en-US", {
		maximumSignificantDigits: 4,
		notation: "compact",
		compactDisplay: "short",
	});
};

function makeEquipBtns() {
	let equipDiv = document.getElementById("equipDiv");
	for (const item in AB.items) {
		if (Object.hasOwnProperty.call(AB.items, item)) {
			let div = document.createElement("div");
			div.className = "equipInpDiv";
			equipDiv.appendChild(div);

			let span = document.createElement("span");
			let name = item.replaceAll("_", " ");
			span.textContent = name;
			div.appendChild(span);

			let input = document.createElement("input");
			input.type = "text";
			input.value = 0;
			input.className = "equipInput";
			input.id = item + "_Input";
			addChangeForEquip(input);
			div.appendChild(input);
		}
	}
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
			span.textContent = name;
			div.appendChild(span);

			let checkBox = document.createElement("input");
			checkBox.type = "checkBox";
			checkBox.className = "oneTimerInput";
			checkBox.id = oneTimer + "_Input";
			div.appendChild(checkBox);
		}
	}
}

function addChangeForEquip(item) {
	item.addEventListener("change", (event) => {
		let value = event.target.value;
		if (isInt(value)) {
			value = Number(value).toString();
			event.target.value = value;
			let name = item.id.replace("_Input", "");
			AB.equip(name);
			AB.items[name].level = value;
			// calcBuildCost();
		} else {
			event.target.value = 0;
		}
	});
}

function isInt(value) {
	return (
		!isNaN(value) &&
		parseInt(Number(value)) == value &&
		!isNaN(parseInt(value, 10))
	);
}

function setActiveItems() {
	clearItems();
	setItems();
}

function clearItems() {
	for (const item in AB.items) {
		if (Object.hasOwnProperty.call(AB.items, item)) {
			AB.items[item].owned = false;
			if (AB.items[item].equipped) AB.equip(item);
			AB.items[item].hidden = false;
			AB.items[item].level = 1;
		}
	}
}

function setItems() {
	let items = document.querySelectorAll("input.equipInput");
	items.forEach((item) => {
		let val = parseInt(item.value);
		if (val > 0) {
			let name = item.id.replace("_Input", "");
			AB.items[name].owned = true;
			AB.items[name].level = val;
			AB.equip(name);
		}
	});
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
		}
	});
}

function calcBuildCost() {
	buildCost = 0;
	for (const item in AB.items) {
		if (Object.hasOwnProperty.call(AB.items, item)) {
			if ((AB.items[item].equipped = true)) {
				let curCost = 5;
				let priceMod = 3;
				if (AB.items[item].priceMod) priceMod = AB.items[item].priceMod;
				let myCost = 0;
				for (let step = 0; step < AB.items[item].level - 1; step++) {
					myCost += curCost;
					curCost *= priceMod;
				}
				buildCost += myCost;
			}
		}
	}
	elements.buildCost.innerHTML = format(buildCost);
}

function setLevels() {
	let curr = document.getElementById("currentLevel");
	AB.enemyLevel = parseInt(curr.value);
	let maxLvl = document.getElementById("highestLevel");
	AB.maxEnemyLevel = parseInt(maxLvl.value);
}
