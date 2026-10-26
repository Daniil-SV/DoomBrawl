/** @noSelfInFile **/

declare global {
	/**
	 * Lua-функция для представления DamageEventListener.
	 */
	type DamageEventCallback = (
		source: LogicCharacter | undefined,
		projectile: LogicProjectile | undefined,
		damage: number,
		data: Data | undefined,
		origin: AttackOrigin,
	) => void;

	/**
	 * Lua-функция для представления SkillEventListener.
	 */
	type SkillEventCallback = (skill: Skill) => void;

	/**
	 * Lua-функция для представления SourceListener.
	 */
	type SourceCallback = (origin: AttackOrigin) => void;

	/**
	 * Lua-функция для представления BasicListener.
	 */
	type BasicCallback = () => void;

	/**
	 * Lua-функция для представления InputListener.
	 */
	type InputCallback = (index: number, spec0: number, spec1: number) => void;

	/**
	 * Преобразует Lua-функцию в Java-объект (лямбду)
	 * соответствующего класса.
	 */
	interface CreateCallback {
		(
			className: "DamageEventListener",
			callback: DamageEventCallback,
		): DamageEventListener;
		(
			className: "SkillEventListener",
			callback: SkillEventCallback,
		): SkillEventListener;
		(className: "SourceListener", callback: SourceCallback): SourceListener;
		(className: "BasicListener", callback: BasicCallback): BasicListener;
		(className: "InputListener", callback: InputCallback): InputListener;
	}

	type EventType = "updateUIItem" | "removeUIItem" | "scheduleTasks";

	interface EventTask {
		action: EventType;
		[key: string]: string | [number, number];
	}

	/**
	 * Глобальный экземпляр класса Server.
	 */
	const server: Server;

	/**
	 * Ищет табличные данные (Data) по типу таблицы и имени.
	 */
	function lookup<T>(subtype: number, name: string): T & Data;

	/**
	 * Создаёт LogicGameObject из соответствующего Data.
	 */
	function createObject<T>(data: Data): T & LogicGameObject;

	/**
	 * Преобразует Lua-функцию в Java-объект (лямбду)
	 * соответствующего класса.
	 */
	const createCallback: CreateCallback;

	/**
	 * Печатает строки в отладочные журналы и,
	 * если применимо, в чат дружеской комнаты.
	 */
	function log(...args: any[]): void;

	/**
	 * Отправляет событие на клиент.
	 */
	function event(action: EventType, data: any): void;

	/**
	 * Глобально доступная библиотека rxi/json.lua
	 * для кодирования и декодирования JSON.
	 */
	const json: {
		/**
		 * Кодирует поддерживаемое Lua-значение в JSON.
		 */
		encode(value: any): string;

		/**
		 * Декодирует JSON-строку в Lua-значение.
		 */
		decode(value: string): any;
	};

	/**
	 * Custom variable comes from DarkLua compilation
	 */
	declare var DEBUG: boolean;
}

export {};
