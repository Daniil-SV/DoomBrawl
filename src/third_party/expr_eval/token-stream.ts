import { Parser } from "./parser";
import {
  Token,
  TEOF,
  TOP,
  TNUMBER,
  TSTRING,
  TPAREN,
  TBRACKET,
  TCOMMA,
  TNAME,
  TSEMICOLON,
  TokenType,
  TokenValue,
} from "./token";

function isHex4(s: string): boolean {
  if (s.length !== 4) return false;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    const isDigit = c >= 48 && c <= 57;
    const isUpper = c >= 65 && c <= 70;
    const isLower = c >= 97 && c <= 102;
    if (!isDigit && !isUpper && !isLower) return false;
  }
  return true;
}

function isHexDigit(c: string): boolean {
  const code = c.charCodeAt(0);
  return (
    (code >= 48 && code <= 57) ||
    (code >= 65 && code <= 70) ||
    (code >= 97 && code <= 102)
  );
}

export default class TokenStream {
  pos: number = 0;
  savedPosition: number = 0;
  savedCurrent?: Token;
  current?: Token;

  constructor(
    private parser: Parser,
    private expression: string,
  ) {}

  public get unaryOps() {
    return this.parser.unaryOps;
  }

  public get binaryOps() {
    return this.parser.binaryOps;
  }

  public get ternaryOps() {
    return this.parser.ternaryOps;
  }

  public get consts() {
    return this.parser.consts;
  }

  public get functions() {
    return this.parser.functions;
  }

  public get options() {
    return this.parser.options;
  }

  newToken(type: TokenType, value: TokenValue, pos: number | null = null) {
    return new Token(type, value, pos != null ? pos : this.pos);
  }

  save() {
    this.savedPosition = this.pos;
    this.savedCurrent = this.current;
  }

  restore() {
    this.pos = this.savedPosition;
    this.current = this.savedCurrent;
  }

  next(): Token {
    if (this.pos >= this.expression.length) {
      return this.newToken(TEOF, "EOF");
    }

    if (this.isWhitespace() || this.isComment()) {
      return this.next();
    } else if (
      this.isRadixInteger() ||
      this.isNumber() ||
      this.isOperator() ||
      this.isString() ||
      this.isParen() ||
      this.isBracket() ||
      this.isComma() ||
      this.isSemicolon() ||
      this.isNamedOp() ||
      this.isConst() ||
      this.isName()
    ) {
      return this.current!;
    } else {
      throw this.parseError(
        'Unknown character "' + this.expression.charAt(this.pos) + '"',
      );
    }
  }

  isWhitespace() {
    let r = false;
    let c = this.expression.charAt(this.pos);
    while (c === " " || c === "\t" || c === "\n" || c === "\r") {
      r = true;
      this.pos++;
      if (this.pos >= this.expression.length) {
        break;
      }
      c = this.expression.charAt(this.pos);
    }
    return r;
  }

  isComment() {
    const c = this.expression.charAt(this.pos);
    if (c === "/" && this.expression.charAt(this.pos + 1) === "*") {
      this.pos = this.expression.indexOf("*/", this.pos) + 2;
      if (this.pos === 1) {
        this.pos = this.expression.length;
      }
      return true;
    }
    return false;
  }

  isRadixInteger() {
    let pos = this.pos;

    if (
      pos >= this.expression.length - 2 ||
      this.expression.charAt(pos) !== "0"
    ) {
      return false;
    }
    ++pos;

    let radix;
    let validDigit;
    if (this.expression.charAt(pos) === "x") {
      radix = 16;
      validDigit = (c: string) => isHexDigit(c);
      ++pos;
    } else if (this.expression.charAt(pos) === "b") {
      radix = 2;
      validDigit = (c: string) => c === "0" || c === "1";
      ++pos;
    } else {
      return false;
    }

    let valid = false;
    const startPos = pos;

    while (pos < this.expression.length) {
      const c = this.expression.charAt(pos);
      if (validDigit(c)) {
        pos++;
        valid = true;
      } else {
        break;
      }
    }
    if (valid) {
      this.current = this.newToken(
        TNUMBER,
        parseInt(this.expression.substring(startPos, pos), radix),
      );
      this.pos = pos;
    }
    return valid;
  }

