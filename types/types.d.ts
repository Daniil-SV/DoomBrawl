/// <reference types="@typescript-to-lua/language-extensions" />
/** biome-ignore-all lint/suspicious/noEmptyInterface: luau definitions */

type ListIterable<T> = LuaIterable<LuaMultiReturn<[number, T]>>;

interface List<T> extends ListIterable<T> {
	[index: number]: T;
	get(index: number): T;
	add(object: T): boolean;
	size(): number;
	indexOf(object: T): number;
}

interface Server {
	// Текущий тик сервера. Монотонно увеличивается на 1 каждые 50 миллисекунд.
	readonly tick: number;
	// Количество игроков в бою.
	readonly playersCount: number;
	// LocationData текущей локации. Может быть равен #nil, если используется кастомная карта.
	readonly locationData: LocationData | undefined;
	// Текущий игровой режим.
	gameMode: GameMode;
	// Завершен ли бой?
	isBattleEnded: boolean;
	// Выключен ли яд игрового режима?
	hasPoisonDisabled: boolean;
	// Пропустить ли интро-анимацию?
	hasIntroSkip: boolean;
	// …
	objectManager: GameObjectManager;
	// …
	map: TileMap;
	// …
	customInputListeners: List<InputListener>;
	// Позволяет получить объект ClientInfo по индексу игрока.
	getClientInfo(index: number): ClientInfo | undefined;
	// Позволяет проверить, завершилась ли интро-анимация боя.
	isIntroFinished(): boolean;
	// Позволяет получить случайное целое число от N до M: [N; M). Использует тот же генератор случайных чисел, что и логика игры.
	getRandomInt(N: number, M: number): number;
	// Принудительно завершает бой, задавая команду-победителя.
	debugFinishBattle(team: number): void;
}

interface GameObjectManager {
	// Ищет объект по Object ID.
	getObject(id: number): LogicGameObject | undefined;
	// Добавляет новый объект на поле боя.
	addObject(object: LogicGameObject | undefined): void;
	// Возвращает список объектов класса LogicCharacter.
	getCharacters(): ListIterable<LogicCharacter>;
	// Возвращает список объектов класса LogicAreaEffect.
	getAreaEffects(): ListIterable<LogicAreaEffect>;
	// Возвращает список объектов LogicItem.
	getItems(): ListIterable<LogicItem>;
	// Возвращает список объектов LogicProjectile.
	getProjectiles(): ListIterable<LogicProjectile>;
}

interface ClientInfo {
	// Индекс этого игрока.
	index: number;
	// Номер команды игрока. Два игрока одной команды будут иметь одинаковое значение.
	team: number;
	// Object ID текущего LogicCharacter, за которого играет игрок.
	objectId: number;
	// …
	x: number;
	// Позиция камеры игрока. В большинстве случаев будет совпадать с позицией LogicCharacter, за которого играет игрок.
	y: number;
	// Количество игровых очков. Предназначение зависит от режима.
	gamePoints: number;
	// Равен #true, если персонаж игрока жив и присутствует на карте.
	isAlive: boolean;
	// Показывает, является ли игрок ботом.
	isBot: boolean;
	// …
	ultiCharge: number;
	// …
	maxUltiCharge: number;
	// …
	overchargeCharge: number;
	// …
	maxOverchargeCharge: number;
	// …
	ultiUsesLeft: number;
	// Равен #true, если игрок возрождается и вот-вот заспавнится.
	isRespawning: boolean;
	// …
	emoteUsedIndex: number;
	// …
	emoteUsedTick: number;
	// …
	isOverchargeActive: boolean;
	// …
	accessory: Accessory | undefined;
	// Возвращает текущий SkinData для этого игрока.
	getSkinData(): SkinData | undefined;
	// Возвращает эффективный номер команды игрока. Если игрок находится под контролем Виллоу, значение будет равно номеру команды этой Виллоу. В остальных случаях будет равно полю <i>team</i>.
	getAttackTeam(): number;
}

