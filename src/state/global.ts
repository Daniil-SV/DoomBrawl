import Events from "../event_manager";
import { UISystem } from "../ui/ui";

class GlobalState {
	public time = 0;
	public ui: UISystem = new UISystem();
	public tickClock: number = 0;

	private updateTime() {
		

		
	}

	public update() {
		this.tickClock = os.clock()
		
		this.updateTime();
		Events.update();

		this.ui.update();

		Events.pushEvents();
	}
}

const Global = new GlobalState();
export default Global;
