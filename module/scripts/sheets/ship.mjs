export default class ShipSheet extends shadowdark.sheets.PlayerSheetSD {

    	/** @inheritdoc */
	static get defaultOptions() {
		return foundry.utils.mergeObject(super.defaultOptions, {
			scrollY: ["section.SD-content-body"],
			width: 1000,
			height: 585,
			tabs: [
                {
					navSelector: ".SD-nav",
					contentSelector: ".SD-content-body",
					initial: "tab-gear",
				}
			],
		});
	}

    
	/** @inheritdoc */
	get template() {
		return "modules/darkspace/templates/actors/ship.hbs";
	}

   	/** @override */
	async getData(options) {
        const context = await super.getData(options);
        console.warn(context);
        return context;
    }
}