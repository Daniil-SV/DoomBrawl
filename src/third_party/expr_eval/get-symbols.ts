import { IVAR, IMEMBER, IEXPR, IVARNAME, Instruction } from "./instruction";

type SymbolOptions = {
  withMembers?: boolean;
};
export default function getSymbols(
  tokens: Instruction[],
  symbols: string[],
  options: SymbolOptions,
) {
  options = options || {};
  const withMembers = !!options.withMembers;
  let prevVar: string | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const item = tokens[i];
    if (item.type === IVAR || item.type === IVARNAME) {
      const v = item.value as string;
      if (!withMembers && !symbols.includes(v)) {
        symbols.push(v);
      } else if (prevVar !== null) {
        if (!symbols.includes(prevVar)) {
          symbols.push(prevVar);
        }
        prevVar = v;
      } else {
        prevVar = v;
      }
    } else if (item.type === IMEMBER && withMembers && prevVar !== null) {
      prevVar += "." + item.value;
    } else if (item.type === IEXPR) {
      getSymbols(item.value as Instruction[], symbols, options);
    } else if (prevVar !== null) {
      if (!symbols.includes(prevVar)) {
        symbols.push(prevVar);
      }
      prevVar = null;
    }
  }

  if (prevVar !== null && !symbols.includes(prevVar)) {
    symbols.push(prevVar);
  }
}
