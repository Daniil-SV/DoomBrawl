import Global from "./state/global";

function createExplosion(character: LogicCharacter) {
	function callback(origin: AttackOrigin) {
		if (origin !== AttackOrigin.WEAPON) {
			if (DEBUG) log("Wrong origin. Skip.");

			return;
		}

		const data = lookup(Data.TYPE_AREA_EFFECT, "HeistBombExplosion");
		character.spawnCirclingAreaEffect(
			0,
			data,
			AttackOrigin.UNKNOWN,
			false,
			false,
		);
		log("Boom!");
	}

	const impl = createCallback("SourceListener", callback);
	character.deathListeners.add(impl);
	if (DEBUG) log(`Created callback for ${character.id}`);
}

//tick = () => {
	// server.hasIntroSkip = true;
	// if (!server.isIntroFinished()) return;

	// for (const [_, character] of server.objectManager.getCharacters()) {
	// 	const isLootbox = character.data.getName() === "LootBox";
	// 	const marked = Global.marked.has(character.id);
	// 	if (isLootbox && !marked) {
	// 		if (DEBUG)
	// 			log(
	// 				`Got character with id ${character.id} and name ${character.data.getName()}`,
	// 			);

	// 		Global.marked.set(character.id, true);
	// 		createExplosion(character);
	// 	}
	// }
//};
