import {
  TOP,
  TNUMBER,
  TSTRING,
  TPAREN,
  TBRACKET,
  TCOMMA,
  TNAME,
  TSEMICOLON,
  TEOF,
  Token,
  TokenType,
} from "./token";
import {
  Instruction,
  INUMBER,
  IVAR,
  IVARNAME,
  IFUNCALL,
  IFUNDEF,
  IEXPR,
  IMEMBER,
  IENDSTATEMENT,
  IARRAY,
  ternaryInstruction,
  binaryInstruction,
  unaryInstruction,
} from "./instruction";
import { Parser } from "./parser";
import TokenStream from "./token-stream";

type TokenMatcher =
  Token["value"] | Token["value"][] | ((token: Token) => boolean);

type ParserStateOptions = {
  allowMemberAccess?: boolean;
};
export class ParserState {
  current: Token | null = null;
  savedCurrent: Token | null = null;
  nextToken: Token | null = null;
  savedNextToken: Token | null = null;
  allowMemberAccess: boolean;

  constructor(
    public parser: Parser,
    public tokens: TokenStream,
    public options: ParserStateOptions,
  ) {
    this.allowMemberAccess = options.allowMemberAccess !== false;
    this.next();
  }

  next() {
    this.current = this.nextToken;
    return (this.nextToken = this.tokens.next());
  }

  tokenMatches(token: Token, value: TokenMatcher) {
    if (typeof value === "undefined") {
      return true;
    } else if (Array.isArray(value)) {
      return value.includes(token.value);
    } else if (typeof value === "function") {
      return value(token);
    } else {
      return token.value === value;
    }
  }

  save() {
    this.savedCurrent = this.current;
    this.savedNextToken = this.nextToken;
    this.tokens.save();
  }

  restore() {
    this.tokens.restore();
    this.current = this.savedCurrent;
    this.nextToken = this.savedNextToken;
  }

  accept(type: TokenType, value?: TokenMatcher) {
    if (
      this.nextToken?.type === type &&
      this.tokenMatches(this.nextToken, value)
    ) {
      this.next();
      return true;
    }
    return false;
  }

  expect(type: TokenType, value?: TokenMatcher) {
    if (!this.accept(type, value)) {
      const coords = this.tokens.getCoordinates();
      throw new Error(
        "parse error [" +
          coords.line +
          ":" +
          coords.column +
          "]: Expected " +
          (value || type),
      );
    }
  }

  parseAtom(instr: Instruction[]) {
    const unaryOps = this.tokens.unaryOps;
    function isPrefixOperator(token: Token) {
      return (token.value as string) in unaryOps;
    }

    if (this.accept(TNAME) || this.accept(TOP, isPrefixOperator)) {
      instr.push(new Instruction(IVAR, this.current!.value));
    } else if (this.accept(TNUMBER)) {
      instr.push(new Instruction(INUMBER, this.current!.value));
    } else if (this.accept(TSTRING)) {
      instr.push(new Instruction(INUMBER, this.current!.value));
    } else if (this.accept(TPAREN, "(")) {
      this.parseExpression(instr);
      this.expect(TPAREN, ")");
    } else if (this.accept(TBRACKET, "[")) {
      if (this.accept(TBRACKET, "]")) {
        instr.push(new Instruction(IARRAY, 0));
      } else {
        const argCount = this.parseArrayList(instr);
        instr.push(new Instruction(IARRAY, argCount));
      }
    } else {
      throw new Error("unexpected " + this.nextToken);
    }
  }

  parseExpression(instr: Instruction[]) {
    const exprInstr: Instruction[] = [];
    if (this.parseUntilEndStatement(instr, exprInstr)) {
      return;
    }
    this.parseVariableAssignmentExpression(exprInstr);
    if (this.parseUntilEndStatement(instr, exprInstr)) {
      return;
    }
    this.pushExpression(instr, exprInstr);
  }

