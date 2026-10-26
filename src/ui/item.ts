import {
	type UIButtonCallback,
	UIItemSystem,
	UIItemInstance,
} from "./item_system";

type UIItemScreenPosition = [number, number] | undefined;

export interface UIItemData {
	texts: Record<string, string>;
	position?: UIPosition;
	animation: LuaSet<string>;
}

export interface UIItemOptions extends Partial<UIItemData> {
	interactive?: boolean;
	show?: boolean;
}

export class UIItemPositionTag {}

export class UIPositionCenter extends UIItemPositionTag {}

export type UIPosition = typeof UIItemPositionTag | UIItemScreenPosition;

export interface UISkin {
	name: string;
}

export class UIItem extends UIItemInstance {
	// private skins: LuaTable<string, UISkin> = new LuaTable();
	// private replacer: Record<string, any> = {};
	// TODO: move

	private state: UIItemData;
	private initialized = false;
	private changed = true;

	constructor(
		private name: string,
		private options: UIItemOptions = {},
		context: UIItemSystem = new UIItemSystem(options.interactive ?? false),
	) {
		super(context);

		this.state = {
			...options,
			texts: { ...options.texts },
			position: options.position,
			animation: new LuaSet(),
		};

		if (options.animation !== undefined) {
			for (const value of options.animation) {
				this.state.animation.add(value);
			}
		}

		if (options.show === false) {
			this.changed = false;
		}

		if (DEBUG) {
			log(`Created UIItem with id ${this.id} and name ${name}`);
		}
	}

	private setDirty() {
		this.changed = true;
	}

	private serialize() {
		const data: any = {
			...this.context.serialize(),
		};

		if (!this.initialized) {
			data.tomlId = this.name;
			this.initialized = true;
		}

		// Item position
		if (this.options.position !== undefined) {
			if (typeof this.options.position === "object") {
				[data.x, data.y] = this.options.position;
			} else if (this.options.position === UIPositionCenter) {
				data.center_to_screen = true;
			}
		}

		// Skins
		// if (!this.skins.isEmpty()) {
		// 	data.skins = this.skins;
		// }

		// Text bindings
		{
			const texts: any[] = [];
			for (const [binding, text] of Object.entries(this.state.texts)) {
				texts.push({ binding, text });
			}

			if (texts.length > 0) data.texts = texts;
		}

		// Replacements
		//{
		//	const replace: any[] = [];
		//	for (const [binding, value] of Object.entries(this.replacer)) {
		//		replace.push({
		//			binding,
		//			...value,
		//		});
		//	}
		//
		//	if (replace.length !== 0) data.replace = replace;
		//}

		return data;
	}

	public update(deferred: boolean = true, player?: number) {
		if (!this.changed) return;

		const data = this.serialize();

		// Multi target handle
		if (player !== undefined) data.target_index = player;

		// Animation handle
		const animations = [];
		for (const animation of this.state.animation) {
			animations.push(animation);
		}

		if (animations.length > 0) {
			for (const animation of animations) {
				data.animation = animation;
				this.context.update(data, deferred);
			}
		} else {
			this.context.update(data, deferred);
		}

		this.state.animation = new LuaSet();
		this.changed = false;
	}

	destroy(player?: number) {
		if (player !== undefined) {
			this.context.destroy({
				target_index: player,
			});
			return;
		}

		this.context.destroy();
	}

	// setSkin(binding: string, skin: UISkin) {
	// 	this.skins.set(binding, skin);
	// 	this.setDirty();
	// }

	setText(binding: string, text: string) {
		if (this.state.texts[binding] === text) return;

		this.state.texts[binding] = text;
		this.setDirty();
	}

	setCallback(binding: string, callback: UIButtonCallback) {
		this.context.setCallback(binding, callback);
	}

	set position(value: UIPosition | undefined) {
		if (this.state.position === value) return;

		this.options.position = value;
		this.setDirty();
	}

	set visible(value: boolean) {
		this.changed = value;
	}

	get position(): UIPosition {
		return this.options.position;
	}

	playAnimation(value: string | string[]) {
		let updated = false;
		if (Array.isArray(value)) {
			for (const animation of value) {
				if (!updated) {
					updated = !this.state.animation.has(animation);
				}

				this.state.animation.add(animation);
			}
		} else {
			updated = !this.state.animation.has(value);
			this.state.animation.add(value);
		}

		// log(`playAnimation: ${value} - ${updated}`);
		if (updated) this.setDirty();
	}
}
