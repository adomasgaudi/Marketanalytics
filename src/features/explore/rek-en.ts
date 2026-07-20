// Data-explorer LT→EN translation dictionaries, copied verbatim from the
// legacy dashboard (legacy-src/template.html — FIELD_EN / TAB_EN / RISK_EN /
// COL_EN). Field bases + tab names + risk values; unmapped labels fall back
// to Lithuanian. Free text (names, addresses, descriptions) and numbers are
// left as-is.

export const FIELD_EN: Record<string, string> = {
  Adresas: "Address",
  Ataskaita: "Report",
  "Atsiskaitomoji sąskaita": "Bank account",
  Bankas: "Bank",
  "Buhalterijos telefonas": "Accounting phone",
  "Darbo laikas": "Working hours",
  Darbuotojai: "Employees",
  Eksportas: "Export",
  "El. pašto adresas": "Email",
  "Facebook paskyra": "Facebook",
  Faksas: "Fax",
  "Instagram paskyra": "Instagram",
  "Kreditavimo rizika": "Credit risk",
  "Kredito rizika": "Credit risk",
  "LinkedIn paskyra": "LinkedIn",
  "Mobilus telefonas": "Mobile phone",
  "PVM mokėtojo kodas": "VAT payer code",
  Pardavimai: "Sales",
  Pavadinimas: "Name",
  Pranešimai: "Announcements",
  "Prekių ženklai": "Trademarks",
  "SODRA (VSDFV)": "Sodra (social insurance)",
  Telefonas: "Phone",
  "TikTok paskyra": "TikTok",
  Tinklalapis: "Website",
  Transportas: "Transport",
  Vadovas: "CEO",
  "Vadovo telefonas": "CEO phone",
  "Veiklos sritys": "Activities",
  "Vidutinis atlyginimas": "Average salary",
  "Įmonės amžius": "Company age",
  "Įmonės aprašymas": "Company description",
  "Įmonės kodas": "Company code",
  "Įstatinis kapitalas": "Share capital",
  Įvertinimas: "Rating",
  "Grynasis pelnas (grafikas)": "Net profit (chart)",
  "Grynasis pelnas (nuostoliai)": "Net profit (loss)",
  "Grynasis pelningumas": "Net profitability",
  "Ilgalaikis turtas": "Non-current assets",
  "Mokėtinos sumos ir įsipareigojimai": "Payables & liabilities",
  "Nuosavas kapitalas": "Equity",
  "Pardavimo pajamos": "Sales revenue",
  "Pardavimo pajamos (grafikas)": "Sales revenue (chart)",
  "Pelnas (nuostoliai) prieš mokesčius": "Profit (loss) before tax",
  "Pelnas prieš mokesčius (grafikas)": "Profit before tax (chart)",
  "Pelningumas prieš mokesčius": "Pre-tax profitability",
  "Trumpalaikis turtas": "Current assets",
  "Darbuotojų (apdraustųjų) skaičius": "Employees (insured)",
  "Darbuotojų skaičius (grafikas)": "Employee count (chart)",
  "Metinis darbuotojų vidurkis": "Annual average employees",
  "Kreditingumas (Juris LT)": "Creditworthiness (Juris LT)",
  "Registruotos skolos": "Registered debts",
  "Skola Sodrai": "Debt to Sodra",
  "Skola VMI": "Debt to tax authority (VMI)",
  "Skolų pokyčių įrašai": "Debt change records",
};

export const TAB_EN: Record<string, string> = {
  Įmonė: "Company",
  Finansai: "Financials",
  Darbuotojai: "Employees",
  Skolos: "Debts",
};

export const RISK_EN: Record<string, string> = {
  Žemiausia: "Lowest",
  "Labai žema": "Very low",
  Žema: "Low",
  Vidutinė: "Medium",
  Vidutiniška: "Medium",
  Aukšta: "High",
  "Labai aukšta": "Very high",
  Aukščiausia: "Highest",
};

export type RekLang = "lt" | "en";

/** Translate a field label: peel a trailing year/date suffix, map the base. */
export function tField(label: string, lang: RekLang): string {
  if (lang !== "en" || label == null) return label;
  const m = String(label).match(/^(.*?)(\s+\d{4}(?:-\d{2}(?:-\d{2})?)?)$/);
  const base = m ? m[1] : String(label);
  const suf = m ? m[2] : "";
  return (FIELD_EN[base] || base) + suf;
}

export function tTab(name: string, lang: RekLang): string {
  return lang === "en" ? TAB_EN[name] || name : name;
}
