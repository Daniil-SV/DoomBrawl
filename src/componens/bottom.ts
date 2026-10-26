import Characters from "../characters";
import { UIItem } from "../ui/item";

export class UIBottomBar {
	public status: UIItem;

	constructor() {
		this.status = new UIItem("doom_character_bottom_status", {
			position: [0, 500],
		});
		// this.status.addSkin("skin", { name: Characters.Slayer });
	}

	public update() {
		//this.status.update(player);
	}
}
