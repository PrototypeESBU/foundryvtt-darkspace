// a function that registers all the settings used by the module
export default function registerSettings() {
    //Settings not shown in the menu
    game.settings.register("darkspace", "lastVersion", {
		name: "darkspace.lastVersion",
		default: "",
		type: String,
	});

}