import { PlayerState } from "../state/player";
import Version from "../version";
import { UIItem } from "../ui/item";
import type { UIButtonCallback } from "../ui/item_system";
import { UIPlayerItem } from "../ui/player_item";
import keyboard from "./keyboard";
import { GlobalLogger, Logger } from "../logger";
import { Parser as MathEvalParser } from "../third_party/expr_eval";

interface State {
	debugEnabled: boolean;
	checkerEnabled: boolean;
	menuPage: number;
	activeButtonCallbacks: LuaTable<number, UIButtonCallback | undefined>;
	buttonsFilter: string;
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
		activeButtonCallbacks: new LuaTable(),
		buttonsFilter: "",
	}));

	private toggle: UIItem;
	private debugMenu: UIPlayerItem;
	private checker: UIPlayerItem;
	private logger = new Logger(UIDebugMenu.name);

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
		this.debugMenu.setCallback("filter_clear", (player) => {
			const filter = this.state.get(player, "buttonsFilter");
			const parser = new MathEvalParser();
			const expr = parser.parse(filter);
			GlobalLogger.warn(`Evaluation result is: ${expr.evaluate()}`);

			this.setSearchHelp(true, player);
			this.updateSearch("", player);
		});

		this.checker = new UIPlayerItem("debug_checker", {
			show: false,
		});

		this.debugMenu.setText("title_txt", "Mod Debug Menu");
		this.debugMenu.setText("version_txt", `v${Version.join(".")}`);

		this.initializeButtons();
		this.initializeButtonCallback();
		this.setSearchHelp(true);

		this.logger.log("Initialized Debug menu", { color: "00FF00" });
	}

	private openSearch(player: number) {
		this.logger.log("Calling debug search", { color: "9D00FF" });

		this.setSearchHelp(false, player);
		const filter = this.state.get(player, "buttonsFilter");
		keyboard.show(
			(player, text, finished) => {
				if (finished) return;

				const suggestions = this.updateSearch(text, player);

				if (text.length === 0) {
					this.setSearchHelp(true, player);
				} else {
					this.setSearchHelp(false, player);
				}

				return { suggestions };
			},
			player,
			{ initialText: filter, maxSymbols: 20 },
		);
	}

	private updateSearch(text: string, player: number): string[] {
		this.state.set(player, "buttonsFilter", text);
		this.debugMenu.setText("filter_input", text, player);
		return this.updateButtonsLayout(player);
	}

	private setSearchHelp(show: boolean, player?: number) {
		this.debugMenu.setText(
			"search_help_txt",
			show ? "click to search..." : "",
			player,
		);
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
							this.logger.log(`Hi from sample button ${index} in debug mode`, {
								color: "00FF00",
							});
							return;
						}

						this.logger.log(`Hi from sample button ${index}`, {
							color: "00FF00",
						});
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
				if (callback !== undefined) callback(player);
			});
		}
	}

	private updateButtonsLayout(player: number): string[] {
		const page = this.state.get(player, "menuPage");
		const buttonsFilter = this.state.get(player, "buttonsFilter");
		const activeButtons = this.registeredButtons.filter((value) => {
			return value.name.includes(buttonsFilter);
		});
		const callbacks = this.state.get(player, "activeButtonCallbacks");

		const showLastPageButton = page > 0;
		const showNextPageButton = activeButtons.length > BUTTONS_COUNT;

		const buttonsOffset = page * BUTTONS_COUNT;
		const buttonsCount = math.min(
			activeButtons.length - buttonsOffset,
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
			const button = activeButtons[i];

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

		return activeButtons.map((value) => {
			return value.name;
		});
	}

	public toggleDebugMenu(player: number) {
		const enabled = this.state.get(player, "debugEnabled");
		if (!enabled) this.updateButtonsLayout(player);

		// Update visibility
		const animation = enabled ? "hide" : "show";
		this.logger.log(
			`Set debug menu state for ${player} to ${animation} at ${server.tick}`,
		);

		this.state.set(player, "debugEnabled", !enabled);
		this.debugMenu.playAnimation(animation, player);
	}

	public toggleScreenChecker(player: number) {
		const enabled = this.state.get(player, "checkerEnabled");
		this.state.set(player, "checkerEnabled", !enabled);

		enabled ? this.checker.destroy(player) : this.checker.create(player);
		this.checker.setVisible(!enabled, player);
	}

	public update() {
		this.toggle.update();
		this.debugMenu.update();
		this.checker?.update();
	}
}
