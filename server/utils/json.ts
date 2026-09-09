export const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Parse JSON returned by an LLM, including responses wrapped in markdown or
 * truncated just before the final closing bracket.
 */
export function repairAndParseJSON(raw: string): unknown {
  let cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  const start = cleaned.search(/[\[{]/);
  if (start === -1) throw new Error("No JSON found");

  const isArray = cleaned[start] === "[";
  const end = isArray ? cleaned.lastIndexOf("]") : cleaned.lastIndexOf("}");
  cleaned = end === -1 || end <= start ? cleaned.substring(start) : cleaned.substring(start, end + 1);
  cleaned = cleaned
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]")
    .replace(/[\x00-\x1F\x7F]/g, (character) =>
      character === "\n" || character === "\t" ? character : "",
    )
    .replace(/\\(?!["\\/bfnrtu])/g, "\\\\");

  try {
    return JSON.parse(cleaned);
  } catch {
    // Continue with a best-effort repair for incomplete model responses.
  }

  let braces = 0;
  let brackets = 0;
  for (const character of cleaned) {
    if (character === "{") braces++;
    if (character === "}") braces--;
    if (character === "[") brackets++;
    if (character === "]") brackets--;
  }

  const inString = (cleaned.split('"').length - 1) % 2 === 1;
  if (inString) cleaned += '"';
  while (braces > 0) {
    cleaned += "}";
    braces--;
  }
  while (brackets > 0) {
    cleaned += "]";
    brackets--;
  }

  return JSON.parse(cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]"));
}
