import {
  Instruction,
  INUMBER,
  IOP1,
  IOP2,
  IOP3,
  IVAR,
  IVARNAME,
  IEXPR,
  IMEMBER,
  IARRAY,
  Value,
  ValueObject,
} from "./instruction";
import { Parser } from "./parser";

/**
 * NOTE: Best effort typing retroactively applied to legacy code...
 * should be understood as expectations rather than guarantees
 */

export default function simplify(
  tokens: Instruction[],
  unaryOps: Parser["unaryOps"],
  binaryOps: Parser["binaryOps"],
  ternaryOps: Parser["ternaryOps"],
  values: Record<string, unknown>,
): Instruction[] {
  const nstack: Instruction[] = [];
  const newexpression: Instruction[] = [];
  let n1, n2, n3;
  let f;
  for (let i = 0; i < tokens.length; i++) {
    let item = tokens[i];
    const type = item.type;
    if (type === INUMBER || type === IVARNAME) {
      if (Array.isArray(item.value)) {
        const instructions = ([] as Instruction[]).concat(
          (item.value as Instruction<number>[]).map(function (x) {
            return new Instruction(INUMBER, x);
          }),
          new Instruction(IARRAY, item.value.length),
        );
        nstack.push(
          ...simplify(instructions, unaryOps, binaryOps, ternaryOps, values),
        );
      } else {
        nstack.push(item);
      }
    } else if (type === IVAR && (item.value as string) in values) {
      const lookup = item.value as string;
      const result = values[lookup] as Value;
      item = new Instruction(INUMBER, result);
      nstack.push(item);
    } else if (type === IOP2 && nstack.length > 1) {
      n2 = nstack.pop() as Instruction<number>;
      n1 = nstack.pop() as Instruction<number>;
      f = binaryOps[item.value as keyof typeof binaryOps] as (
        a: number,
        b: number,
      ) => number;
      item = new Instruction(INUMBER, f(n1.value!, n2.value!));
      nstack.push(item);
    } else if (type === IOP3 && nstack.length > 2) {
      n3 = nstack.pop();
      n2 = nstack.pop();
      n1 = nstack.pop();
      const boolValue = n1 as Instruction<boolean>;
      const trueValue = n2 as Instruction<number>;
      const falseValue = n3 as Instruction<number>;
      if (item.value === "?") {
        nstack.push(boolValue.value ? trueValue : falseValue);
      } else {
        const lookup = item.value as keyof typeof ternaryOps;
        f = ternaryOps[lookup] as (a: boolean, b: number, c: number) => number;
        item = new Instruction(
          INUMBER,
          f(boolValue.value!, trueValue.value!, falseValue.value!),
        );
        nstack.push(item);
      }
    } else if (type === IOP1 && nstack.length > 0) {
      const lookup = item.value as keyof typeof unaryOps;
      n1 = nstack.pop() as Instruction<number>;
      f = unaryOps[lookup] as (a: number) => number;
      item = new Instruction(INUMBER, f(n1.value!));
      nstack.push(item);
    } else if (type === IEXPR) {
      while (nstack.length > 0) {
        newexpression.push(nstack.shift() as Instruction<string>);
      }
      newexpression.push(
        new Instruction(
          IEXPR,
          simplify(
            item.value as Instruction[],
            unaryOps,
            binaryOps,
            ternaryOps,
            values,
          ),
        ),
      );
    } else if (type === IMEMBER && nstack.length > 0) {
      n1 = nstack.pop() as Instruction<ValueObject>;
      nstack.push(new Instruction(INUMBER, n1.value![item.value as string]));
    } else {
      while (nstack.length > 0) {
        newexpression.push(nstack.shift()!);
      }
      newexpression.push(item);
    }
  }
  while (nstack.length > 0) {
    newexpression.push(nstack.shift()!);
  }
  return newexpression;
}