interface LogicGameObject {
	// Уникальный Object ID этого объекта.
	id: number;
	// …
	data: GameObjectData;
	// …
	x: number;
	// …
	y: number;
	// …
	z: number;
	// Индекс игрока, которому принадлежит объект. Равен #-1, если объект никому не принадлежит.
	index: number;
	// Номер команды, которой принадлежит объект. Равен #-1, если объект нейтрален или враждебен для всех.
	team: number;
	// Измерение. Равен #1, если объект находится в измерении Корделиуса, и #0 в остальных случаях.
	dimension: number;
	// …
	traits: Traits;
	// Задает координаты объекта. Важно: игровая логика может перезаписать ваши координаты, если объект находится в движении.
	setPosition(x: number, y: number, z: number): void;
	// Возвращает #false, если объект был уничтожен или убит. В ином случае вернет #true.
	isAlive(): boolean;
	// Позволяет узнать тип этого объекта: #0 = LogicCharacter, #1 = LogicProjectile, #2 = LogicAreaEffect, #3 = LogicItem.
	getType(): number;
	// …
	getSkinData(): SkinData | undefined;
	// …
	isOverchargeActive(): boolean;
	// Позволяет задать игрока-владельца объекта. Рекомендуется вызывать только перед добавлением объекта в GameObjectManager.
	setIndex(index: number, team: number): void;
}

interface Traits {
	// Добавляет конкретную способность.
	add(data: TraitData | undefined): void;
	// Удаляет конкретную способность.
	remove(data: TraitData | undefined): boolean;
	// Позволяет получить конкретную способность по её типу. Возвращает #nil, если способности с таким типом у объекта нет.
	getComponent(type: TraitType): TraitData | undefined;
}

