export let build = {
    // Initialise the build storage.
    items: {},
    oneTimers: {},
    ring: {
        level: 0,
        mods: [],
        dust_multiplier: 0,
    },

    // Methods to interact with the build.
    loadFromSave(data) {
        this.items = data.items;
        console.log(build);
        console.log(data);
    },

    loadFromImport(data) {},

    exportToBuildObject() {},

    loadFromSheet(data) {
        const itemLevels = data.split("\t");
        itemLevels.splice(0, 2);
        const autorunButton = document.querySelector("#autoRun");
        const wasAutorun = autorunButton.className === "checkedButton";
        if (wasAutorun) {
            autorunButton.click();
        }

        const equipInpDivs = document.querySelectorAll("div.equipInpDiv");
        for (let i = 0; i < equipInpDivs.length; i++) {
            const equipDiv = equipInpDivs[i];
            const [equipButton, equipInput] = equipDiv.childNodes;
            if (itemLevels[i]) {
                if (!/^\d+$/.test(itemLevels[i])) {
                    console.log(`time to bail at ${i} from '${itemLevels[i]}'`);
                    break;
                }

                if (equipButton.className === "uncheckedButton") {
                    equipButton.click();
                }
                equipInput.value = itemLevels[i];
                equipInput.dispatchEvent(new Event("change"));
            } else {
                if (equipButton.className === "checkedButton") {
                    equipButton.click();
                }
            }
        }

        document.querySelector("#startButton").click();
        if (wasAutorun) {
            autorunButton.click();
        }
    },
};
