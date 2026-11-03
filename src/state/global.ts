import Events from "../event_manager";
import { UISystem } from "../ui/ui";

class GlobalState {
	public time = 0;
	public ui: UISystem = new UISystem();
	public tickClock: number = 0;

	public update() {
		this.tickClock = os.clock();

		Events.update();
		this.ui.update();
		this.ui.analytic.currentTickTime = os.clock() - this.tickClock;

		Events.pushEvents();
	}
}

const Global = new GlobalState();
export default Global;
