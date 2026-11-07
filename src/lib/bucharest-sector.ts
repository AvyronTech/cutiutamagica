function place(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function isBucharest(city: string, county: string): boolean {
  const values = [place(city), place(county)];
  return values.some(
    (value) =>
      value === "bucuresti" ||
      value === "municipiul bucuresti" ||
      /^sector(?:ul)? [1-6](?:,? bucuresti)?$/.test(value),
  );
}

export function sectorFromPostalCode(postalCode: string): number {
  return /^0[1-6]\d{4}$/.test(postalCode.trim()) ? Number(postalCode.trim()[1]) : 0;
}

export function deliverySector(
  city: string,
  county: string,
  chosenSector: number,
  postalCode: string,
): number {
  if (!isBucharest(city, county)) return 0;
  return chosenSector || sectorFromPostalCode(postalCode);
}
