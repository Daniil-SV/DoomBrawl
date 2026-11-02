import {
  INUMBER,
  IOP1,
  IOP2,
  IOP3,
  IVAR,
  IVARNAME,
  IFUNCALL,
  IFUNDEF,
  IEXPR,
  IMEMBER,
  IENDSTATEMENT,
  IARRAY,
  Instruction,
} from "./instruction";

export default function expressionToString(
  tokens: Instruction[],
  toJS?: boolean,
): string {
  let nstack: string[] = [];
  let n1: string, n2: string, n3: string;
  let f: string, args: string[], argCount: number;
  for (let i = 0; i < tokens.length; i++) {
    const item = tokens[i];
    const type = item.type;
    if (type === INUMBER) {
      if (typeof item.value === "number" && item.value < 0) {
        nstack.push("(" + item.value + ")");
      } else if (Array.isArray(item.value)) {
        nstack.push("[" + item.value.map(escapeValue).join(", ") + "]");
      } else {
        nstack.push(escapeValue(item.value));
      }
    } else if (type === IOP2) {
      n2 = nstack.pop() as string;
      n1 = nstack.pop() as string;
      f = item.value as string;
      if (toJS) {
        if (f === "^") {
          nstack.push("Math.pow(" + n1 + ", " + n2 + ")");
        } else if (f === "and") {
          nstack.push("(!!" + n1 + " && !!" + n2 + ")");
        } else if (f === "or") {
          nstack.push("(!!" + n1 + " || !!" + n2 + ")");
        } else if (f === "||") {
          nstack.push(
            "(function(a,b){ return Array.isArray(a) && Array.isArray(b) ? a.concat(b) : String(a) + String(b); }((" +
              n1 +
              "),(" +
              n2 +
              ")))",
          );
        } else if (f === "==") {
          nstack.push("(" + n1 + " === " + n2 + ")");
        } else if (f === "!=") {
          nstack.push("(" + n1 + " !== " + n2 + ")");
        } else if (f === "[") {
          nstack.push(n1 + "[(" + n2 + ") | 0]");
        } else {
          nstack.push("(" + n1 + " " + f + " " + n2 + ")");
        }
      } else {
        if (f === "[") {
          nstack.push(n1 + "[" + n2 + "]");
        } else {
          nstack.push("(" + n1 + " " + f + " " + n2 + ")");
        }
      }
    } else if (type === IOP3) {
      n3 = nstack.pop() as string;
      n2 = nstack.pop() as string;
      n1 = nstack.pop() as string;
      f = item.value as string;
      if (f === "?") {
        nstack.push("(" + n1 + " ? " + n2 + " : " + n3 + ")");
      } else {
        throw new Error("invalid Expression");
      }
    } else if (type === IVAR || type === IVARNAME) {
      nstack.push(item.value as string);
    } else if (type === IOP1) {
      n1 = nstack.pop() as string;
      f = item.value as string;
      if (f === "-" || f === "+") {
        nstack.push("(" + f + n1 + ")");
      } else if (toJS) {
        if (f === "not") {
          nstack.push("(" + "!" + n1 + ")");
        } else if (f === "!") {
          nstack.push("fac(" + n1 + ")");
        } else {
          nstack.push(f + "(" + n1 + ")");
        }
      } else if (f === "!") {
        nstack.push("(" + n1 + "!)");
      } else {
        nstack.push("(" + f + " " + n1 + ")");
      }
    } else if (type === IFUNCALL) {
      argCount = item.value as number;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop() as string);
      }
      f = nstack.pop() as string;
      nstack.push(f + "(" + args.join(", ") + ")");
    } else if (type === IFUNDEF) {
      n2 = nstack.pop() as string;
      argCount = item.value as number;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop() as string);
      }
      n1 = nstack.pop() as string;
      if (toJS) {
        nstack.push(
          "(" +
            n1 +
            " = function(" +
            args.join(", ") +
            ") { return " +
            n2 +
            " })",
        );
      } else {
        nstack.push("(" + n1 + "(" + args.join(", ") + ") = " + n2 + ")");
      }
    } else if (type === IMEMBER) {
      n1 = nstack.pop() as string;
      nstack.push(n1 + "." + item.value);
    } else if (type === IARRAY) {
      argCount = item.value as number;
      args = [];
      while (argCount-- > 0) {
        args.unshift(nstack.pop() as string);
      }
      nstack.push("[" + args.join(", ") + "]");
    } else if (type === IEXPR) {
      nstack.push(
        "(" + expressionToString(item.value as Instruction[], toJS) + ")",
      );
    } else if (type === IENDSTATEMENT) {
      // eslint-disable no-empty
    } else {
      throw new Error("invalid Expression");
    }
  }
  if (nstack.length > 1) {
    if (toJS) {
      nstack = [nstack.join(",")];
    } else {
      nstack = [nstack.join(";")];
    }
  }
  return String(nstack[0]);
}

function escapeValue(v: unknown): string {
  if (typeof v === "string") {
    let s = v as string;
    s = s.split("\\").join("\\\\");
    s = s.split('"').join('\\"');
    s = s.split("\n").join("\\n");
    s = s.split("\r").join("\\r");
    s = s.split("\t").join("\\t");
    s = s.split("\u2028").join("\\u2028");
    s = s.split("\u2029").join("\\u2029");
    return '"' + s + '"';
  }
  return "" + (v as unknown);
}
