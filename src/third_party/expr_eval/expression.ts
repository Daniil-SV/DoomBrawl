import simplify from "./simplify";
import substitute from "./substitute";
import evaluate from "./evaluate";
import expressionToString from "./expression-to-string";
import getSymbols from "./get-symbols";
import { Parser } from "./parser";
import { Instruction, Value, ValueObject } from "./instruction";

export class Expression {
  public get unaryOps() {
    return this.parser.unaryOps;
  }
  public get binaryOps() {
    return this.parser.binaryOps;
  }
  public get ternaryOps() {
    return this.parser.ternaryOps;
  }
  public get functions() {
    return this.parser.functions;
  }
  constructor(
    public tokens: Instruction[],
    public parser: Parser,
  ) {}

  simplify(values: ValueObject = {}): Expression {
    return new Expression(
      simplify(
        this.tokens,
        this.unaryOps,
        this.binaryOps,
        this.ternaryOps,
        values ?? {},
      ),
      this.parser,
    );
  }

  substitute(variable: string, expr: Expression | string | number): Expression {
    if (!(expr instanceof Expression)) {
      expr = this.parser.parse(String(expr));
    }

    return new Expression(substitute(this.tokens, variable, expr), this.parser);
  }

  evaluate(values: ValueObject = {}): Value {
    return evaluate(this.tokens, this, values);
  }

  toString(): string {
    return expressionToString(this.tokens, false);
  }

  symbols(options?: { withMembers?: boolean }): string[] {
    const variables: string[] = [];
    getSymbols(this.tokens, variables, options ?? {});
    return variables;
  }

  variables(options?: { withMembers?: boolean }): string[] {
    const variables: string[] = [];
    getSymbols(this.tokens, variables, options ?? {});
    const functions = this.functions;
    return variables.filter(function (name) {
      return !(name in functions);
    });
  }

  toJSFunction(
    param?: string,
    variables?: ValueObject,
  ): (...args: Value[]) => Value {
    const f = new Function(
      param as string,
      "with(this.functions) with (this.ternaryOps) with (this.binaryOps) with (this.unaryOps) { return " +
        expressionToString(this.simplify(variables).tokens, true) +
        "; }",
    );
    return (...args: Value[]) => f.apply(this, args);
  }
}
