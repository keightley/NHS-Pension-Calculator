// State Pension Age lookup by date of birth
export function lookupSPA(dob: Date): number {
  const d = dob.getTime();
  const date = (y: number, m: number, dd: number) => new Date(y, m - 1, dd).getTime();
  if (d <= date(1954, 3, 5)) return 65;
  if (d <= date(1960, 9, 5)) return 66;
  if (d <= date(1977, 9, 5)) return 67;
  return 68;
}

export function getSPADate(dob: Date): Date {
  const spa = lookupSPA(dob);
  return new Date(dob.getFullYear() + spa, dob.getMonth(), dob.getDate());
}

// Historical CPI (September index, used for following April revaluation)
export const HISTORICAL_CPI: Record<number, number> = {
  2015: -0.1, 2016: 1.0, 2017: 3.0, 2018: 2.4, 2019: 1.7,
  2020: 0.5, 2021: 3.1, 2022: 10.1, 2023: 6.7, 2024: 1.7, 2025: 2.0,
};

export function getCPI(year: number, useHistorical: boolean, assumedCpi: number): number {
  if (useHistorical && HISTORICAL_CPI[year] !== undefined) {
    return HISTORICAL_CPI[year];
  }
  return assumedCpi;
}

// Scottish Income Tax Bands 2025-26
export interface TaxBand {
  name: string;
  rate: number;
  from: number;
  to: number;
}

export const SCOTTISH_TAX_BANDS: TaxBand[] = [
  { name: 'Personal Allowance', rate: 0, from: 0, to: 12570 },
  { name: 'Starter', rate: 0.19, from: 12571, to: 14876 },
  { name: 'Basic', rate: 0.20, from: 14877, to: 26561 },
  { name: 'Intermediate', rate: 0.21, from: 26562, to: 43662 },
  { name: 'Higher', rate: 0.42, from: 43663, to: 75000 },
  { name: 'Advanced', rate: 0.45, from: 75001, to: 125140 },
  { name: 'Top', rate: 0.48, from: 125141, to: Infinity },
];

export const TAX_DATA_VERSION = '2025-26';

export interface TaxBreakdown {
  gross: number;
  bands: { name: string; rate: number; taxable: number; tax: number }[];
  totalTax: number;
  net: number;
  monthlyNet: number;
}

export function calculateScottishTax(grossIncome: number): TaxBreakdown {
  // Personal allowance taper above £100,000
  let personalAllowance = 12570;
  if (grossIncome > 100000) {
    personalAllowance = Math.max(0, personalAllowance - Math.floor((grossIncome - 100000) / 2));
  }

  const bands: TaxBreakdown['bands'] = [];
  let remaining = grossIncome;
  let totalTax = 0;

  const adjustedBands = [...SCOTTISH_TAX_BANDS];
  adjustedBands[0] = { ...adjustedBands[0], to: personalAllowance };
  if (personalAllowance < 12570) {
    adjustedBands[1] = { ...adjustedBands[1], from: personalAllowance + 1 };
  }

  for (const band of adjustedBands) {
    if (remaining <= 0) break;
    const bandWidth = band.to === Infinity ? remaining : band.to - band.from + 1;
    const taxable = Math.min(remaining, bandWidth);
    if (grossIncome >= band.from) {
      const tax = taxable * band.rate;
      bands.push({ name: band.name, rate: band.rate, taxable, tax });
      totalTax += tax;
      remaining -= taxable;
    }
  }

  const net = grossIncome - totalTax;
  return { gross: grossIncome, bands, totalTax, net, monthlyNet: net / 12 };
}
