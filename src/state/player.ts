export class PlayerState<T extends object> {
	private players = new Map<number, T>();

	constructor(private readonly factory: () => T) {}

	private getState(playerId: number): T {
		let result = this.players.get(playerId);
		if (result === undefined) {
			result = this.factory();
			this.players.set(playerId, result);
		}

		return result;
	}

	get<K extends keyof T>(playerId: number, key: K): T[K] {
		return this.getState(playerId)[key];
	}

	set<K extends keyof T>(playerId: number, key: K, value: T[K]): void {
		const state = this.getState(playerId);
		state[key] = value;
	}

	clear() {
		this.players.clear();
	}

	delete(player: number) {
		this.players.delete(player);
	}

	*[Symbol.iterator](): IterableIterator<[key: number, value: T]> {
		yield* this.players.entries();
	}
}