interface LogicCharacter extends LogicGameObject {
	// Угол направления ног персонажа. По этому значению можно определить направление его движения.
	angleLegs: number;
	// Угол направления головы персонажа.
	angleHead: number;
	// Текущее количество здоровья.
	hitPoints: number;
	// Максимальное количество здоровья.
	maxHitPoints: number;
	// Тип персонажа.
	type: CharacterType;
	// Управляется ли персонаж ботом?
	isBot: boolean;
	// Есть ли стан у персонажа?
	isStunned: boolean;
	// …
	persistentSpeedBuff: number;
	// …
	persistentReloadBuff: number;
	// Уровень улучшения персонажа. Считается с нуля. Не все игровые механики используют это поле, поэтому вам также может понадобиться вызвать <i>setUpgradeLevel()</i> у конкретного Skill.
	heroUpgradeLevel: number;
	// Количество игровых очков текущего персонажа. Предназначение зависит от режима и может отличаться от одноименного поля в ClientInfo.
	gamePoints: number;
	// Количество очков усиления из ШД. Используется для отображения на клиенте и при выпадании предметов при смерти. Не влияет на урон или ХП персонажа.
	powerPoints: number;
	// Мяч (carryable), который держит персонаж. Если персонаж ничего не держит, то будет равен #nil.
	linkedCharacter: LogicCharacter | undefined;
	// Индекс игрока, который в последний раз наносил урон этому персонажу.
	lastDamageSourceIndex: number;
	// …
	hasRespawnShield: boolean;
	// Оставшееся здоровье consumable-щита.
	consShieldValue: number;
	// …
	statusEffects: StatusEffectList | undefined;
	// Список подписок на событие получения урона.
	takingDamageListeners: List<DamageEventListener>;
	// Список подписок на событие нанесения урона.
	dealingDamageListeners: List<DamageEventListener>;
	// Список подписок на событие смерти (когда здоровье опускается до нуля).
	deathListeners: List<SourceListener>;
	// Список подписок на событие использования атаки или супера.
	skillUseListeners: List<SkillEventListener>;
	// Список подписок на событие использования гиперзаряда.
	startOverchargeListeners: List<BasicListener>;
	// Наносит определенный урон игроку.
	takeDamage(
		srcIndex: number,
		damage: number,
		ulti: number,
		attacker: LogicCharacter | undefined,
		projectile: LogicProjectile | undefined,
		hasIndication: boolean,
		hasHighlight: boolean,
		srcX: number,
		srcY: number,
		someData: Data | undefined,
		forceProtected: boolean,
		origin: AttackOrigin,
		forceAll: boolean,
		makeVisible: boolean,
		disallowSpawns: boolean,
		extraValue: number,
	): boolean;
	// Лечит определенное количество здоровья игрока.
	takeHeal(
		srcIndex: number,
		damage: number,
		hasIndication: boolean,
		someData: Data | undefined,
		origin: AttackOrigin,
	): boolean;
	// Останавливает движение персонажа.
	stopMovement(): void;
	// Строит путь и начинает перемещение к указанной точке. Если hasCustomSpeed = false, то используется скорость персонажа.
	moveTo(
		x: number,
		y: number,
		hasCustomSpeed: boolean,
		customSpeed: number,
		isNw: boolean,
		useTeleports: boolean,
	): void;
	// Возвращает #true, если игрок не может управлять своим персонажем в данный момент.
	isPlayerControlRemoved(): boolean;
	// Возвращает #true, если персонаж находится в движении.
	isInMovement(): boolean;
	// Возвращает скилл основной атаки персонажа.
	getWeaponSkill(): Skill | undefined;
	// Возвращает скилл супера персонажа.
	getUltiSkill(): Skill | undefined;
	// Возвращает скилл с соответствующим SkillData, если такой присутствует у персонажа.
	getSkill(data: SkillData | undefined): Skill | undefined;
	// Использует заданный скилл, если он доступен.
	useSkill(
		data: SkillData | undefined,
		x: number,
		y: number,
		isAutoAim: boolean,
	): boolean;
	// Возвращает текущую скорость ходьбы с учетом баффов.
	getWalkSpeed(x: number, y: number): number;
	// Возвращает суммарный бафф урона в процентах.
	getSummaryDamageBuff(): number;
	// Меняет текущего игрового персонажа на заданного. Механика супера Мэг или Бонни.
	changeCharacter(data: CharacterData | undefined): LogicCharacter | undefined;
	// Увеличивает максимальное количество здоровья у персонажа. Если второй аргумент равен #true, то также увеличивает на 1 количество банок в ШД.
	increaseMaxHitPoints(value: number, powerUps: boolean): void;
	// Телепортирует персонажа в указанную точку. Можно задать эффекты, которые появятся в исходной точке и точке назначения. Эти эффекты будут использовать заданный урон.
	teleport(
		x: number,
		y: number,
		srcAreaEffect: AreaEffectData | undefined,
		destAreaEffect: AreaEffectData | undefined,
		damage: number,
		ultiCharge: number,
	): void;
	// Создает новый эффект от имени этого персонажа. Конкретно этот метод предполагается для таких механик, как супер Эмз, эффект зарядки ульты Базза или эффект лечения от станции Пэм. В общем, разные долгоживущие эффекты, зачастую привязанные к персонажу.
	spawnCirclingAreaEffect(
		damageBonus: number,
		data: AreaEffectData | undefined,
		origin: AttackOrigin,
		applyOwnerBuffs: boolean,
		followOwner: boolean,
	): LogicAreaEffect | undefined;
	// Позволяет получить первого питомца этого персонажа, если таковой присутствует. Иначе вернет #nil.
	getPet(
		movingOnly: boolean,
		standingOnly: boolean,
	): LogicCharacter | undefined;
	// Сбрасывает таймер восстановления здоровья.
	blockHealthRegen(): void;
	// Накладывает статус-эффект персонажу. Конкретное поведение эффекта определяется его StatusEffectData. Аргументы srcIndex, srcTeam, attacker позволяют определить от лица какого персонажа (и игрока) будет происходить действие (например, нанесение урона), если это применимо к этому эффекту. Может вернуть #nil, если (1) эффект не может быть наложен, либо (2) если такой эффект уже наложен, при этом Stackable = FALSE и Refreshable = FALSE.
	addStatusEffect(
		data: StatusEffectData | undefined,
		srcIndex: number,
		srcTeam: number,
		origin: AttackOrigin,
		attacker: LogicCharacter | undefined,
	): StatusEffect | undefined;
	// Аналогично <i>addStatusEffect()</i>. Действие будет происходить от лица персонажа, на которого накладывается статус эффект.
	addStatusEffectSelf(
		data: StatusEffectData | undefined,
		origin: AttackOrigin,
	): StatusEffect | undefined;
	// Выдает классическую невидимость, как у супера Леона. Позволяет задать длительность и дистанцию, на которой персонаж становится принудительно видимым.
	setInvisibility(ticks: number, distanceToSee: number): void;
	// Выдает consumable-щит. Позволяет указать его количество здоровья (value) и длительность (ticks).
	setConsumableShield(value: number, ticks: number): void;
	// Выдает классический щит. Позволяет указать процент защиты (value) и длительность (ticks).
	gainShield(ticks: number, value: number): void;
	// Накладывает классический эффект стана. Позволяет указать длительность (ticks) и подтип (isSleepy, isCrossing).
	setStun(
		ticks: number,
		skipImmunity: boolean,
		isSleepy: boolean,
		isCrossing: boolean,
	): boolean;
	// Отталкивает персонажа от указанной точки. Сила (strength) определяет расстояние отталкивания.
	push(
		pushX: number,
		pushY: number,
		strength: number,
		canFly: boolean,
		a7: boolean,
		a8: boolean,
		a9: boolean,
		skipCCImmunity: boolean,
		a11: boolean,
		a12: boolean,
		a13: boolean,
		useFixedDistance: boolean,
		stunTicks: number,
		speedModifier: number,
	): void;
}