  pushExpression(instr: Instruction[], exprInstr: Instruction[]) {
    for (let i = 0, len = exprInstr.length; i < len; i++) {
      instr.push(exprInstr[i]);
    }
  }
  parseUntilEndStatement(instr: Instruction[], exprInstr: Instruction[]) {
    if (!this.accept(TSEMICOLON)) return false;
    if (
      this.nextToken &&
      this.nextToken.type !== TEOF &&
      !(this.nextToken.type === TPAREN && this.nextToken.value === ")")
    ) {
      exprInstr.push(new Instruction(IENDSTATEMENT));
    }
    if (this.nextToken?.type !== TEOF) {
      this.parseExpression(exprInstr);
    }
    instr.push(new Instruction(IEXPR, exprInstr));
    return true;
  }

  parseArrayList(instr: Instruction[]) {
    let argCount = 0;

    while (!this.accept(TBRACKET, "]")) {
      this.parseExpression(instr);
      ++argCount;
      while (this.accept(TCOMMA)) {
        this.parseExpression(instr);
        ++argCount;
      }
    }

    return argCount;
  }

  parseVariableAssignmentExpression(instr: Instruction[]) {
    this.parseConditionalExpression(instr);
    while (this.accept(TOP, "=")) {
      const varName = instr.pop() as Instruction<number>;
      const varValue: Instruction[] = [];
      const lastInstrIndex = instr.length - 1;
      if (varName.type === IFUNCALL) {
        if (!this.tokens.isOperatorEnabled("()=")) {
          throw new Error("function definition is not permitted");
        }
        for (let i = 0, len = varName.value! + 1; i < len; i++) {
          const index = lastInstrIndex - i;
          if (instr[index].type === IVAR) {
            instr[index] = new Instruction(IVARNAME, instr[index].value);
          }
        }
        this.parseVariableAssignmentExpression(varValue);
        instr.push(new Instruction(IEXPR, varValue));
        instr.push(new Instruction(IFUNDEF, varName.value));
        continue;
      }
      if (varName.type !== IVAR && varName.type !== IMEMBER) {
        throw new Error("expected variable for assignment");
      }
      this.parseVariableAssignmentExpression(varValue);
      instr.push(new Instruction(IVARNAME, varName.value));
      instr.push(new Instruction(IEXPR, varValue));
      instr.push(binaryInstruction("="));
    }
  }
  parseConditionalExpression(instr: Instruction[]) {
    this.parseOrExpression(instr);
    while (this.accept(TOP, "?")) {
      const trueBranch: Instruction[] = [];
      const falseBranch: Instruction[] = [];
      this.parseConditionalExpression(trueBranch);
      this.expect(TOP, ":");
      this.parseConditionalExpression(falseBranch);
      instr.push(new Instruction(IEXPR, trueBranch));
      instr.push(new Instruction(IEXPR, falseBranch));
      instr.push(ternaryInstruction("?"));
    }
  }
  parseOrExpression(instr: Instruction[]) {
    this.parseAndExpression(instr);
    while (this.accept(TOP, "or")) {
      const falseBranch: Instruction[] = [];
      this.parseAndExpression(falseBranch);
      instr.push(new Instruction(IEXPR, falseBranch));
      instr.push(binaryInstruction("or"));
    }
  }
  parseAndExpression(instr: Instruction[]) {
    this.parseComparison(instr);
    while (this.accept(TOP, "and")) {
      const trueBranch: Instruction[] = [];
      this.parseComparison(trueBranch);
      instr.push(new Instruction(IEXPR, trueBranch));
      instr.push(binaryInstruction("and"));
    }
  }
  parseComparison(instr: Instruction[]) {
    this.parseAddSub(instr);
    while (this.accept(TOP, COMPARISON_OPERATORS)) {
      const op = this.current!;
      this.parseAddSub(instr);
      instr.push(binaryInstruction(op.value));
    }
  }
  parseAddSub(instr: Instruction[]) {
    this.parseTerm(instr);
    while (this.accept(TOP, ADD_SUB_OPERATORS)) {
      const op = this.current!;
      this.parseTerm(instr);
      instr.push(binaryInstruction(op.value));
    }
  }

