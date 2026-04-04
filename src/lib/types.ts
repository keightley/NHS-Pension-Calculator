export type LegacyScheme = '1995' | '2008';
export type SchemeType = '1995' | '2008' | '2015';
export interface PartTimePeriod { id: string; startDate: string; endDate: string; fteProportion: number; }
export interface PensionInputs {
  dateOfBirth: string; name: string; dateJoinedScheme: string; legacyScheme: LegacyScheme;
  retirementDate: string; currentPay: number; legacyDrawAge: number; careDrawAge: number;
  remedyChoice: 'legacy' | 'care'; commutationPercent: number;
  transferInYears: number; transferInDays: number;
  useAbsData: boolean; absDate: string; absLegacyPension: number; absLegacyLumpSum: number; absCarePension: number;
  isPartTime: boolean; currentFteProportion: number; partTimePeriods: PartTimePeriod[];
  assumedCpi: number; useHistoricalCpi: boolean; careRevaluation: number;
  additionalPensionAmount: number; errboYears: number; addedYears: number; addedDays: number;
  showNominal: boolean;
}
export interface ProtectionStatus { status: 'full' | 'tapered' | 'none'; taperEndDate: Date | null; careStartDate: Date; }
export interface SalaryBasis { label: string; growthRate: number; }
export interface LegacyResult { pension: number; lumpSum: number; service: number; projectedPay: number; erf: number; lumpSumErf: number; }
export interface CAREResult { pension: number; accruedPast: number; projectedFuture: number; erf: number; }
export interface CommutationResult { maxCommutablePension: number; maxLumpSum: number; postCommutationPension: number; commutationFactor: number; }
export interface RemedyResult {
  legacyOption: { pension: number; lumpSum: number }; careOption: { pension: number; lumpSum: number };
  betterOption: 'legacy' | 'care';
  totalWithLegacyRemedy: { pension: number; lumpSum: number }; totalWithCareRemedy: { pension: number; lumpSum: number };
  difference: number;
}
export interface FlexibilitiesResult {
  additionalPension: { addedPension: number; grossCost: number; netCost: number };
  errbo: { yearsReduced: number; effectiveNPA: number; grossAnnualCost: number; netAnnualCost: number };
  addedYears: { addedService: number; addedPension: number; addedLumpSum: number };
}
export interface SurvivorResult { legacyPension: number; carePension: number; total: number; }
export interface SingleBasisResult {
  legacy: LegacyResult; care: CAREResult; remedy: RemedyResult;
  commutationLegacy: CommutationResult; commutationCare: CommutationResult;
  flexibilities: FlexibilitiesResult; survivor: SurvivorResult;
  totalPension: number; totalPensionAfterCommutation: number; totalLumpSum: number;
}
export interface ChosenResult {
  pension: number; lumpSum: number; monthlyPension: number;
  components: { label: string; pension: number; lumpSum: number; factor: number; drawAge: number; highlight?: 'legacy' | 'care'; }[];
}
export interface PensionResults {
  protectionStatus: ProtectionStatus; spa: number; spaDate: Date;
  retirementAge: number; ageAtRetirement: { years: number; months: number }; legacyDrawAge: { years: number; months: number }; careDrawAge: { years: number; months: number };
  legacyNPA: number; totalService: number;
  low: SingleBasisResult; mid: SingleBasisResult; high: SingleBasisResult;
  absCheck: { nextAbsDate: string; projectedLegacyPension: number; projectedLegacyLumpSum: number; projectedCarePension: number; } | null;
}
export const DEFAULT_INPUTS: PensionInputs = {
  dateOfBirth: '1980-06-15', name: '', dateJoinedScheme: '2005-08-01', legacyScheme: '1995',
  retirementDate: '2040-06-15', currentPay: 55000, legacyDrawAge: 60, careDrawAge: 68,
  remedyChoice: 'legacy', commutationPercent: 100,
  transferInYears: 0, transferInDays: 0,
  useAbsData: false, absDate: '', absLegacyPension: 0, absLegacyLumpSum: 0, absCarePension: 0,
  isPartTime: false, currentFteProportion: 1, partTimePeriods: [],
  assumedCpi: 2.0, useHistoricalCpi: true, careRevaluation: 3.5,
  additionalPensionAmount: 0, errboYears: 0, addedYears: 0, addedDays: 0, showNominal: false,
};