interface Skill {
	// …
	data: SkillData;
	// Количество тиков, через которое скилл перейдет из активного в неактивное состояние. Монотонно убывает. Если скилл не в активном состоянии, то равен нулю.
	activeTicksLeft: number;
	// Текущие патроны. Актуально только для основной атаки. Одна единица равна 1/1000 патрона.
	chargeValue: number;
	// Выставляет уровень улучшения этого скилла. Считается с нуля. Влияет на урон и другие параметры его атаки.
	setUpgradeLevel(level: number): void;
	// Максимальное значение для патронов. Актуально только для основной атаки. Одна единица равна 1/1000 патрона.
	getMaxCharge(): number;
	// Позволяет добавить или убавить текущие патроны. Актуально только для основной атаки. Аргумент выражается в 1/100 патрона и может быть отрицательным.
	charge(percent: number): void;
	// Возвращает #true, если это основная атака.
	isWeaponSkill(): boolean;
	// Возвращает #true, если это супер.
	isUltiSkill(): boolean;
}

interface StatusEffectList {
	// Ищет конкретный эффект по его <i>data</i>. Возвращает #nil, если такого эффекта нет.
	getEffect(data: StatusEffectData | undefined): StatusEffect | undefined;
	// Ищет конкретный эффект по его <i>data</i> и <i>sourceIndex</i>. Возвращает #nil, если такого эффекта нет.
	getEffectSpec(
		data: StatusEffectData | undefined,
		sourceIndex: number,
	): StatusEffect | undefined;
}

interface StatusEffect {
	// …
	data: StatusEffectData;
	// Базовое значение периодического урона без учета баффов и уровня.
	damageBase: number;
	// Базовое значение периодического исцеления без учета баффов и уровня.
	healingBase: number;
	// Индекс игрока, наложившего эффект.
	sourceIndex: number;
	// Номер команды игрока, наложившего эффект.
	sourceTeam: number;
	// Общее количество тиков, в течение которых действует этот статус-эффект.
	ticksTotal: number;
	// Оставшееся количество тиков, в течение которых действует этот статус-эффект. Монотонно убывает.
	ticksLeft: number;
	// Прекращает действие статус-эффекта.
	cancel(): void;
	// Продлевает действие статус-эффекта на указанное количество тиков.
	addTicks(arg0: number): void;
	// Позволяет узнать, активен ли статус-эффект в текущий момент времени.
	isActive(): boolean;
}

interface LogicProjectile extends LogicGameObject {
	// Изначально равен нулю. При завершении движения выставляется положительное значение: #1 — достигнута предельная дистанция, #2 — попадание в границу карты, #3 — попадание в персонажа, #4 — попадание в блок, #5 — уничтожен извне.
	finishState: number;
	// Изначально равен #nil, но если попадание произошло в персонажа, то этот персонаж будет записан в это поле.
	shotCharacter: LogicCharacter | undefined;
	// …
	origin: AttackOrigin;
	// Угол направления.
	angle: number;
	// Урон, который будет наносить этот эффект персонажам в зоне действия.
	damage: number;
	// Количество супера, которое будет заряжаться у игрока при каждом нанесения урона.
	ultiEnergy: number;
	// …
	statusEffects: StatusEffectList | undefined;
	// …
	setFinishState(finishState: number): void;
}

