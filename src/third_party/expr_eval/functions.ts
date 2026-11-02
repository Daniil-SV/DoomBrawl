import { ValueObject } from "./instruction";

export type Primitive = string | number | boolean | null | undefined;

/**
 * If you want these utilities to be usable inside your parser with your `Value` type,
 * replace `unknown` with your `Value` and tighten the function signatures accordingly.
 */
export type ValueLike = unknown;

// ---------- Basic arithmetic / comparisons ----------

export function add(a: ValueLike, b: ValueLike): number {
  return Number(a) + Number(b);
}

export function sub(a: number, b: number): number {
  return a - b;
}

export function mul(a: number, b: number): number {
  return a * b;
}

export function div(a: number, b: number): number {
  return a / b;
}

export function mod(a: number, b: number): number {
  return a % b;
}

export function concat(a: ValueLike, b: ValueLike): ValueLike {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.concat(b);
  }
  return "" + String(a) + String(b);
}

export function equal(a: ValueLike, b: ValueLike): boolean {
  return a === b;
}

export function notEqual(a: ValueLike, b: ValueLike): boolean {
  return a !== b;
}

export function greaterThan(a: number, b: number): boolean {
  return a > b;
}

export function lessThan(a: number, b: number): boolean {
  return a < b;
}

export function greaterThanEqual(a: number, b: number): boolean {
  return a >= b;
}

export function lessThanEqual(a: number, b: number): boolean {
  return a <= b;
}

export function andOperator(a: ValueLike, b: ValueLike): boolean {
  return Boolean(a && b);
}

export function orOperator(a: ValueLike, b: ValueLike): boolean {
  return Boolean(a || b);
}

export function inOperator(a: ValueLike, b: ValueLike): boolean {
  return (b as unknown[]).includes(a);
}

// ---------- Hyperbolic + logs ----------

export function sinh(a: number): number {
  return (math.exp(a) - math.exp(-a)) / 2;
}

export function cosh(a: number): number {
  return (math.exp(a) + math.exp(-a)) / 2;
}

export function tanh(a: number): number {
  if (a === Infinity) return 1;
  if (a === -Infinity) return -1;
  return (math.exp(a) - math.exp(-a)) / (math.exp(a) + math.exp(-a));
}

export function asinh(a: number): number {
  if (a === -Infinity) return a;
  return math.log(a + math.sqrt(a * a + 1));
}

export function acosh(a: number): number {
  return math.log(a + math.sqrt(a * a - 1));
}

export function atanh(a: number): number {
  return math.log((1 + a) / (1 - a)) / 2;
}

export function log10(a: number): number {
  return math.log(a, 10);
}

// ---------- Unary ----------

export function neg(a: number): number {
  return -a;
}

export function not(a: ValueLike): boolean {
  return !a;
}

export function trunc(a: number): number {
  return a < 0 ? math.ceil(a) : math.floor(a);
}

export function random(a?: number): number {
  return math.random() * (a || 1);
}

export function factorial(a: number): number {
  return gamma(a + 1);
}

// ---------- Gamma ----------

function isInteger(value: number): boolean {
  return isFinite(value) && value === math.round(value);
}

const GAMMA_G = 4.7421875;

/* eslint-disable no-loss-of-precision */
const GAMMA_P: number[] = [
  0.99999999999999709182, 57.156235665862923517, -59.597960355475491248,
  14.136097974741747174, -0.49191381609762019978, 0.33994649984811888699e-4,
  0.46523628927048575665e-4, -0.98374475304879564677e-4,
  0.15808870322491248884e-3, -0.21026444172410488319e-3,
  0.2174396181152126432e-3, -0.16431810653676389022e-3,
  0.84418223983852743293e-4, -0.2619083840158140867e-4,
  0.36899182659531622704e-5,
];
/* eslint-enable no-loss-of-precision */

// Gamma function from math.js
export function gamma(n: number): number {
  let x: number;

  if (isInteger(n)) {
    if (n <= 0) {
      return isFinite(n) ? Infinity : NaN;
    }

    if (n > 171) {
      return Infinity; // Will overflow
    }

    let value = n - 2;
    let res = n - 1;
    while (value > 1) {
      res *= value;
      value--;
    }

    if (res === 0) {
      res = 1; // 0! is per definition 1
    }

    return res;
  }

  if (n < 0.5) {
    return math.pi / (math.sin(math.pi * n) * gamma(1 - n));
  }

  if (n >= 171.35) {
    return Infinity; // will overflow
  }

  if (n > 85.0) {
    // Extended Stirling Approx
    const twoN = n * n;
    const threeN = twoN * n;
    const fourN = threeN * n;
    const fiveN = fourN * n;
    return (
      math.sqrt((2 * math.pi) / n) *
      (n / math.exp(1)) ** n *
      (1 +
        1 / (12 * n) +
        1 / (288 * twoN) -
        139 / (51840 * threeN) -
        571 / (2488320 * fourN) +
        163879 / (209018880 * fiveN) +
        5246819 / (75246796800 * fiveN * n))
    );
  }

  n -= 1;
  x = GAMMA_P[0]!;
  for (let i = 1; i < GAMMA_P.length; ++i) {
    x += GAMMA_P[i]! / (n + i);
  }

  const t = n + GAMMA_G + 0.5;
  return math.sqrt(2 * math.pi) * (t ** (n + 0.5)) * math.exp(-t) * x;
}

// ---------- String/array helpers ----------

