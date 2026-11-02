declare global {
	namespace math {
		function atan2(y: number, x: number): number;
		function clamp(x: number, min: number, max: number): number;
		function log(x: number, base?: number): number;
		function log10(x: number): number;
		function noise(x: number, y?: number, z?: number): number;
		function pow(x: number, y: number): number;
		function random(): number;
		function random(m: number): number;
		function random(m: number, n: number): number;
		function round(x: number): number;
		function sign(x: number): number;
		function ult(a: number, b: number): boolean;
		const e: number;
	}

	namespace string {
		function pack(format: string, ...args: any[]): string;
		function packsize(format: string): number;
		function split(s: string, separator: string): string[];
		function unpack(
			format: string,
			s: string,
			init?: number,
		): LuaMultiReturn<any[]>;
	}

	namespace table {
		function clear(t: any): void;
		function clone(t: any): any;
		function create(count: number, value?: any): any[];
		function find<T>(t: T[], value: T, init?: number): number | undefined;
		function freeze(t: any): any;
		function isfrozen(t: any): boolean;
		function move(a1: any, f: number, e: number, t: number, a2?: any): void;
		function pack(...args: any[]): { n: number; [i: number]: any };
		function unpack(t: any, i?: number, j?: number): any;
	}

	namespace utf8 {
		/** Encodes Unicode code points into a UTF-8 string. */
		function char(...codepoints: number[]): string;

		/**
		 * Returns an iterator yielding the byte position and code point.
		 */
		function codes(s: string): LuaIterable<LuaMultiReturn<[number, number]>>;

		/** Returns Unicode code points starting at byte positions i through j. */
		function codepoint(
			s: string,
			i?: number,
			j?: number,
		): LuaMultiReturn<number[]>;

		/**
		 * Counts Unicode code points.
		 * Returns undefined for invalid UTF-8.
		 */
		function len(s: string, i?: number, j?: number): number | undefined;

		/**
		 * Returns the byte position of a code point.
		 * Returns undefined if the position is out of range.
		 */
		function offset(s: string, n: number, i?: number): number | undefined;

		/** Pattern matching UTF-8 byte sequences. */
		const charpattern: string;
	}
}

export {};
