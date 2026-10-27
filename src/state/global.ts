import Events from "../event_manager";
import { UISystem } from "../ui/ui";

class GlobalState {
	public time = 0;
	public ui: UISystem = new UISystem();

	private updateTime() {
		if (server.tick % 20 === 0) Global.time += 1;

		if (DEBUG && server.tick % 40 === 0) {
			log(`Script time: ${Global.time}`);
		}
	}

	public update() {
		this.updateTime();
		Events.update();

		this.ui.update();

		Events.pushEvents();
	}
}

const Global = new GlobalState();
export default Global;
