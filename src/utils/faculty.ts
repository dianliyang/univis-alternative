const FACULTY_LABELS: Record<string, string> = {
  theol: "Theology",
  rechts: "Law",
  wirtsc: "Business, Economics and Social Sciences",
  medizi: "Medicine",
  philos: "Humanities",
  mathe: "Mathematics and Natural Sciences",
  agrar: "Agricultural and Nutritional Sciences",
  techn: "Engineering",
  profil: "Profiles and Interdisciplinary",
  zentra: "Central Facilities",
  lehrve: "Teacher Education",
  lehra: "Teacher Training",
  gemei: "Shared Programs",
  klinik: "Medicine"
};

export function deriveFacultyFromSourceUrl(sourceUrl: string): { code: string; label: string } | null {
  const url = new URL(sourceUrl);
  const tdir = url.searchParams.get("tdir") ?? "";
  const lvs = url.searchParams.get("lvs") ?? "";
  const rawCode = (tdir.split("/").filter(Boolean)[0] || lvs.split("/").filter(Boolean)[0] || "").trim();
  if (!rawCode) {
    return null;
  }

  return {
    code: rawCode,
    label: FACULTY_LABELS[rawCode] ?? rawCode
  };
}
