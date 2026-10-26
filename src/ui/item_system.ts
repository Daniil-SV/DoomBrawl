import { logTable } from "../debug";

export type UIButtonCallback = (player: number) => void;

export class UIItemInstance {
	constructor(protected context: UIItemSystem) {}

	get id() {
		return this.context.id;
	}
}

enum UIEvents {
	Remove = "removeUIItem",
	Update = "updateUIItem",
}

const MAX_DEFERRED_EVENTS = 300;

export class UIItemSystem {
	static Components: LuaTable<number, UIItemSystem> = new LuaTable();
	private static DeferredEvents: EventTask[] = [];

	private static Buttons: LuaMap<number, LuaMap<number, UIButtonCallback>> =
		new LuaMap();

	private static idCounter = 1;
	private static buttonIdCounter = 1;

	readonly id = this.createId();
	private buttonListeners: LuaTable<number> = new LuaTable();

	constructor(private interactive: boolean) {
		if (interactive) UIItemSystem.Buttons.set(this.id, new LuaMap());
		UIItemSystem.Components.set(this.id, this);
	}

	private createId() {
		return UIItemSystem.idCounter++;
	}

	private createButtonId() {
		return UIItemSystem.buttonIdCounter++;
	}

	private sendEvent(type: UIEvents, data: any, deferred: boolean = true) {
		if (deferred) {
			UIItemSystem.DeferredEvents.push({
				action: type,
				...data,
			});
			return;
		}

		event(type, data);
	}

	private debugLog(data: any) {
		log("--------------------------");
		logTable(data);
		log("--------------------------");
	}

	public update(data: any, deferred: boolean = true) {
		if (DEBUG) {
			log(`Updating UIItem with ID ${this.id} at tick ${server.tick}`);
			this.debugLog(data);
		}

		this.sendEvent(UIEvents.Update, data, deferred);
	}

	public destroy(data: any = {}) {
		UIItemSystem.Components.delete(this.id);

		this.sendEvent(
			UIEvents.Remove,
			{
				id: this.id,
				...data,
			},
			false,
		);
	}

	public serialize(): any {
		const data: any = {
			id: this.id,
		};

		// Buttons
		if (!this.buttonListeners.isEmpty()) {
			data.buttons = this.buttonListeners;
		}

		return data;
	}

	public setCallback(binding: string, callback: UIButtonCallback) {
		if (!this.interactive) {
			error("Trying to set button for non-interactive UIItem");
		}

		const index = this.buttonListeners.length() + 1;
		const id = this.createButtonId();

		this.buttonListeners.set(index, {
			binding,
			client_input_value: id,
		});

		const mapping = UIItemSystem.Buttons.get(this.id);
		if (mapping !== undefined) {
			mapping.set(id, callback);
		}
	}

	public static updateInput(
		this: void,
		player: number,
		id: number,
		input: number,
	) {
		if (DEBUG) {
			log(
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

	public static pollEvents() {
		if (DEBUG && UIItemSystem.DeferredEvents.length !== 0)
			log(`Sending ${UIItemSystem.DeferredEvents.length} deferred UI events`);

		for (
			let i = 0;
			i < UIItemSystem.DeferredEvents.length;
			i += MAX_DEFERRED_EVENTS
		) {
			event("scheduleTasks", {
				tasks: UIItemSystem.DeferredEvents.slice(i, i + MAX_DEFERRED_EVENTS),
			});
		}

		UIItemSystem.DeferredEvents = [];
	}
}
