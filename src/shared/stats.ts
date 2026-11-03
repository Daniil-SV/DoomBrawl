export interface Stats {
	average: number;
	minimum: number;
	maximum: number;
}

export class TickStats {
	private static readonly CAPACITY = 20;

	private values: number[] = [];
	private index = 0;
	private count = 0;
	private sum = 0;

	update(value: number): void {
		if (this.count === TickStats.CAPACITY) {
			this.sum -= this.values[this.index];
		} else {
			this.count++;
		}

		this.values[this.index] = value;
		this.sum += value;

		this.index++;
		if (this.index === TickStats.CAPACITY) {
			this.index = 0;
		}
	}

	getStats(): Stats {
		if (this.count === 0) {
			return {
				average: 0,
				minimum: 0,
				maximum: 0,
			};
		}

		let minimum = this.values[0];
		let maximum = minimum;

		for (let i = 1; i < this.count; i++) {
			const value = this.values[i];

			if (value < minimum) minimum = value;
			if (value > maximum) maximum = value;
		}

		return {
			average: this.sum / this.count,
			minimum,
			maximum,
		};
	}
}
