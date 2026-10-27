import { logTable } from "../debug";
import Events from "../event_manager";
import { GlobalLogger, Logger } from "../logger";

export type UIButtonCallback = (player: number) => void;

/** Interface class for buttons implementations */
export class UIItemInstance {
	constructor(protected context: UIItemSystem) {}

	private changed = false;

	get id() {
		return this.context.id;
	}

	protected makeDirty() {
		this.changed = true;
	}

	get dirty() {
		return this.context.changed || this.changed;
	}

	update() {
		this.changed = false;
	}
}

/** Object with registered buttons callback where key is generated client input value and value is callback */
type UIButtonCallbackData = LuaTable<number, UIButtonCallback>;

/** Shared context for all buttons instances */
export class UIItemSystem {
	static Components: LuaTable<number, UIItemSystem> = new LuaTable();

	/** Global map with per button callback data where key is button id and value is callback data */
	private static Buttons: LuaMap<number, UIButtonCallbackData> = new LuaMap();

	private static idCounter = 1;
	private static buttonIdCounter = 1;

	readonly id = this.createId();

	/** Map object with listeners registered by object */
	private buttonListeners: LuaTable<string, any> = new LuaTable();

	changed = false;

	private logger = new Logger(UIItemSystem.name);

	constructor(private interactive: boolean) {
		if (interactive) UIItemSystem.Buttons.set(this.id, new LuaTable());
		UIItemSystem.Components.set(this.id, this);

		if (DEBUG) {
			this.logger.trace(`Created object with id ${this.id}`);
		}
	}

	private createId() {
		return UIItemSystem.idCounter++;
	}

	private createButtonId() {
		return UIItemSystem.buttonIdCounter++;
	}

	private debugLog(data: any) {
		log("--------------------------");
		logTable(data);
		log("--------------------------");
	}

	protected makeDirty() {
		this.changed = true;
	}

	public update(data: any, deferred: boolean = true) {
		if (DEBUG) {
			this.logger.trace(
				`Updating id ${this.id} at tick ${server.tick}`,
			);
			// this.debugLog(data);
		}

		Events.send("updateUIItem", data, deferred);
	}

	public destroy(data: any = {}) {
		UIItemSystem.Components.delete(this.id);
		if (this.interactive) {
			UIItemSystem.Buttons.delete(this.id);
		}

		Events.send("removeUIItem", {
			id: this.id,
			...data,
		});
	}

	public serialize(): any {
		const data: any = {
			id: this.id,
		};

		// Buttons
		if (!this.buttonListeners.isEmpty()) {
			const buttonListeners = [];
			for (const [_, listener] of this.buttonListeners) {
				buttonListeners.push(listener);
			}

			data.buttons = buttonListeners;
		}

		return data;
	}

	public setCallback(binding: string, callback: UIButtonCallback) {
		if (!this.interactive) {
			this.logger.error(
				`Trying to set ${binding} button for non-interactive UIItem with id ${this.id}`,
			);
		}

		const existingCallback = this.buttonListeners.get(binding);
		if (existingCallback === callback) {
			// Trying to register the same callback, exit
			return;
		}

		const mapping = UIItemSystem.Buttons.get(this.id);
		if (mapping === undefined) return;

		const id = this.createButtonId();
		this.buttonListeners.set(binding, {
			binding,
			client_input_value: id,
		});
		mapping.set(id, callback);

		this.makeDirty();
	}

	public static updateInput(
		this: void,
		player: number,
		id: number,
		input: number,
	) {
		if (DEBUG) {
			GlobalLogger.trace(
				`Got input from ${player} with id ${id} and value ${input} at tick ${server.tick}`,
			);
		}

		const mapping = UIItemSystem.Buttons.get(id);

		if (mapping === undefined) {
			error(`Handler for button ${id} not found`);
		}

		const callback = mapping.get(input);

		if (callback === undefined) {
			error(`Handler for input ${input} not found`);
		}

		callback(player);
	}
}
