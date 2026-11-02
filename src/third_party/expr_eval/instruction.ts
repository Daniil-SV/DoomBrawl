export const INUMBER = "INUMBER" as const;
export const IOP1 = "IOP1" as const;
export const IOP2 = "IOP2" as const;
export const IOP3 = "IOP3" as const;
export const IVAR = "IVAR" as const;
export const IVARNAME = "IVARNAME" as const;
export const IFUNCALL = "IFUNCALL" as const;
export const IFUNDEF = "IFUNDEF" as const;
export const IEXPR = "IEXPR" as const;
export const IEXPREVAL = "IEXPREVAL" as const;
export const IMEMBER = "IMEMBER" as const;
export const IENDSTATEMENT = "IENDSTATEMENT" as const;
export const IARRAY = "IARRAY" as const;

export type InstructionType =
  | typeof INUMBER
  | typeof IOP1
  | typeof IOP2
  | typeof IOP3
  | typeof IVAR
  | typeof IVARNAME
  | typeof IFUNCALL
  | typeof IFUNDEF
  | typeof IEXPR
  | typeof IEXPREVAL
  | typeof IMEMBER
  | typeof IENDSTATEMENT
  | typeof IARRAY;

export type InstructionValue =
  string | number | boolean | Array<unknown> | unknown | null | undefined;

type Primitive = string | number | boolean | null | undefined;

type ValueBase = Primitive | ValueObject | ValueArray | ExpressionFunc;
export type ValueObject = { [key: string]: ValueBase };
type ValueArray = ValueBase[];
export type ExpressionFunc = (...args: never[]) => Value | Promise<Value>;

export type Value = ValueBase | ExpressionFunc | Instruction | Instruction[];

export class Instruction<TValue extends Value = Value> {
  constructor(
    public type: InstructionType,
    public value?: TValue,
  ) {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-expect-error
    this.value = value !== undefined && value !== null ? value : 0;
  }
  toString() {
    switch (this.type) {
      case INUMBER:
      case IOP1:
      case IOP2:
      case IOP3:
      case IVAR:
      case IVARNAME:
      case IENDSTATEMENT:
        return this.value;
      case IFUNCALL:
        return "CALL " + this.value;
      case IFUNDEF:
        return "DEF " + this.value;
      case IARRAY:
        return "ARRAY " + this.value;
      case IMEMBER:
        return "." + this.value;
      default:
        return "Invalid Instruction";
    }
  }
}

export function unaryInstruction(value: Value) {
  return new Instruction(IOP1, value);
}

export function binaryInstruction(value: Value) {
  return new Instruction(IOP2, value);
}

export function ternaryInstruction(value: Value) {
  return new Instruction(IOP3, value);
}
