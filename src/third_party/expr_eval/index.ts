/*!
 Based on ndef.parser, by Raphael Graf(r@undefined.ch)
 http://www.undefined.ch/mparser/index.html

 Ported to JavaScript and modified by Matthew Crumley (email@matthewcrumley.com, http://silentmatt.com/)

 You are free to use and modify this code in anyway you find useful. Please leave this comment in the code
 to acknowledge its original source. If you feel like it, I enjoy hearing about projects that use my code,
 but don't feel like you have to let me know or ask permission.
*/

import { Expression } from "./expression";
import { Parser } from "./parser";

export { Expression, Parser };
export { Instruction } from "./instruction";
export type {
  Value,
  ValueObject,
  InstructionType,
  InstructionValue,
  ExpressionFunc,
} from "./instruction";

// Backwards compatibility
export default { Parser, Expression };
