/** Only local SQLite schema identifiers enter generated SQL; never request parameters. */
const identifier = /^[a-z][a-z0-9_]*$/i;
export const authenticationColumn =
  /(?:password_(?:hash|salt)|(?:^|_)token_hash$|(?:^|_)ciphertext$|(?:^|_)secret$)/i;
export function backupColumns(ddl: string): string[] {
  const start = ddl.indexOf("("),
    end = ddl.lastIndexOf(")");
  if (start < 0 || end <= start) throw new Error("Unsupported backup schema.");
  const parts: string[] = [];
  let current = "",
    depth = 0,
    quote = "";
  const body = ddl.slice(start + 1, end);
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (quote) {
      current += c;
      if (c === quote) {
        if (body[i + 1] === quote) {
          current += body[++i];
        } else quote = "";
      }
      continue;
    }
    if (c === '"' || c === "'" || c === "`" || c === "[") {
      quote = c === "[" ? "]" : c;
      current += c;
      continue;
    }
    if (c === "(") depth++;
    if (c === ")") depth--;
    if (c === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
    } else current += c;
  }
  parts.push(current.trim());
  const columns = parts
    .filter((part) => !/^(?:CONSTRAINT|PRIMARY|FOREIGN|UNIQUE|CHECK)\b/i.test(part))
    .map((part) => part.match(/^["`[]?([a-z][a-z0-9_]*)["`\]]?\s+/i)?.[1] || "");
  if (!columns.length || columns.some((c) => !identifier.test(c)))
    throw new Error("Unsupported backup columns.");
  return columns;
}
export function backupTableQuery(table: string, columns: string[], limit: number) {
  if (
    !identifier.test(table) ||
    !columns.length ||
    columns.some((c) => !identifier.test(c)) ||
    !Number.isSafeInteger(limit) ||
    limit < 1 ||
    limit > 5001
  )
    throw new Error("Invalid backup projection.");
  // D1 permits 32 arguments/function: 15 pairs + the JSON document, including null values.
  let object = "json('{}')";
  for (let i = 0; i < columns.length; i += 15) {
    const group = columns.slice(i, i + 15);
    object = `json_set(${object},${group.map((c) => `'$.${c}',"${c}"`).join(",")})`;
  }
  return `SELECT '${table}' AS table_name,${object} AS row_json FROM (SELECT ${columns.map((c) => `"${c}"`).join(",")} FROM "${table}" LIMIT ${limit})`;
}