export function stringOrArrayLength(s: ValueLike): number {
  if (Array.isArray(s)) {
    return s.length;
  }
  return String(s).length;
}

export function hypot(...values: number[]): number {
  let sumVal = 0;
  let larg = 0;

  for (let i = 0; i < values.length; i++) {
    const arg = math.abs(values[i]!);
    let div: number;

    if (larg < arg) {
      div = larg / arg;
      sumVal = sumVal * div * div + 1;
      larg = arg;
    } else if (arg > 0) {
      div = arg / larg;
      sumVal += div * div;
    } else {
      sumVal += arg;
    }
  }

  return larg === Infinity ? Infinity : larg * math.sqrt(sumVal);
}

export function condition<T>(cond: ValueLike, yep: T, nope: T): T {
  return cond ? yep : nope;
}

/**
 * Decimal adjustment of a number.
 * From @escopecz.
 *
 * @param value The number.
 * @param exp   The exponent (the 10 logarithm of the adjustment base).
 * @return The adjusted value.
 */
export function roundTo(value: number, exp?: number): number {
  // If the exp is undefined or zero...
  if (typeof exp === "undefined" || +exp === 0) {
    return math.round(value);
  }

  let v = +value;
  const e = -+exp;

  // If the value is not a number or the exp is not an integer...
  if (isNaN(v) || !(typeof e === "number" && e % 1 === 0)) {
    return NaN;
  }

  // Shift
  let parts = v.toString().split("e");
  v = math.round(+(parts[0] + "e" + (parts[1] ? +parts[1] - e : -e)));

  // Shift back
  parts = v.toString().split("e");
  return +(parts[0] + "e" + (parts[1] ? +parts[1] + e : e));
}

export function setVar(
  name: string,
  value: ValueObject[keyof ValueObject],
  variables?: ValueObject,
): ValueLike {
  if (variables) variables[name] = value;
  return value;
}

export function arrayIndex<T>(array: T[], index: number): T {
  return array[Math.trunc(index)];
}

export function max(): number;
export function max(array: number[]): number;
export function max(a: number, ...args: number[]): number;
export function max(arrayOrA?: number[] | number, ...args: number[]): number {
  if (typeof arrayOrA === "undefined") return -Infinity;

  if (Array.isArray(arrayOrA)) {
    return arrayOrA.length === 0
  ? -Infinity
  : math.max(...(arrayOrA as [number, ...number[]]));
  }

  return args.length === 0 ? arrayOrA : math.max(arrayOrA, ...args);
}

export function min(): number;
export function min(array: number[]): number;
export function min(a: number, ...args: number[]): number;
export function min(arrayOrA?: number[] | number, ...args: number[]): number {
  if (typeof arrayOrA === "undefined") return Infinity;

  if (Array.isArray(arrayOrA)) {
    return arrayOrA.length === 0
  ? Infinity
  : math.min(...(arrayOrA as [number, ...number[]]));
  }

  return args.length === 0 ? arrayOrA : math.min(arrayOrA, ...args);
}

export function arrayMap<T, R>(f: (x: T, i: number) => R, a: T[]): R[] {
  if (typeof f !== "function") {
    throw new Error("First argument to map is not a function");
  }
  if (!Array.isArray(a)) {
    throw new Error("Second argument to map is not an array");
  }
  return a.map((x, i) => f(x, i));
}

export function arrayFold<T, R>(
  f: (acc: R, x: T, i: number) => R,
  init: R,
  a: T[],
): R {
  if (typeof f !== "function") {
    throw new Error("First argument to fold is not a function");
  }
  if (!Array.isArray(a)) {
    throw new Error("Second argument to fold is not an array");
  }
  return a.reduce((acc, x, i) => f(acc, x, i), init);
}

export function arrayFilter<T>(f: (x: T, i: number) => boolean, a: T[]): T[] {
  if (typeof f !== "function") {
    throw new Error("First argument to filter is not a function");
  }
  if (!Array.isArray(a)) {
    throw new Error("Second argument to filter is not an array");
  }
  return a.filter((x, i) => f(x, i));
}

export function stringOrArrayIndexOf(target: string, s: string): number;
export function stringOrArrayIndexOf<T>(target: T, s: readonly T[]): number;
export function stringOrArrayIndexOf<T>(
  target: T,
  s: string | readonly T[],
): number {
  if (typeof s === "string") {
    return s.indexOf(String(target));
  }

  if (Array.isArray(s)) {
    return s.indexOf(target);
  }

  throw new Error("Second argument to indexOf is not a string or array");
}

export function arrayJoin(sep: string, a: unknown[]): string {
  if (!Array.isArray(a)) {
    throw new Error("Second argument to join is not an array");
  }
  return a.join(sep);
}

export function sign(x: number): number {
  return (x > 0 ? 1 : 0) - (x < 0 ? 1 : 0) || +x;
}

const ONE_THIRD = 1 / 3;
export function cbrt(x: number): number {
  return x < 0 ? -((-x) ** ONE_THIRD) : (x ** ONE_THIRD);
}

export function expm1(x: number): number {
  return math.exp(x) - 1;
}

export function log1p(x: number): number {
  return math.log(1 + x);
}

export function log2(x: number): number {
  return math.log(x) / math.log(2);
}

export function sum(array: unknown[]): number {
  if (!Array.isArray(array)) {
    throw new Error("Sum argument is not an array");
  }

  if (array.length === 0) return 0;

  return array.reduce<number>((total, value) => {
    return total + Number(value);
  }, 0);
}