  parseTerm(instr: Instruction[]) {
    this.parseFactor(instr);
    while (this.accept(TOP, TERM_OPERATORS)) {
      const op = this.current!;
      this.parseFactor(instr);
      instr.push(binaryInstruction(op.value));
    }
  }

  parseFactor(instr: Instruction[]) {
    const unaryOps = this.tokens.unaryOps;
    function isPrefixOperator(token: Token) {
      return (token.value as string) in unaryOps;
    }
    this.save();
    if (this.accept(TOP, isPrefixOperator)) {
      if (this.current!.value !== "-" && this.current!.value !== "+") {
        if (this.nextToken?.type === TPAREN && this.nextToken.value === "(") {
          this.restore();
          this.parseExponential(instr);
          return;
        } else if (
          this.nextToken?.type === TSEMICOLON ||
          this.nextToken?.type === TCOMMA ||
          this.nextToken?.type === TEOF ||
          (this.nextToken?.type === TPAREN && this.nextToken.value === ")")
        ) {
          this.restore();
          this.parseAtom(instr);
          return;
        }
      }
      const op = this.current!;
      this.parseFactor(instr);
      instr.push(unaryInstruction(op.value));
    } else {
      this.parseExponential(instr);
    }
  }

  parseExponential(instr: Instruction[]) {
    this.parsePostfixExpression(instr);
    while (this.accept(TOP, "^")) {
      this.parseFactor(instr);
      instr.push(binaryInstruction("^"));
    }
  }
  parsePostfixExpression(instr: Instruction[]) {
    this.parseFunctionCall(instr);
    while (this.accept(TOP, "!")) {
      instr.push(unaryInstruction("!"));
    }
  }

  parseFunctionCall(instr: Instruction[]) {
    const unaryOps = this.tokens.unaryOps;
    function isPrefixOperator(token: Token) {
      return (token.value as string) in unaryOps;
    }
    if (this.accept(TOP, isPrefixOperator)) {
      const op = this.current!;
      this.parseAtom(instr);
      instr.push(unaryInstruction(op.value));
    } else {
      this.parseMemberExpression(instr);
      while (this.accept(TPAREN, "(")) {
        if (this.accept(TPAREN, ")")) {
          instr.push(new Instruction(IFUNCALL, 0));
        } else {
          const argCount = this.parseArgumentList(instr);
          instr.push(new Instruction(IFUNCALL, argCount));
        }
      }
    }
  }

  parseArgumentList(instr: Instruction[]) {
    let argCount = 0;

    while (!this.accept(TPAREN, ")")) {
      this.parseExpression(instr);
      ++argCount;
      while (this.accept(TCOMMA)) {
        this.parseExpression(instr);
        ++argCount;
      }
    }
    return argCount;
  }

  parseMemberExpression(instr: Instruction[]) {
    this.parseAtom(instr);
    while (this.accept(TOP, ".") || this.accept(TBRACKET, "[")) {
      const op = this.current!;
      if (op.value === ".") {
        if (!this.allowMemberAccess) {
          throw new Error('unexpected ".", member access is not permitted');
        }
        this.expect(TNAME);
        instr.push(new Instruction(IMEMBER, this.current!.value));
      } else if (op.value === "[") {
        if (!this.tokens.isOperatorEnabled("[")) {
          throw new Error('unexpected "[]", arrays are disabled');
        }
        this.parseExpression(instr);
        this.expect(TBRACKET, "]");
        instr.push(binaryInstruction("["));
      } else {
        throw new Error("unexpected symbol: " + op.value);
      }
    }
  }
}

const COMPARISON_OPERATORS = ["==", "!=", "<", "<=", ">=", ">", "in"];

const ADD_SUB_OPERATORS = ["+", "-", "||"];

const TERM_OPERATORS = ["*", "/", "%"];
