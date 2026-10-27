import { PlayerState } from "../state/player";
import { UIItem } from "../ui/item";
import { UIPlayerItem } from "../ui/player_item";

type UIKeyboardCallback = (
	player: number,
	text: string,
	finished: boolean,
) => void;

enum Layouts {
	Qwerty = "qwerty",
}

interface KeyboardLanguage {
	code: string;
	keys: string[];
	layout: Layouts;
}

export const KeyboardLangs: Record<string, KeyboardLanguage> = {
	English: {
		code: "En",
		layout: Layouts.Qwerty,
		keys: [
			"q",
			"w",
			"e",
			"r",
			"t",
			"y",
			"u",
			"i",
			"o",
			"p",
			"a",
			"s",
			"d",
			"f",
			"g",
			"h",
			"j",
			"k",
			"l",
			"z",
			"x",
			"c",
			"v",
			"b",
			"n",
			"m",
			",",
			".",
		],
	},
};

interface KeyboardState {
	callback?: UIKeyboardCallback;
	uppercase: boolean;
	item?: UIItem;
	language: KeyboardLanguage;
}

class UIKeyboard {
	private state: PlayerState<KeyboardState> = new PlayerState(() => ({
		callback: undefined,
		uppercase: false,
		language: KeyboardLangs.English,

		// Lazy initialization
		item: undefined,
	}));

	private getPlayerKeyboard(player: number) {
		let keyboard = this.state.get(player, "item");
		if (keyboard === undefined) {
			keyboard = new UIItem("ui_keyboard", { interactive: true });
			this.state.set(player, "item", keyboard);
		}

		return keyboard;
	}

	private initializeLayout() {}

	private toggleNumeric() {}

	private toggleCase(player: number) {
		const uppercase = this.state.get(player, "uppercase");
		this.state.set(player, "uppercase", !uppercase);
		this.updateLetters(player);
	}

	private updateLetters(player: number) {
		const uppercase = this.state.get(player, "uppercase");
		const keyboard = this.getPlayerKeyboard(player);
		const lang = this.state.get(player, "language");

		for (let i = 0; lang.keys.length > i; i++) {
			const binding = `k${i + 1}_txt`;
			let letter = lang.keys[i];
			if (uppercase) letter = letter.toUpperCase();

			keyboard.setText(binding, letter);
		}
	}

	private updateSpecial(player: number) {
		const keyboard = this.getPlayerKeyboard(player);

		keyboard.setText("shift_txt", "⇧");
		keyboard.setCallback("shift", (player) => {
			this.toggleCase(player);
		});

		// to do "numeric"
	}

	private updateLanguage(player: number, lang?: KeyboardLanguage) {
		const keyboard = this.getPlayerKeyboard(player);
		if (lang !== undefined) {
			this.state.set(player, "language", lang);
		} else {
			lang = this.state.get(player, "language");
		}

		// Setting layout
		keyboard.playAnimation(`layout_${lang.layout}`);

		// Setting buttons callbacks and text
		this.updateLetters(player);
	}

	show(callback: UIKeyboardCallback, player: number) {
		const keyboard = this.getPlayerKeyboard(player);

		this.state.set(player, "callback", callback);
		keyboard.playAnimation("show");
		this.updateLanguage(player);
		this.updateSpecial(player);
	}

	update() {
		for (const [player, state] of this.state) {
			state.item?.update(true, player);
		}
	}
}

const keyboard = new UIKeyboard();
export default keyboard;