interface LogicAreaEffect extends LogicGameObject {
	// …
	ownerCharacter: LogicCharacter | undefined;
	// …
	origin: AttackOrigin;
	// Урон, который будет наносить этот эффект персонажам в зоне действия.
	damage: number;
	// Количество супера, которое будет заряжаться у игрока при каждом нанесения урона.
	ultiEnergy: number;
	// …
	setSource(
		index: number,
		team: number,
		ownerCharacter: LogicCharacter | undefined,
		origin: AttackOrigin,
	): void;
	// Проверяет, находится ли игровой объект внутри зоны действия эффекта.
	isObjectInside(object: LogicGameObject | undefined): boolean;
	// Уничтожает этот эффект немедленно.
	destroy(): void;
	// Начинает действие этого эффекта. Необходимо вызвать один раз после добавления в GameObjectManager.
	trigger(): void;
}

interface LogicItem extends LogicGameObject {
	// …
	isTriggered: boolean;
	// …
	triggeredCharacter: LogicCharacter | undefined;
	// …
	ownerCharacter: LogicCharacter | undefined;
	// …
	origin: AttackOrigin;
	// Если предмет является спреем (Spray), тогда указывает на индекс конкретного спрея.
	sprayDataIndex: number;
	// …
	setSource(
		index: number,
		team: number,
		ownerCharacter: LogicCharacter | undefined,
		origin: AttackOrigin,
	): void;
	// Уничтожает этот предмет немедленно.
	destroy(): void;
}

interface Accessory {
	// …
	data: AccessoryData;
	// …
	isActive: boolean;
}

interface TileMap {
	// Ширина карты в клетках.
	tileSizeX: number;
	// Высота карты в клетках.
	tileSizeY: number;
	// Абсолютная ширина карты.
	absSizeX: number;
	// Абсолютная высота карты.
	absSizeY: number;
	// Уничтожает блок на заданной клетке.
	destructTile(x: number, y: number, isBasicWeapon: boolean): void;
	// Выставляет динамический блок на заданной клетке. Данный блок должен иметь DynamicCode != 0.
	setDynamicTile(
		data: TileData | undefined,
		x: number,
		y: number,
		ownerCharacter: LogicCharacter | undefined,
	): void;
	// Возвращает тайл по тайловым (клеточным) координатам. Возвращает #nil, если задана точка вне карты.
	getTile(x: number, y: number): Tile | undefined;
}

interface Tile {
	// Текущий TileData этой клетки.
	data: TileData;
	// Оригинальный TileData этой клетки. Загружается один раз и не меняется в течение боя.
	dataOriginal: TileData | undefined;
	// …
	x: number;
	// …
	y: number;
	// Возвращает #true, если этот тайл был выставлен динамически.
	isDynamic(): boolean;
	// Восстанавливает изначальное состояние тайла с момента начала боя. Следует использовать только для восстановления разрушенных стен.
	restoreOriginal(): void;
}

/** Происхождения атаки. */
declare enum AttackOrigin {
	UNKNOWN = "UNKNOWN",
	WEAPON = "WEAPON",
	ULTI = "ULTI",
	STAR_POWER = "STAR_POWER",
	ACCESSORY = "ACCESSORY",
	INCOMING_DAMAGE = "INCOMING_DAMAGE",
	OVERCHARGE_ABILITY = "OVERCHARGE_ABILITY",
	MODIFIER = "MODIFIER",
	EXTERNAL = "EXTERNAL",
	UNUSED_9 = "UNUSED_9",
	OVERCHARGE = "OVERCHARGE",
	GAME_MODE = "GAME_MODE",
	NEW_ROUND = "NEW_ROUND",
	PASSIVE_HEALING = "PASSIVE_HEALING",
	UNUSED_14 = "UNUSED_14",
	UNUSED_15 = "UNUSED_15",
	UNUSED_16 = "UNUSED_16",
	UNUSED_17 = "UNUSED_17",
	UNUSED_18 = "UNUSED_18",
	MUTATION = "MUTATION",
	PASSIVE_CHARGING = "PASSIVE_CHARGING",
	BONUS_SKILL = "BONUS_SKILL",
	COMPONENT = "COMPONENT",
	UNUSED_23 = "UNUSED_23",
	REDIRECT_SHIELD = "REDIRECT_SHIELD",
}

