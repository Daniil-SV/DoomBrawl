import Global from "./state/global";

tick = () => {
	server.hasIntroSkip = true;

	Global.update();
};
