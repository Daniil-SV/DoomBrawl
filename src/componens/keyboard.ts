import { GlobalLogger } from "../logger";
import { PlayerState } from "../state/player";
import { UIItem } from "../ui/item";

interface UIKeyboardCallbackData {
	suggestions: string[];
}

type UIKeyboardCallback = (
	player: number,
	text: string,
	finished: boolean,
) => UIKeyboardCallbackData | undefined;

enum Layouts {
	Qwerty = "qwerty",
	Numeric = "numeric",
	Symbols = "symbols",
	Numpad = "numpad",
}

enum TextUpdate {
	Add,
	Set,
	Clear,
}

interface KeyboardKeySet {
	code: string;
	useCode?: boolean;
	keys: string[];
	layout: Layouts;
}

export interface UIKeyboardOptions {
	initialText: string;
	maxSymbols: number;
}

export const KeyboardPages = {
	Numeric: {
		code: "numeric",
		layout: Layouts.Numeric,
		keys: [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"0",
			"@",
			"#",
			"$",
			"_",
			"&",
			"-",
			"+",
			"(",
			")",
			"/",
			"*",
			'"',
			"'",
			":",
			";",
			"!",
			"?",
			",",
			".",
		],
	},
	Symbols: {
		code: "symbols",
		layout: Layouts.Symbols,
		keys: [
			"~",
			"`",
			"|",
			"•",
			"√",
			"π",
			"÷",
			"×",
			"§",
			"Δ",
			"£",
			"€",
			"$",
			"¢",
			"^",
			"°",
			"=",
			"{",
			"}",
			"\\",
			"%",
			"©",
			"®",
			"™",
			"✓",
			"[",
			"]",
			"<",
			">",
		],
	},
	Numpad: {
		code: "numpad",
		useCode: true,
		layout: Layouts.Numpad,
		keys: [
			"1",
			"2",
			"3",
			"4",
			"5",
			"6",
			"7",
			"8",
			"9",
			"0",
			",",
			"=",
			".",
			"%",
			"+",
			"-",
			"*",
			"/",
		],
	},
} satisfies Record<string, KeyboardKeySet>;

export const KeyboardLangs = {
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
} satisfies Record<string, KeyboardKeySet>;

interface KeyboardState {
	callback?: UIKeyboardCallback;
	uppercase: boolean;
	item?: UIItem;
	language: KeyboardKeySet;
	options: Partial<UIKeyboardOptions>;
	text: string;

	// Tick when shift was clicked last time
	// Used to detect shift lock
	shiftLastTick: number;

	capsLockActivated: boolean;
}

