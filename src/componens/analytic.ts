import { UIItem } from "../ui/item";

class TimeEstimator {}

export class UIAnalytic {
	private screen = new UIItem("debug_analytic");
	private time = 0;

	constructor() {
        this.screen.setText("title", "Analytic");
		this.screen.setText("time", "time:");
	}

	update() {
		if (server.tick % 20 === 0) {
			this.screen.setText("time_value", `${this.time}s`);
			this.time += 1;
		}
	}
}
