import { UIAnalytic } from "../components/analytic";
import { UIBottomBar } from "../components/bottom";
import { UIDebugMenu } from "../components/debug";
import keyboard from "../components/keyboard";
import { UIItemSystem } from "./item_system";

export class UISystem {
	debug?: UIDebugMenu;
	analytic = new UIAnalytic();
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
		this.analytic.update();
	}
}