class UIKeyboard {
	private state: PlayerState<KeyboardState> = new PlayerState(() => ({
		callback: undefined,
		uppercase: false,
		language: KeyboardLangs.English,
		shiftLastTick: 0,
		capsLockActivated: false,
		options: {},
		text: "",

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

	private setLayout(player: number, layout: Layouts) {
		const keyboard = this.getPlayerKeyboard(player);
		keyboard.playAnimation(`layout_${layout}`);
	}

	private resetPage(player: number) {
		const lang = this.state.get(player, "language");
		this.updateLetters(player, lang);
		this.setLayout(player, lang.layout);
	}

	private setPage(player: number, page: keyof typeof KeyboardPages) {
		const pageLayout = KeyboardPages[page];
		this.updateLetters(player, pageLayout);
		this.setLayout(player, pageLayout.layout);
	}

	private toggleCase(player: number) {
		const keyboard = this.getPlayerKeyboard(player);
		const uppercase = this.state.get(player, "uppercase");
		const lang = this.state.get(player, "language");
		const lastTick = this.state.get(player, "shiftLastTick");

		// Check if user double clicked shift in last 0.5ms
		if (uppercase && server.tick - lastTick <= 10) {
			keyboard.setText("shift_txt", "⇪");
			this.state.set(player, "capsLockActivated", true);
		} else {
			keyboard.setText("shift_txt", uppercase ? "⇧" : "⬆");
			this.state.set(player, "uppercase", !uppercase);
			this.state.set(player, "capsLockActivated", false);
			this.updateLetters(player, lang);
		}

		this.state.set(player, "shiftLastTick", server.tick);
	}

	private updateLetters(player: number, lang: KeyboardKeySet) {
		const uppercase = this.state.get(player, "uppercase");
		const keyboard = this.getPlayerKeyboard(player);

		for (let i = 0; lang.keys.length > i; i++) {
			const baseBinding = lang.useCode ? lang.code : "k";
			const binding = `${baseBinding}${i + 1}`;
			let letter = lang.keys[i];
			if (uppercase) letter = letter.toUpperCase();

			keyboard.setText(`${binding}_txt`, letter);
			keyboard.setCallback(binding, (player) => {
				this.updateText(player, TextUpdate.Add, letter);
			});
		}
	}

	private updateSpecial(player: number) {
		const keyboard = this.getPlayerKeyboard(player);

		// Case toggle
		keyboard.setText("shift_txt", "⇧");
		keyboard.setCallback("shift", (player) => {
			this.toggleCase(player);
		});

		// Enter button
		keyboard.setText("enter_txt", "↵");
		keyboard.setCallback("enter", (player) => {
			this.close(player);
		});

		// Clear button
		keyboard.setText("clear_txt", "⌫");
		keyboard.setCallback("clear", (player) => {
			this.updateText(player, TextUpdate.Clear);
		});

		// Numeric button
		keyboard.setText("numeric_txt", "123");
		keyboard.setCallback("numeric", (player) => {
			this.setPage(player, "Numeric");
		});

		// Numpad button
		keyboard.setText("numpad_txt", "¼");
		keyboard.setCallback("numpad", (player) => {
			this.setPage(player, "Numpad");
		});

		// Alphabetic button
		keyboard.setText("alphabetic_txt", "ABC");
		keyboard.setCallback("alphabetic", (player) => {
			this.resetPage(player);
		});

		// Symbols button
		keyboard.setText("symbols_txt", "=/<");
		keyboard.setCallback("symbols", (player) => {
			this.setPage(player, "Symbols");
		});

		// Space button
		keyboard.setText("space_txt", "␣");
		keyboard.setCallback("space", (player) => {
			this.updateText(player, TextUpdate.Add, " ");
		});

		// Global close area
		keyboard.setCallback("close", (player) => {
			this.close(player);
		});

		// TODO emoji layout?
		keyboard.setText("emoji_txt", "☺");
	}

	private updateLanguage(player: number, lang?: KeyboardKeySet) {
		if (lang !== undefined) {
			this.state.set(player, "language", lang);
		} else {
			lang = this.state.get(player, "language");
		}

		// Setting buttons callbacks and text
		this.updateLetters(player, lang);

		// Setting layout
		this.setLayout(player, lang.layout);
	}

	private updateSuggestions(player: number, suggests: string[]) {
		const keyboard = this.getPlayerKeyboard(player);
		const text = this.state.get(player, "text");

		// Stripping to 3 choices
		suggests = suggests
			.filter((value) => {
				return value !== text;
			})
			.slice(0, math.min(suggests.length, 3));

		keyboard.playAnimation(`suggest_${suggests.length}`);
		for (let i = 0; suggests.length > i; i++) {
			const suggestName = suggests[i];
			keyboard.setText(`suggest_${i + 1}_txt`, suggestName);
			keyboard.setCallback(`suggest_${i + 1}`, (player) => {
				this.updateText(player, TextUpdate.Set, suggestName);
			});
		}
	}

	private processCallbackData(player: number, data: UIKeyboardCallbackData) {
		this.updateSuggestions(player, data.suggestions);
	}

	private updateText(
		player: number,
		type: TextUpdate.Add,
		content: string,
	): void;

	private updateText(
		player: number,
		type: TextUpdate.Set,
		content: string,
	): void;

	private updateText(player: number, type: TextUpdate.Clear): void;

	private updateText(player: number, type: TextUpdate, content?: string): void {
		const callback = this.state.get(player, "callback");

		if (callback === undefined) {
			GlobalLogger.error(
				"Failed to update keyboard text since callback is null",
			);
			return;
		}

		const options = this.state.get(player, "options");
		const text = this.state.get(player, "text");
		let updatedText = text;

		switch (type) {
			case TextUpdate.Add:
				if (content === undefined) break;

				updatedText += content;
				break;

			case TextUpdate.Set:
				if (content === undefined) break;

				updatedText = content;
				break;

			case TextUpdate.Clear:
				if (text.length > 0) updatedText = text.slice(0, -1);
				break;
		}

		if (options.maxSymbols !== undefined) {
			const byteOffset = utf8.offset(updatedText, options.maxSymbols + 1);

			if (byteOffset !== undefined) {
				updatedText = string.sub(updatedText, 1, byteOffset - 1);
			}
		}

		const capsLock = this.state.get(player, "capsLockActivated");
		const uppercase = this.state.get(player, "uppercase");
		if (!capsLock && uppercase) {
			this.toggleCase(player);
		}

		if (text !== updatedText) {
			this.state.set(player, "text", updatedText);
			const data = callback(player, updatedText, false);
			if (data !== undefined) this.processCallbackData(player, data);
		}
	}

	close(player: number) {
		const callback = this.state.get(player, "callback");
		if (callback === undefined) {
			GlobalLogger.error("Failed to close keyboard since callback is null");
			return;
		}

		const keyboard = this.getPlayerKeyboard(player);
		const text = this.state.get(player, "text");

		keyboard.playAnimation("hide");
		callback(player, text, true);
	}

	show(
		callback: UIKeyboardCallback,
		player: number,
		options?: Partial<UIKeyboardOptions>,
	) {
		const keyboard = this.getPlayerKeyboard(player);

		this.state.set(player, "callback", callback);
		this.state.set(player, "text", options?.initialText ?? "");
		if (options !== undefined) this.state.set(player, "options", options);

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
