// Preferências locais do app de campo (por dispositivo, chave versionada).
// Não há ainda infraestrutura de preferências por usuário no backend; quando
// existir, estas funções devem passar a sincronizar com ele.

export type FieldFontSize = "small" | "normal" | "large" | "auto";

export const FONT_SIZE_VALUES: FieldFontSize[] = ["small", "normal", "large", "auto"];

const FONT_SIZE_KEY = "vertex-field-font-size.v1";

export function readFontSize(): FieldFontSize {
  if (typeof localStorage === "undefined") return "normal";
  try {
    const raw = localStorage.getItem(FONT_SIZE_KEY);
    return (FONT_SIZE_VALUES as string[]).includes(raw ?? "") ? (raw as FieldFontSize) : "normal";
  } catch {
    return "normal";
  }
}

export function writeFontSize(value: FieldFontSize) {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(FONT_SIZE_KEY, value);
  } catch {
    // storage indisponível (modo privado etc.) — preferência fica só em memória
  }
}

// Traduz "auto" para o tamanho efetivo; hoje "auto" acompanha o padrão do
// navegador (sem alterar a raiz), mas fica aqui para centralizar a regra.
export function resolveFontSizeClass(value: FieldFontSize): string | null {
  if (value === "small") return "field-font-small";
  if (value === "large") return "field-font-large";
  return null; // "normal" e "auto" não alteram a raiz
}

export function applyFontSize(value: FieldFontSize) {
  if (typeof document === "undefined") return;
  const cls = resolveFontSizeClass(value);
  document.documentElement.classList.toggle("field-font-small", cls === "field-font-small");
  document.documentElement.classList.toggle("field-font-large", cls === "field-font-large");
  document.body.classList.toggle("field-font-small", cls === "field-font-small");
  document.body.classList.toggle("field-font-large", cls === "field-font-large");
}
