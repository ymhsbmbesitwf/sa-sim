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
};
