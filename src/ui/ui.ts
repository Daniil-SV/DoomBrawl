import { UIBottomBar } from "../componens/bottom";
import { UIDebugMenu } from "../componens/debug";
import keyboard from "../componens/keyboard";
import { UIItemSystem } from "./item_system";

export class UISystem {
	debug?: UIDebugMenu;
	bottom = new UIBottomBar();

	constructor() {
		// Initializing items
		if (DEBUG) this.debug = new UIDebugMenu();

		// Initializing UIItem
		const listener = createCallback("InputListener", UIItemSystem.updateInput);
		server.customInputListeners.add(listener);
	}

	public update() {
		if (DEBUG) {
			this.debug?.update();
		}

		this.bottom.update();
		keyboard.update();
	}
}
