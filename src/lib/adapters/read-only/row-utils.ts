export function normalizeSheetHeader(value: unknown) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

export function rowsToRecords<T extends Record<string, string>>(
  values: ReadonlyArray<ReadonlyArray<unknown>>,
  headerRow: number,
): T[] {
  if (headerRow < 1) throw new Error("headerRow must be 1-based and greater than zero.");
  const headerIndex = headerRow - 1;
  const headers = (values[headerIndex] ?? []).map(normalizeSheetHeader);
  if (!headers.some(Boolean)) return [];

  return values.slice(headerRow).flatMap((row) => {
    const record: Record<string, string> = {};
    let hasValue = false;

    headers.forEach((header, index) => {
      if (!header) return;
      const value = row[index];
      if (value === undefined || value === null || value === "") return;
      hasValue = true;
      record[header] = String(value);
    });

    return hasValue ? [record as T] : [];
  });
}