  isNumber() {
    let valid = false;
    let pos = this.pos;
    const startPos = pos;
    let resetPos = pos;
    let foundDot = false;
    let foundDigits = false;
    let c = this.expression.charAt(pos);

    while (pos < this.expression.length) {
      c = this.expression.charAt(pos);
      if ((c >= "0" && c <= "9") || (!foundDot && c === ".")) {
        if (c === ".") {
          foundDot = true;
        } else {
          foundDigits = true;
        }
        pos++;
        valid = foundDigits;
      } else {
        break;
      }
    }

    if (valid) {
      resetPos = pos;
    }

    if (c === "e" || c === "E") {
      pos++;
      let acceptSign = true;
      let validExponent = false;
      while (pos < this.expression.length) {
        c = this.expression.charAt(pos);
        if (acceptSign && (c === "+" || c === "-")) {
          acceptSign = false;
        } else if (c >= "0" && c <= "9") {
          validExponent = true;
          acceptSign = false;
        } else {
          break;
        }
        pos++;
      }

      if (!validExponent) {
        pos = resetPos;
      }
    }

    if (valid) {
      this.current = this.newToken(
        TNUMBER,
        parseFloat(this.expression.substring(startPos, pos)),
      );
      this.pos = pos;
    } else {
      this.pos = resetPos;
    }
    return valid;
  }

  isOperator() {
    const startPos = this.pos;
    const c = this.expression.charAt(this.pos);

    if (
      c === "+" ||
      c === "-" ||
      c === "*" ||
      c === "/" ||
      c === "%" ||
      c === "^" ||
      c === "?" ||
      c === ":" ||
      c === "."
    ) {
      this.current = this.newToken(TOP, c);
    } else if (c === "∙" || c === "•") {
      this.current = this.newToken(TOP, "*");
    } else if (c === ">") {
      if (this.expression.charAt(this.pos + 1) === "=") {
        this.current = this.newToken(TOP, ">=");
        this.pos++;
      } else {
        this.current = this.newToken(TOP, ">");
      }
    } else if (c === "<") {
      if (this.expression.charAt(this.pos + 1) === "=") {
        this.current = this.newToken(TOP, "<=");
        this.pos++;
      } else {
        this.current = this.newToken(TOP, "<");
      }
    } else if (c === "|") {
      if (this.expression.charAt(this.pos + 1) === "|") {
        this.current = this.newToken(TOP, "||");
        this.pos++;
      } else {
        return false;
      }
    } else if (c === "=") {
      if (this.expression.charAt(this.pos + 1) === "=") {
        this.current = this.newToken(TOP, "==");
        this.pos++;
      } else {
        this.current = this.newToken(TOP, c);
      }
    } else if (c === "!") {
      if (this.expression.charAt(this.pos + 1) === "=") {
        this.current = this.newToken(TOP, "!=");
        this.pos++;
      } else {
        this.current = this.newToken(TOP, c);
      }
    } else {
      return false;
    }
    this.pos++;

    // I guess it's a string in this case?? (unsure after implementing typescript)
    const operator = this.current.value as string;
    if (this.isOperatorEnabled(operator)) {
      return true;
    } else {
      this.pos = startPos;
      return false;
    }
  }

  isString() {
    let r = false;
    const startPos = this.pos;
    const quote = this.expression.charAt(startPos);

    if (quote === "'" || quote === '"') {
      let index = this.expression.indexOf(quote, startPos + 1);
      while (index >= 0 && this.pos < this.expression.length) {
        this.pos = index + 1;
        if (this.expression.charAt(index - 1) !== "\\") {
          const rawString = this.expression.substring(startPos + 1, index);
          this.current = this.newToken(
            TSTRING,
            this.unescape(rawString),
            startPos,
          );
          r = true;
          break;
        }
        index = this.expression.indexOf(quote, index + 1);
      }
    }
    return r;
  }

  isParen() {
    const c = this.expression.charAt(this.pos);
    if (c === "(" || c === ")") {
      this.current = this.newToken(TPAREN, c);
      this.pos++;
      return true;
    }
    return false;
  }

  isBracket() {
    const c = this.expression.charAt(this.pos);
    if ((c === "[" || c === "]") && this.isOperatorEnabled("[")) {
      this.current = this.newToken(TBRACKET, c);
      this.pos++;
      return true;
    }
    return false;
  }

  isComma() {
    const c = this.expression.charAt(this.pos);
    if (c === ",") {
      this.current = this.newToken(TCOMMA, ",");
      this.pos++;
      return true;
    }
    return false;
  }

