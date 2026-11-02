import { TEOF } from "./token";
import TokenStream from "./token-stream";
import { ParserState } from "./parser-state";
import { Expression } from "./expression";
import {
  add,
  sub,
  mul,
  div,
  mod,
  concat,
  equal,
  notEqual,
  greaterThan,
  lessThan,
  greaterThanEqual,
  lessThanEqual,
  andOperator,
  orOperator,
  inOperator,
  sinh,
  cosh,
  tanh,
  asinh,
  acosh,
  atanh,
  log10,
  neg,
  not,
  trunc,
  random,
  factorial,
  gamma,
  stringOrArrayLength,
  hypot,
  condition,
  roundTo,
  setVar,
  arrayIndex,
  max,
  min,
  arrayMap,
  arrayFold,
  arrayFilter,
  stringOrArrayIndexOf,
  arrayJoin,
  sign,
  cbrt,
  expm1,
  log1p,
  log2,
  sum,
} from "./functions";
import { Instruction, ValueObject } from "./instruction";
import { OpFunc } from "./evaluate";

export interface ParserOptions {
  allowMemberAccess?: boolean;
  operators?: {
    add?: boolean;
    comparison?: boolean;
    concatenate?: boolean;
    conditional?: boolean;
    divide?: boolean;
    factorial?: boolean;
    logical?: boolean;
    multiply?: boolean;
    power?: boolean;
    remainder?: boolean;
    subtract?: boolean;
    sin?: boolean;
    cos?: boolean;
    tan?: boolean;
    asin?: boolean;
    acos?: boolean;
    atan?: boolean;
    sinh?: boolean;
    cosh?: boolean;
    tanh?: boolean;
    asinh?: boolean;
    acosh?: boolean;
    atanh?: boolean;
    sqrt?: boolean;
    log?: boolean;
    ln?: boolean;
    lg?: boolean;
    log10?: boolean;
    abs?: boolean;
    ceil?: boolean;
    floor?: boolean;
    round?: boolean;
    trunc?: boolean;
    exp?: boolean;
    length?: boolean;
    in?: boolean;
    random?: boolean;
    min?: boolean;
    max?: boolean;
    assignment?: boolean;
    fndef?: boolean;
    cbrt?: boolean;
    expm1?: boolean;
    log1p?: boolean;
    sign?: boolean;
    log2?: boolean;
  };
}

export const UNARY_OPS = {
  sin: (x: number) => math.sin(x),
  cos: (x: number) => math.cos(x),
  tan: (x: number) => math.tan(x),
  asin: (x: number) => math.asin(x),
  acos: (x: number) => math.acos(x),
  atan: (x: number) => math.atan(x),
  sinh: sinh,
  cosh: cosh,
  tanh: tanh,
  asinh: asinh,
  acosh: acosh,
  atanh: atanh,
  sqrt: (x: number) => math.sqrt(x),
  cbrt: cbrt,
  log: (x: number) => math.log(x),
  log2: log2,
  ln: (x: number) => math.log(x),
  lg: log10,
  log10: log10,
  expm1: expm1,
  log1p: log1p,
  abs: (x: number) => math.abs(x),
  ceil: (x: number) => math.ceil(x),
  floor: (x: number) => math.floor(x),
  round: (x: number) => math.round(x),
  trunc: trunc,
  "-": neg,
  "+": (x: number) => Number(x),
  exp: (x: number) => math.exp(x),
  not: not,
  length: stringOrArrayLength,
  "!": factorial,
  sign: sign,
};

const BINARY_OPS = {
  "+": add,
  "-": sub,
  "*": mul,
  "/": div,
  "%": mod,
  "^": (a: number, b: number) => a ** b,
  "||": concat,
  "==": equal,
  "!=": notEqual,
  ">": greaterThan,
  "<": lessThan,
  ">=": greaterThanEqual,
  "<=": lessThanEqual,
  and: andOperator,
  or: orOperator,
  in: inOperator,
  "=": setVar,
  "[": arrayIndex,
};

const TERNARY_OPS = {
  "?": condition,
};

const FUNCTIONS = {
  random: random,
  fac: factorial,
  min: min,
  max: max,
  hypot: hypot,
  pyt: hypot, // backward compat
  pow: (a: number, b: number) => a ** b,
  atan2: (y: number, x: number) => math.atan2(y, x),
  if: condition,
  gamma: gamma,
  roundTo: roundTo,
  map: arrayMap,
  fold: arrayFold,
  filter: arrayFilter,
  indexOf: stringOrArrayIndexOf,
  join: arrayJoin,
  sum: sum,
};

const CONSTS = {
  E: math.exp(1),
  PI: math.pi,
  true: true,
  false: false,
};

type ParserFunctions = typeof FUNCTIONS & {
  [key: string]: OpFunc;
};

export class Parser {
  unaryOps: typeof UNARY_OPS = UNARY_OPS;
  binaryOps: typeof BINARY_OPS = BINARY_OPS;
  ternaryOps: typeof TERNARY_OPS = TERNARY_OPS;
  functions = FUNCTIONS as ParserFunctions;
  consts: typeof CONSTS = CONSTS;

  constructor(public options: ParserOptions = {}) {}

  parse(expression: string): Expression {
    const instr: Instruction[] = [];
    const parserState = new ParserState(
      this,
      new TokenStream(this, expression),
      {
        allowMemberAccess: this.options.allowMemberAccess,
      },
    );

    parserState.parseExpression(instr);
    parserState.expect(TEOF, "EOF");

    return new Expression(instr, this);
  }

  evaluate(expr: string, variables?: ValueObject) {
    return this.parse(expr).evaluate(variables);
  }

  static parse(expr: string): Expression {
    return defaultParser.parse(expr);
  }

  static evaluate(expr: string, variables?: ValueObject) {
    return defaultParser.parse(expr).evaluate(variables);
  }

  isOperatorEnabled(op: string): boolean {
    const optionName = getOptionName(op);
    const operators = this.options.operators || {};
    const operator = operators[optionName as keyof ParserOptions["operators"]];
    return !(optionName in operators) || !!operator;
  }
}

const defaultParser = new Parser();

const optionNameMap = {
  "+": "add",
  "-": "subtract",
  "*": "multiply",
  "/": "divide",
  "%": "remainder",
  "^": "power",
  "!": "factorial",
  "<": "comparison",
  ">": "comparison",
  "<=": "comparison",
  ">=": "comparison",
  "==": "comparison",
  "!=": "comparison",
  "||": "concatenate",
  and: "logical",
  or: "logical",
  not: "logical",
  "?": "conditional",
  ":": "conditional",
  "=": "assignment",
  "[": "array",
  "()=": "fndef",
};

function getOptionName(op: string) {
  return op in optionNameMap
    ? optionNameMap[op as keyof typeof optionNameMap]
    : op;
}
