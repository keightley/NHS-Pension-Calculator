export type LegacyScheme = '1995' | '2008';
export type SchemeType = '1995' | '2008' | '2015';

export interface PartTimePeriod {
  id: string;
  startDate: string; // ISO date
  endDate: string;
  fteProportion: number; // 0-1
}

export interface PensionInputs {
  // Personal details
  dateOfBirth: string;
  name: string;
  dateJoinedScheme: string;
  legacyScheme: LegacyScheme;
  retirementDate: string; // When you stop working
  currentPay: number; // FTE pensionable pay

  // Drawdown timing
  splitDrawdown: boolean; // Advanced: draw legacy and CARE at different ages
  legacyDrawDate: string; // When legacy pension starts (defaults to retirementDate)
  careDrawDate: string;   // When CARE pension starts (defaults to retirementDate)

  // Service & ABS
  transferInYears: number;
  transferInDays: number;
  useAbsData: boolean;
  absDate: string;
  absLegacyPension: number;
  absLegacyLumpSum: number;
  absCarePension: number;

  // Part-time
  isPartTime: boolean;
  currentFteProportion: number; // 0-1
  partTimePeriods: PartTimePeriod[];

  // Assumptions
  assumedCpi: number;
  useHistoricalCpi: boolean;
  careRevaluation: number; // CPI + 1.5% default

  // Flexibilities
  additionalPensionAmount: number;
  errboYears: number;
  addedYears: number;
  addedDays: number;

  // Display
  showNominal: boolean;
}

export interface ProtectionStatus {
  status: 'full' | 'tapered' | 'none';
  taperEndDate: Date | null;
  careStartDate: Date; // When member enters/entered CARE scheme
}

export interface SalaryBasis {
  label: string;
  growthRate: number; // e.g., 0.02 for CPI+0%, 0.03 for CPI+1%, 0.04 for CPI+2%
}

export interface LegacyResult {
  pension: number;
  lumpSum: number; // Automatic (1995) or 0 (2008)
  service: number; // years used
  projectedPay: number;
  erf: number;
  lumpSumErf: number;
}

export interface CAREResult {
  pension: number;
  accruedPast: number; // CARE accrued to date
  projectedFuture: number; // Future CARE to retirement
  erf: number;
}

export interface CommutationResult {
  maxCommutablePension: number;
  maxLumpSum: number;
  postCommutationPension: number;
  commutationFactor: number;
}

export interface RemedyResult {
  legacyOption: { pension: number; lumpSum: number };
  careOption: { pension: number; lumpSum: number };
  betterOption: 'legacy' | 'care';
  // Complete totals under each remedy choice
  totalWithLegacyRemedy: { pension: number; lumpSum: number };
  totalWithCareRemedy: { pension: number; lumpSum: number };
  difference: number; // positive = legacy better
}

export interface FlexibilitiesResult {
  additionalPension: { addedPension: number; grossCost: number; netCost: number };
  errbo: { yearsReduced: number; effectiveNPA: number; grossAnnualCost: number; netAnnualCost: number };
  addedYears: { addedService: number; addedPension: number; addedLumpSum: number };
}

export interface SurvivorResult {
  legacyPension: number;
  carePension: number;
  total: number;
}

export interface SingleBasisResult {
  legacy: LegacyResult;
  care: CAREResult;
  remedy: RemedyResult;
  commutationLegacy: CommutationResult;
  commutationCare: CommutationResult;
  flexibilities: FlexibilitiesResult;
  survivor: SurvivorResult;
  totalPension: number;
  totalPensionAfterCommutation: number;
  totalLumpSum: number;
}

export interface PensionResults {
  // Metadata
  protectionStatus: ProtectionStatus;
  spa: number;
  spaDate: Date;
  ageAtRetirement: { years: number; months: number };
  legacyDrawAge: { years: number; months: number };
  careDrawAge: { years: number; months: number };
  totalService: number;

  // Results for each salary growth basis
  low: SingleBasisResult;  // CPI + 0%
  mid: SingleBasisResult;  // CPI + 1%
  high: SingleBasisResult; // CPI + 2%

  // Deferred comparison (draw at NPA instead of retirement)
  deferredMid: SingleBasisResult | null; // null if already at NPA

  // ABS check
  absCheck: {
    nextAbsDate: string;
    projectedLegacyPension: number;
    projectedLegacyLumpSum: number;
    projectedCarePension: number;
  } | null;
}

export const DEFAULT_INPUTS: PensionInputs = {
  dateOfBirth: '1980-06-15',
  name: '',
  dateJoinedScheme: '2005-08-01',
  legacyScheme: '1995',
  retirementDate: '2047-06-15',
  currentPay: 55000,
  splitDrawdown: false,
  legacyDrawDate: '',
  careDrawDate: '',
  transferInYears: 0,
  transferInDays: 0,
  useAbsData: false,
  absDate: '',
  absLegacyPension: 0,
  absLegacyLumpSum: 0,
  absCarePension: 0,
  isPartTime: false,
  currentFteProportion: 1,
  partTimePeriods: [],
  assumedCpi: 2.0,
  useHistoricalCpi: true,
  careRevaluation: 3.5,
  additionalPensionAmount: 0,
  errboYears: 0,
  addedYears: 0,
  addedDays: 0,
  showNominal: false,
};
