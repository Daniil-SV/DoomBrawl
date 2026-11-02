import { Expression } from "./expression";
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
  IEXPREVAL,
  IMEMBER,
  IENDSTATEMENT,
  IARRAY,
  Instruction,
  Value,
  ValueObject,
} from "./instruction";

let functionCounter = 0;

/**
 * Checks if a function reference 'f' is explicitly allowed to be executed.
 * This logic is the core security allowance gate.
 */
function isAllowedFunc(f: () => unknown, expr: Expression): boolean {
  const maps = [
    expr.functions,
    expr.unaryOps,
    expr.ternaryOps,
    expr.binaryOps,
  ] as const;

  for (const m of maps) {
    for (const v of Object.values(m)) {
      if (v === f) return true;
    }
  }

  return false;
}

export type OpFunc = (...args: Value[]) => Value;
export class SecurityError extends Error {}
type StackType = Instruction | Instruction[] | OpFunc | Value;
function isDangerousName(value: string): boolean {
  return (
    value.startsWith("__proto__") ||
    value.indexOf("prototype") !== -1 ||
    value.endsWith("constructor")
  );
}

export default function evaluate(
  tokens: Instruction | Instruction[],
  expr: Expression,
  values: ValueObject,
): Value {
  const nstack: StackType[] = [];
  let n1: StackType, n2: StackType, n3: StackType;
  let f: OpFunc, args, argCount: number;

  if (isExpressionEvaluator(tokens)) {
    return resolveExpression(tokens, values);
  }

  tokens = tokens as Instruction[];

  for (let i = 0; i < tokens.length; i++) {
    const item = tokens[i];
    const type = item.type;
    if (type === INUMBER || type === IVARNAME) {
      nstack.push(item.value);
    } else if (type === IOP2) {
      n2 = nstack.pop() as Instruction;
      n1 = nstack.pop() as Instruction<number>;
      if (item.value === "and") {
        nstack.push(n1 ? !!evaluate(n2, expr, values) : false);
      } else if (item.value === "or") {
        nstack.push(n1 ? true : !!evaluate(n2, expr, values));
      } else if (item.value === "=") {
        f = expr.binaryOps[item.value] as OpFunc;
        nstack.push(f(n1, evaluate(n2, expr, values), values));
      } else {
        const lookup = item.value as keyof typeof expr.binaryOps;
        f = expr.binaryOps[lookup] as OpFunc;
        const v1 = resolveExpression(n1, values);
        const v2 = resolveExpression(n2, values);
        nstack.push(f(v1, v2));
      }
    } else if (type === IOP3) {
      n3 = nstack.pop() as Instruction<number>;
      n2 = nstack.pop() as Instruction<number>;
      n1 = nstack.pop() as Instruction<boolean>;
      if (item.value === "?") {
        nstack.push(evaluate(n1 ? n2 : n3, expr, values));
      } else {
        f = expr.ternaryOps[
          item.value as keyof typeof expr.ternaryOps
        ] as OpFunc;
        nstack.push(
          f(
            resolveExpression(n1, values),
            resolveExpression(n2, values),
            resolveExpression(n3, values),
          ),
        );
      }
    } else if (type === IVAR) {
      const strValue = item.value as string;
      if (isDangerousName(strValue)) {
        throw new SecurityError("prototype access detected");
      }
      if (strValue in expr.functions) {
        const lookup = item.value as keyof typeof expr.functions;
        nstack.push(expr.functions[lookup]);
      } else if (
        strValue in expr.unaryOps &&
        expr.parser.isOperatorEnabled(strValue)
      ) {
        const lookup = item.value as keyof typeof expr.unaryOps;
        nstack.push(expr.unaryOps[lookup]);
      } else {
        const v = values[strValue];

        if (v !== undefined) {
          if (typeof v === "function" && !isAllowedFunc(v, expr)) {
            /* function is not registered, not marked safe, and not a member function. BLOCKED. */
            throw new SecurityError(
              "Variable references an unallowed function: " + item.value,
            );
          }
          nstack.push(v);
        } else {
          throw new Error("undefined variable: " + item.value);
        }
      }
    } else if (type === IOP1) {
      n1 = nstack.pop() as Instruction<number>;
      const lookup = item.value as keyof typeof expr.unaryOps;
      f = expr.unaryOps[lookup] as OpFunc;
      nstack.push(f(resolveExpression(n1, values)));
    } else if (type === IFUNCALL) {
      argCount = item.value as number;
      args = [];
      while (argCount-- > 0) {
        const expr = nstack.pop() as Instruction<Instruction>;
        args.unshift(resolveExpression(expr, values));
      }
      f = nstack.pop() as OpFunc;
      if (!isAllowedFunc(f, expr)) {
        throw new SecurityError("Is not an allowed function.");
      }
      if (typeof f === "function") {
        nstack.push(f(...args));
      } else {
        throw new Error(f + " is not a function");
      }
    } else if (type === IFUNDEF) {
      // Create closure to keep references to arguments and expression
      const asd = (function () {
        const n2 = nstack.pop() as Instruction | Instruction[];
        const args: string[] = [];
        let argCount = item.value as number;
        while (argCount-- > 0) {
          const asdf = nstack.pop() as string;
          args.unshift(asdf);
        }
        const n1 = nstack.pop() as string;
        const f = function (...fArgs: string[]) {
          const scope = Object.assign({}, values);
          for (let i = 0, len = args.length; i < len; i++) {
            scope[args[i]] = fArgs[i];
          }
          return evaluate(n2, expr, scope);
        };
        const name = "lambda_" + functionCounter++;
        expr.functions[name] = f as OpFunc;
        values[n1] = f;
        return f;
      })();
      nstack.push(asd);
    } else if (type === IEXPR) {
      nstack.push(
        createExpressionEvaluator(item as Instruction<Instruction>, expr),
      );
    } else if (type === IEXPREVAL) {
      nstack.push(item);
    } else if (type === IMEMBER) {
      n1 = nstack.pop() as ValueObject;
      const lookup = item.value as keyof typeof n1;
      if (isDangerousName(item.value as string)) {
        throw new SecurityError("prototype access detected in MEMBER");
      }
      if (
        typeof n1 === "object" &&
        typeof n1[lookup] === "function" &&
        !isAllowedFunc(n1[lookup] as OpFunc, expr)
      ) {
        throw new SecurityError("Is not an allowed function in MEMBER.");
      }
      nstack.push(n1[lookup]);
    } else if (type === IENDSTATEMENT) {
      nstack.pop();
    } else if (type === IARRAY) {
      argCount = item.value as number;
      args = [] as string[];
      while (argCount-- > 0) {
        args.unshift(nstack.pop() as string);
      }
      nstack.push(args);
    } else {
      throw new Error("invalid Expression");
    }
  }
  if (nstack.length > 1) {
    throw new Error("invalid Expression (parity)");
  }
  // Explicitly return zero to avoid test issues caused by -0
  return nstack[0] === 0
    ? 0
    : resolveExpression(nstack[0] as ExprEvalInstruction, values);
}

function createExpressionEvaluator(
  token: Instruction<Instruction>,
  expr: Expression,
) {
  if (isExpressionEvaluator(token)) return token;
  return {
    type: IEXPREVAL,
    value: function (scope: ValueObject) {
      return evaluate(token.value!, expr, scope);
    },
  };
}

function isInstruction(n: Instruction | unknown): n is Instruction {
  return !!n && typeof n === "object" && "type" in n;
}

type ExprEvalInstruction = Instruction<(...args: ValueObject[]) => Value>;

function isExpressionEvaluator(
  n: ExprEvalInstruction | unknown,
): n is ExprEvalInstruction {
  return isInstruction(n) && n.type === IEXPREVAL;
}

function resolveExpression(
  n: ExprEvalInstruction | Value,
  values: ValueObject,
): Value {
  if (!isExpressionEvaluator(n)) return n;
  const fn = n.value!;
  return fn(values);
}