/** Значения предоставляются игровой средой; в исходном API список ключей динамический. */
type CharacterType = string;
type TraitType = string;
type GameMode = string;

interface Data {
	// Возвращает свой индекс в таблице.
	getIndex(): number;
	// Возвращает тип (числовой) своей таблицы. Для объектов внутри одной таблицы всегда будет одинаковым.
	getType(): number;
	// Возвращает свой уникальный ID. Фактически считается так: <code>(this.getType() * 1000000) + this.getIndex()</code>
	getGlobalId(): number;
	// Возвращает свое название (Name).
	getName(): string;
	// Вернет #true, если текущий и указанный Data описывают один и тот же объект, но для разных скинов. Например, для <i>Brock_def_atk_area</i> и <i>Brock_002_atk_area</i> из <i>area_effects_skin.csv</i>. По сути, сверяет колонку <i>Logic</i> на равенство.
	isSameAs(data: Data | undefined): boolean;
}

interface GameObjectData extends Data {}

interface ProjectileData extends GameObjectData {}

interface CharacterData extends GameObjectData {}

interface ItemData extends GameObjectData {}

interface AreaEffectData extends GameObjectData {}

interface TileData extends Data {}

interface SkillData extends Data {}

interface LocationData extends Data {}

interface SkinData extends Data {}

interface StatusEffectData extends Data {}

interface AccessoryData extends Data {}

interface TraitData extends Data {}

interface DamageEventListener {}

interface SkillEventListener {}

interface SourceListener {}

interface BasicListener {}

interface InputListener {}

type ArrayList<T> = List<T>;

declare const Server: {};

declare const GameObjectManager: {};

declare const ClientInfo: {};

declare const LogicGameObject: {};

declare const Traits: {};

declare const LogicCharacter: {};

declare const Skill: {};

declare const StatusEffectList: {};

declare const StatusEffect: {};

declare const LogicProjectile: {};

declare const LogicAreaEffect: {};

declare const LogicItem: {};

declare const Accessory: {};

declare const TileMap: {};

declare const Tile: {};

/** Таблицы значений, предоставляемые игровой средой. */
declare const CharacterType: LuaTable<string, CharacterType>;
declare const TraitType: LuaTable<string, TraitType>;
declare const GameMode: LuaTable<string, GameMode>;

declare const Data: {
	// …
	TYPE_PROJECTILE: number;
	// …
	TYPE_LOCATION: number;
	// …
	TYPE_CHARACTER: number;
	// …
	TYPE_AREA_EFFECT: number;
	// …
	TYPE_ITEM: number;
	// …
	TYPE_SKILL: number;
	// …
	TYPE_CARD: number;
	// …
	TYPE_TILE: number;
	// …
	TYPE_SKIN: number;
	// …
	TYPE_ACCESSORY: number;
	// …
	TYPE_EMOTE: number;
	// …
	TYPE_SPRAY: number;
	// …
	TYPE_TRAIT: number;
	// …
	TYPE_STATUS_EFFECT: number;
};

declare const GameObjectData: {};

declare const ProjectileData: {};

declare const CharacterData: {};

declare const ItemData: {};

declare const AreaEffectData: {};

declare const TileData: {};

declare const SkillData: {};

declare const LocationData: {};

declare const SkinData: {};

declare const StatusEffectData: {};

declare const AccessoryData: {};

declare const TraitData: {};

declare const DamageEventListener: {};

declare const SkillEventListener: {};

declare const SourceListener: {};

declare const BasicListener: {};

declare const InputListener: {};

declare const ListIterable: {};

declare const List: {};

declare const ArrayList: {};

declare var tick: (this: void) => void;
