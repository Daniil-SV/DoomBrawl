import { PlayerState } from "../state/player";
import Version from "../version";
import { UIItem } from "../ui/item";
import type { UIButtonCallback } from "../ui/item_system";
import { UIPlayerItem } from "../ui/player_item";
import keyboard from "./keyboard";

interface State {
	debugEnabled: boolean;
	checkerEnabled: boolean;
	menuPage: number;
	activeButtons: DebugButton[];
	activeButtonCallbacks: LuaTable<number, UIButtonCallback | undefined>;
}

const BUTTONS_COUNT = 10;

interface DebugButton {
	name: string;
	callback: UIButtonCallback;
}

export class UIDebugMenu {
	private state: PlayerState<State> = new PlayerState(() => ({
		debugEnabled: false,
		checkerEnabled: false,
		menuPage: 0,
		activeButtons: [],
		activeButtonCallbacks: new LuaTable(),
	}));

	private toggle: UIItem;
	private debugMenu: UIPlayerItem;
	private checker: UIPlayerItem;

	private registeredButtons: DebugButton[] = [];

	constructor() {
		this.toggle = new UIItem("debug_toggle", {
			interactive: true,
			position: [50, 350],
		});
		this.toggle.setCallback("self", (player) => {
			this.toggleDebugMenu(player);
		});

		this.debugMenu = new UIPlayerItem("debug_menu", {
			interactive: true,
		});
		this.debugMenu.setCallback("close_button", (player) => {
			this.toggleDebugMenu(player);
		});
		this.debugMenu.setCallback("open_search", (player) => {
			this.openSearch(player);
		});

		this.checker = new UIPlayerItem("debug_checker", {
			show: false,
		});

		this.debugMenu.setText("title_txt", "Mod Debug Menu");
		this.debugMenu.setText("version_txt", `v${Version.join(".")}`);

		this.initializeButtons();
		this.initializeButtonCallback();
		this.setSearchClue("click to search...");

		log("Initialized Debug menu");
	}

	private openSearch(player: number) {
		log("Calling debug search")
		
		keyboard.show((player, text, finished) => {
			this.updateSearch(text, finished, player);

			if (finished) this.closeSearch(player);
		}, player);
	}

	private updateSearch(text: string, finished: boolean, player: number) {}

	private closeSearch(player: number) {
		this.setSearchClue("click to search...");
	}

	private setSearchClue(text: string) {
		this.debugMenu.setText("search_help_txt", text);
	}

	private createButton(button: DebugButton) {
		this.registeredButtons.push(button);
	}

	private initializeButtons() {
		this.createButton({
			name: "Create button",
			callback: (player) => {
				const index = this.registeredButtons.length;
				this.createButton({
					name: `Sample button ${index}`,
					callback: () => {
						if (DEBUG) {
							log(`Hi from sample button ${index} in debug mode`);
							return;
						}

						log(`Hi from sample button ${index}`);
					},
				});
				this.updateButtonsLayout(player);
			},
		});

		this.createButton({
			name: "Screen checker",
			callback: (player) => {
				this.toggleScreenChecker(player);
			},
		});
	}

	private initializeButtonCallback() {
		for (let i = 0; BUTTONS_COUNT > i; i++) {
			// Lua moment, should save index to variable so each callback scope got it's own index
			const index = i;
			this.debugMenu.setCallback(`button_${index + 1}`, (player) => {
				const callbacks = this.state.get(player, "activeButtonCallbacks");

				const callback = callbacks.get(index);
				// log(
				// 	`Getting callback for ${callbacks} with ${index} and got ${callback}`,
				// );
				if (callback !== undefined) callback(player);
			});
		}
	}

	private updateButtonsLayout(player: number) {
		const page = this.state.get(player, "menuPage");
		const activeButtons = this.state.get(player, "activeButtons");
		const callbacks = this.state.get(player, "activeButtonCallbacks");

		const showLastPageButton = page > 0;
		const showNextPageButton = activeButtons.length > BUTTONS_COUNT;

		const buttonsOffset = page * BUTTONS_COUNT;
		const buttonsCount = math.min(
			this.registeredButtons.length - buttonsOffset,
			BUTTONS_COUNT,
		);

		this.debugMenu.playAnimation(`button_${buttonsCount}`, player);

		for (let i = 0; BUTTONS_COUNT > i; i++) {
			callbacks.set(i, undefined);
		}

		// Update buttons text
		for (
			let i = buttonsOffset, t = 0;
			buttonsOffset + buttonsCount > i;
			i++, t++
		) {
			const button = this.registeredButtons[i];

			// log(`Setting callback for ${callbacks} with ${i}`);
			callbacks.set(t, button.callback);
			this.debugMenu.setText(`button_${t + 1}_txt`, button.name, player);
		}

		// Replace all buttons to placeholders
		//for (let i = 0; BUTTONS_COUNT > i; i++) {
		//	this.debugMenu.replace(`button_${i + 1}`, {
		//		sc_file_source: "ClientFile",
		//		sc_file: "sc/ui.sc",
		//		export_name: "icon_modifier_48",
		//	});
		//}
	}

	public toggleDebugMenu(player: number) {
		const enabled = this.state.get(player, "debugEnabled");

		// Update layout first
		// Events may have some delays, so user accidentally may see unfinished buttons animation
		// Update only when menu is about to show on user screen
		if (!enabled) {
			this.updateButtonsLayout(player);
			//this.update();
		}

		// Update visibility
		const animation = enabled ? "hide" : "show";
		if (DEBUG)
			log(
				`Set debug menu state for ${player} to ${animation} at ${server.tick}`,
			);

		this.state.set(player, "debugEnabled", !enabled);
		this.debugMenu.playAnimation(animation, player);

		// Flush update for main animation
		//this.update();
	}

	public toggleScreenChecker(player: number) {
		const enabled = this.state.get(player, "checkerEnabled");
		this.state.set(player, "checkerEnabled", !enabled);

		enabled ? this.checker.destroy(player) : this.checker.create(player);
		this.checker.setVisible(!enabled, player);
	}

	public update() {
		// Show toggle for everyone
		this.toggle.update();

		this.debugMenu.update();
		this.checker?.update();
	}
}
