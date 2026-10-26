import { PlayerState } from "../state/player";
import { UIItem, type UIItemOptions } from "./item";
import {
	UIItemSystem,
	UIItemInstance,
	type UIButtonCallback,
} from "./item_system";

interface UIPlayerItemState {
	playerItem?: UIItem;
}

type PlayerItemAction = (item: UIItem, player: number) => void;

export class UIPlayerItem extends UIItemInstance {
	private readonly state: PlayerState<UIPlayerItemState>;

	constructor(
		private readonly name: string,
		private readonly options: UIItemOptions = {},
		context: UIItemSystem = new UIItemSystem(options.interactive ?? false),
	) {
		super(context);

		this.state = new PlayerState<UIPlayerItemState>(() => ({
			playerItem:
				options.show === false
					? undefined
					: new UIItem(this.name, this.options, this.context),
		}));

		if (options.show === false) {
			this.destroy();
		}
	}

	private forEachPlayer(action: PlayerItemAction): void {
		for (const [id, character] of server.objectManager.getCharacters()) {
			if (character.isBot) continue;

			const player = id - 1;
			const item = this.getPlayerItem(player);

			if (item === undefined) continue;

			action(item, player);
		}
	}

	private forPlayers(action: PlayerItemAction, player?: number): void {
		if (player !== undefined) {
			const item = this.getPlayerItem(player);

			if (item !== undefined) {
				action(item, player);
			}

			return;
		}

		this.forEachPlayer(action);
	}

	private getPlayerItem(player: number): UIItem | undefined {
		return this.state.get(player, "playerItem");
	}

	private setPlayerItem(player: number, item: UIItem | undefined): void {
		this.state.set(player, "playerItem", item);
	}

	setCallback(binding: string, callback: UIButtonCallback): void {
		this.context.setCallback(binding, callback);
	}

	setText(binding: string, text: string, player?: number): void {
		this.forPlayers((item) => {
			item.setText(binding, text);
		}, player);
	}

	playAnimation(value: string | string[], player?: number): void {
		this.forPlayers((item) => {
			item.playAnimation(value);
		}, player);
	}

	setVisible(value: boolean, player?: number): void {
		this.forPlayers((item) => {
			item.visible = value;
		}, player);
	}

	update(deferred: boolean = true): void {
		this.forPlayers((item, player) => {
			item.update(deferred, player);
		});
	}

	create(player?: number): void {
		const createForPlayer = (id: number): void => {
			if (this.getPlayerItem(id) !== undefined) return;

			this.setPlayerItem(id, new UIItem(this.name, this.options, this.context));
		};

		if (player !== undefined) {
			createForPlayer(player);
			return;
		}

		for (const [id, character] of server.objectManager.getCharacters()) {
			if (character.isBot) continue;

			createForPlayer(id - 1);
		}
	}

	destroy(player?: number): void {
		const destroyForPlayer: PlayerItemAction = (item, id) => {
			item.destroy(id);
			this.setPlayerItem(id, undefined);
		};

		this.forPlayers(destroyForPlayer, player);
	}
}
