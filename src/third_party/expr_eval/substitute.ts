import { Expression } from "./expression";
import {
  Instruction,
  IOP1,
  IOP2,
  IOP3,
  IVAR,
  IEXPR,
  ternaryInstruction,
  binaryInstruction,
  unaryInstruction,
} from "./instruction";

export default function substitute(
  tokens: Instruction[],
  variable: string,
  expr: Expression,
): Instruction[] {
  const newexpression: Instruction[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const item = tokens[i];
    const type = item.type;
    if (type === IVAR && item.value === variable) {
      for (let j = 0; j < expr.tokens.length; j++) {
        const expritem = expr.tokens[j];
        let replitem;
        if (expritem.type === IOP1) {
          replitem = unaryInstruction(expritem.value);
        } else if (expritem.type === IOP2) {
          replitem = binaryInstruction(expritem.value);
        } else if (expritem.type === IOP3) {
          replitem = ternaryInstruction(expritem.value);
        } else {
          replitem = new Instruction(expritem.type, expritem.value);
        }
        newexpression.push(replitem);
      }
    } else if (type === IEXPR) {
      const typedItem = item as Instruction<Instruction[]>;
      newexpression.push(
        new Instruction(IEXPR, substitute(typedItem.value!, variable, expr)),
      );
    } else {
      newexpression.push(item);
    }
  }
  return newexpression;
}
