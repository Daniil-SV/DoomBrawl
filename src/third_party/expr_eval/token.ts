export const TEOF = "TEOF" as const;
export const TOP = "TOP" as const;
export const TNUMBER = "TNUMBER" as const;
export const TSTRING = "TSTRING" as const;
export const TPAREN = "TPAREN" as const;
export const TBRACKET = "TBRACKET" as const;
export const TCOMMA = "TCOMMA" as const;
export const TNAME = "TNAME" as const;
export const TSEMICOLON = "TSEMICOLON" as const;

export type TokenType =
  | typeof TEOF
  | typeof TOP
  | typeof TNUMBER
  | typeof TSTRING
  | typeof TPAREN
  | typeof TBRACKET
  | typeof TCOMMA
  | typeof TNAME
  | typeof TSEMICOLON;

export type TokenValue = string | number | boolean | null | undefined;

export class Token {
  constructor(
    public readonly type: TokenType,
    public readonly value: TokenValue,
    public readonly index: number | undefined = undefined,
  ) {}

  toString() {
    return this.type + ": " + this.value;
  }
}
