import { TickStats } from "../shared/stats";
import { UIItem } from "../ui/item";

export class UIAnalytic {
	private screen = new UIItem("debug_analytic");
	private time = 0;

	private tickTime = new TickStats();
	public currentTickTime: number = 0;

	constructor() {
		this.screen.setText("title", "Analytic");
		this.screen.setText("time", "time:");
		this.screen.setText("tick", "CPU time:");
	}

	setTimeStat(target: string, stat: TickStats, current: number) {
		stat.update(current);

		const { average, minimum, maximum } = stat.getStats();
		const formatted = string.format(
			"%.2fms %.2fms avg %.2fms min %.2fms max",
			current,
			average,
			minimum,
			maximum,
		);

		this.screen.setText(target, formatted);
	}

	updateStat() {
		if (server.tick % 20 === 0) {
			this.screen.setText("time_value", `${this.time}s`);
			this.time += 1;
		}

		if (this.currentTickTime !== 0) {
			this.setTimeStat("tick_value", this.tickTime, this.currentTickTime);
		}
	}

	update() {
		if (DEBUG) {
			if (server.tick % 20 === 0) this.updateStat();
		} else {
			this.updateStat();
		}

		this.screen.update();
	}
}