  isSemicolon() {
    const c = this.expression.charAt(this.pos);
    if (c === ";") {
      this.current = this.newToken(TSEMICOLON, ";");
      this.pos++;
      return true;
    }
    return false;
  }

  isNamedOp() {
    const startPos = this.pos;
    let i = startPos;
    for (; i < this.expression.length; i++) {
      const c = this.expression.charAt(i);
      if (c.toUpperCase() === c.toLowerCase()) {
        if (i === this.pos || (c !== "_" && (c < "0" || c > "9"))) {
          break;
        }
      }
    }
    if (i > startPos) {
      const str = this.expression.substring(startPos, i);
      if (
        this.isOperatorEnabled(str) &&
        (str in this.parser.binaryOps ||
          str in this.parser.unaryOps ||
          str in this.parser.ternaryOps)
      ) {
        this.current = this.newToken(TOP, str);
        this.pos += str.length;
        return true;
      }
    }
    return false;
  }

  isConst() {
    const startPos = this.pos;
    let i = startPos;
    for (; i < this.expression.length; i++) {
      const c = this.expression.charAt(i);
      if (c.toUpperCase() === c.toLowerCase()) {
        if (
          i === this.pos ||
          (c !== "_" && c !== "." && (c < "0" || c > "9"))
        ) {
          break;
        }
      }
    }
    if (i > startPos) {
      const str = this.expression.substring(startPos, i);
      if (str in this.parser.consts) {
        this.current = this.newToken(
          TNUMBER,
          this.parser.consts[str as keyof typeof this.parser.consts],
        );
        this.pos += str.length;
        return true;
      }
    }
    return false;
  }

  isName() {
    const startPos = this.pos;
    let i = startPos;
    let hasLetter = false;
    for (; i < this.expression.length; i++) {
      const c = this.expression.charAt(i);
      if (c.toUpperCase() === c.toLowerCase()) {
        if (i === this.pos && (c === "$" || c === "_")) {
          if (c === "_") {
            hasLetter = true;
          }
          continue;
        } else if (
          i === this.pos ||
          !hasLetter ||
          (c !== "_" && (c < "0" || c > "9"))
        ) {
          break;
        }
      } else {
        hasLetter = true;
      }
    }
    if (hasLetter) {
      const str = this.expression.substring(startPos, i);
      this.current = this.newToken(TNAME, str);
      this.pos += str.length;
      return true;
    }
    return false;
  }

  unescape(v: string) {
    let index = v.indexOf("\\");
    if (index < 0) {
      return v;
    }

    let buffer = v.substring(0, index);
    while (index >= 0) {
      const c = v.charAt(++index);
      switch (c) {
        case "'":
          buffer += "'";
          break;
        case '"':
          buffer += '"';
          break;
        case "\\":
          buffer += "\\";
          break;
        case "/":
          buffer += "/";
          break;
        case "b":
          buffer += "\b";
          break;
        case "f":
          buffer += "\f";
          break;
        case "n":
          buffer += "\n";
          break;
        case "r":
          buffer += "\r";
          break;
        case "t":
          buffer += "\t";
          break;
        case "u": {
          // interpret the following 4 characters as the hex of the unicode code point
          const codePoint = v.substring(index + 1, index + 5);
          if (!isHex4(codePoint)) {
            throw this.parseError("Illegal escape sequence: \\u" + codePoint);
          }
          buffer += String.fromCharCode(parseInt(codePoint, 16));
          index += 4;
          break;
        }
        default:
          throw this.parseError('Illegal escape sequence: "\\' + c + '"');
      }
      ++index;
      const backslash = v.indexOf("\\", index);
      buffer += v.substring(index, backslash < 0 ? v.length : backslash);
      index = backslash;
    }
    return buffer;
  }

  parseError(msg: string): Error {
    const coords = this.getCoordinates();
    return new Error(
      "parse error [" + coords.line + ":" + coords.column + "]: " + msg,
    );
  }

  getCoordinates() {
    let line = 0;
    let column;
    let newline = -1;
    do {
      line++;
      column = this.pos - newline;
      newline = this.expression.indexOf("\n", newline + 1);
    } while (newline >= 0 && newline < this.pos);
    return { line, column };
  }

  isOperatorEnabled(op: string) {
    return this.parser.isOperatorEnabled(op);
  }
}
