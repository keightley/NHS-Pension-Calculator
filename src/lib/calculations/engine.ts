import type {
  PensionInputs, PensionResults, SingleBasisResult, SalaryBasis,
  LegacyResult, CAREResult, RemedyResult, CommutationResult,
  FlexibilitiesResult, SurvivorResult,
} from '../types';
import { parseDate, yearsBetween, ageInYearsAndMonths, schemeYear, roundPound } from '../utils';
import { calculateProtectionStatus, CARE_START_DATE, REMEDY_END_DATE } from './protection';
import { lookupSPA, getSPADate, getCPI } from '../data/spaAndTax';
import { lookupFactor, ERF1_1995_PENSION, ERF2_NPA65_PENSION, ERF7_1995_LUMPSUM, LRF1_2008_PENSION, ERF_2015_PENSION, LRF_2015_PENSION } from '../data/erfTables';
import { lookupCommutationFactor, LUMPSUM_FACTOR_1995 } from '../data/commutation';

export function calculatePension(inputs: PensionInputs): PensionResults | null {
  const dob = parseDate(inputs.dateOfBirth);
  const djs = parseDate(inputs.dateJoinedScheme);
  const retDate = parseDate(inputs.retirementDate);
  const today = new Date();

  if (retDate <= today || dob >= today) return null;

  // Core dates and ages
  const spa = lookupSPA(dob);
  const spaDate = getSPADate(dob);
  const ageAtRet = ageInYearsAndMonths(dob, retDate);
  const retAge = yearsBetween(dob, retDate);

  // Protection status
  const protection = calculateProtectionStatus(dob, djs, inputs.legacyScheme);

  // Service calculations
  const totalCalendarService = yearsBetween(djs, retDate);
  const transferIn = inputs.transferInYears + inputs.transferInDays / 365.25;
  const addedYearsService = inputs.addedYears + inputs.addedDays / 365.25;

  // Determine pre-2015 service
  const careStart = protection.careStartDate < retDate ? protection.careStartDate : retDate;
  const pre2015End = careStart < CARE_START_DATE ? careStart : (protection.status === 'full' ? retDate : careStart);
  let pre2015Service = Math.max(0, yearsBetween(djs, pre2015End > retDate ? retDate : pre2015End));
  pre2015Service = Math.min(pre2015Service, 45); // Service cap

  // Remedy period service (1 Apr 2015 - 31 Mar 2022)
  const remedyStart = new Date(Math.max(CARE_START_DATE.getTime(), djs.getTime()));
  const remedyEnd = new Date(Math.min(REMEDY_END_DATE.getTime(), retDate.getTime()));
  const remedyService = remedyStart < remedyEnd ? yearsBetween(remedyStart, remedyEnd) : 0;

  // FTE proportion for CARE
  const fteProp = inputs.isPartTime ? inputs.currentFteProportion : 1;

  // Three salary bases
  const cpi = inputs.assumedCpi;
  const bases: SalaryBasis[] = [
    { label: 'CPI + 0%', growthRate: cpi / 100 },
    { label: 'CPI + 1%', growthRate: (cpi + 1) / 100 },
    { label: 'CPI + 2%', growthRate: (cpi + 2) / 100 },
  ];

  const yearsToRet = yearsBetween(today, retDate);
  const currentSchemeYr = schemeYear(today);
  const retSchemeYr = schemeYear(retDate);

  // Calculate for each basis
  const calcBasis = (basis: SalaryBasis): SingleBasisResult => {
    // Project salary
    const projectedFTEPay = inputs.currentPay * Math.pow(1 + basis.growthRate, yearsToRet);
    // Discount back to today's money
    const discountFactor = Math.pow(1 + cpi / 100, yearsToRet);
    const projectedPayReal = projectedFTEPay / discountFactor;

    // --- LEGACY PENSION ---
    const legacyNPA = inputs.legacyScheme === '1995' ? 60 : 65;
    const legacyAccrual = inputs.legacyScheme === '1995' ? 80 : 60;

    // ERF/LRF for legacy
    const legacyYearsEarly = legacyNPA - retAge;
    let legacyERF = 1.0;
    let legacyLSERF = 1.0;

    if (legacyYearsEarly > 0) {
      // Early retirement
      if (inputs.legacyScheme === '1995') {
        legacyERF = lookupFactor(ERF1_1995_PENSION, ageAtRet.years, ageAtRet.months);
        legacyLSERF = lookupFactor(ERF7_1995_LUMPSUM, ageAtRet.years, ageAtRet.months);
      } else {
        legacyERF = lookupFactor(ERF2_NPA65_PENSION, ageAtRet.years, ageAtRet.months);
        legacyLSERF = legacyERF; // 2008 uses same factor for pension (no auto lump sum)
      }
    } else if (legacyYearsEarly < 0 && inputs.legacyScheme === '2008') {
      // Late retirement for 2008
      legacyERF = lookupFactor(LRF1_2008_PENSION, ageAtRet.years, ageAtRet.months);
    }

    const effectivePre2015Service = pre2015Service + transferIn + addedYearsService;
    const cappedService = Math.min(effectivePre2015Service, 45);

    let legacyPension = (cappedService * projectedPayReal) / legacyAccrual * legacyERF;
    let legacyLS = 0;
    if (inputs.legacyScheme === '1995') {
      legacyLS = (cappedService * projectedPayReal) / legacyAccrual * LUMPSUM_FACTOR_1995 * legacyLSERF;
    }

    // If using ABS data, use projected ABS values instead
    if (inputs.useAbsData && inputs.absLegacyPension > 0) {
      const absDate = parseDate(inputs.absDate);
      const yearsAbsToRet = yearsBetween(absDate, retDate);
      const salaryGrowthFromAbs = Math.pow(1 + basis.growthRate, yearsAbsToRet);
      const discountFromAbs = Math.pow(1 + cpi / 100, yearsAbsToRet);
      legacyPension = (inputs.absLegacyPension * salaryGrowthFromAbs / discountFromAbs) * legacyERF;
      if (inputs.legacyScheme === '1995' && inputs.absLegacyLumpSum > 0) {
        legacyLS = (inputs.absLegacyLumpSum * salaryGrowthFromAbs / discountFromAbs) * legacyLSERF;
      }
    }

    const legacy: LegacyResult = {
      pension: roundPound(Math.max(0, legacyPension)),
      lumpSum: roundPound(Math.max(0, legacyLS)),
      service: cappedService,
      projectedPay: roundPound(projectedPayReal),
      erf: legacyERF,
      lumpSumErf: legacyLSERF,
    };

    // --- CARE PENSION ---
    const careNPA = spa;
    const yearsToNPA = careNPA - retAge;
    let careERF = 1.0;

    if (yearsToNPA > 0) {
      // Early - use 2015 ERF (by years and months to NPA)
      const fullYears = Math.floor(yearsToNPA);
      const remainMonths = Math.floor((yearsToNPA - fullYears) * 12);
      careERF = lookupFactor(ERF_2015_PENSION, fullYears, remainMonths);
    } else if (yearsToNPA < 0) {
      // Late - use 2015 LRF
      const fullYears = Math.floor(-yearsToNPA);
      const remainMonths = Math.floor((-yearsToNPA - fullYears) * 12);
      careERF = lookupFactor(LRF_2015_PENSION, fullYears, remainMonths);
    }

    // Apply ERRBO to effective NPA
    let effectiveCareERF = careERF;
    if (inputs.errboYears > 0) {
      const effectiveNPA = careNPA - inputs.errboYears;
      const effectiveYearsToNPA = effectiveNPA - retAge;
      if (effectiveYearsToNPA > 0) {
        const fy = Math.floor(effectiveYearsToNPA);
        const fm = Math.floor((effectiveYearsToNPA - fy) * 12);
        effectiveCareERF = lookupFactor(ERF_2015_PENSION, fy, fm);
      } else {
        effectiveCareERF = 1.0; // At or past effective NPA
        if (effectiveYearsToNPA < 0) {
          const fy = Math.floor(-effectiveYearsToNPA);
          const fm = Math.floor((-effectiveYearsToNPA - fy) * 12);
          effectiveCareERF = lookupFactor(LRF_2015_PENSION, fy, fm);
        }
      }
    }

    // CARE accrual calculation
    let careAccruedPast = 0;
    let careProjectedFuture = 0;

    if (inputs.useAbsData && inputs.absCarePension > 0) {
      // Use ABS CARE value and project forward
      const absDate = parseDate(inputs.absDate);
      const absSchemeYr = schemeYear(absDate);

      // Revalue past CARE to retirement
      let revalued = inputs.absCarePension;
      for (let yr = absSchemeYr; yr < retSchemeYr; yr++) {
        const cpiRate = getCPI(yr, inputs.useHistoricalCpi, inputs.assumedCpi);
        revalued *= (1 + (cpiRate + 1.5) / 100);
      }
      careAccruedPast = revalued / discountFactor; // to today's money

      // Project future CARE from ABS date to retirement
      let pay = inputs.currentPay * fteProp;
      for (let yr = currentSchemeYr; yr < retSchemeYr; yr++) {
        const yearPay = pay;
        const accrued = yearPay / 54;
        let revalAmount = accrued;
        for (let ryr = yr + 1; ryr < retSchemeYr; ryr++) {
          const cpiRate = getCPI(ryr, inputs.useHistoricalCpi, inputs.assumedCpi);
          revalAmount *= (1 + (cpiRate + 1.5) / 100);
        }
        careProjectedFuture += revalAmount;
        pay *= (1 + basis.growthRate);
      }
      careProjectedFuture /= discountFactor;
    } else {
      // Approximate CARE from service
      let pay = inputs.currentPay * fteProp;

      // Past CARE (from CARE start to now)
      const careActualStart = new Date(Math.max(careStart.getTime(), CARE_START_DATE.getTime(), djs.getTime()));
      const pastCareStartYr = schemeYear(careActualStart);
      for (let yr = pastCareStartYr; yr < currentSchemeYr; yr++) {
        const windBackYears = currentSchemeYr - yr;
        const historicalPay = pay / Math.pow(1 + basis.growthRate, windBackYears);
        const accrued = historicalPay / 54;
        let revalAmount = accrued;
        for (let ryr = yr + 1; ryr < retSchemeYr; ryr++) {
          const cpiRate = getCPI(ryr, inputs.useHistoricalCpi, inputs.assumedCpi);
          revalAmount *= (1 + (cpiRate + 1.5) / 100);
        }
        careAccruedPast += revalAmount;
      }
      careAccruedPast /= discountFactor;

      // Future CARE
      let futurePay = pay;
      for (let yr = currentSchemeYr; yr < retSchemeYr; yr++) {
        const accrued = futurePay / 54;
        let revalAmount = accrued;
        for (let ryr = yr + 1; ryr < retSchemeYr; ryr++) {
          const cpiRate = getCPI(ryr, inputs.useHistoricalCpi, inputs.assumedCpi);
          revalAmount *= (1 + (cpiRate + 1.5) / 100);
        }
        careProjectedFuture += revalAmount;
        futurePay *= (1 + basis.growthRate);
      }
      careProjectedFuture /= discountFactor;
    }

    const totalCarePension = (careAccruedPast + careProjectedFuture) * effectiveCareERF;

    const care: CAREResult = {
      pension: roundPound(Math.max(0, totalCarePension)),
      accruedPast: roundPound(Math.max(0, careAccruedPast * effectiveCareERF)),
      projectedFuture: roundPound(Math.max(0, careProjectedFuture * effectiveCareERF)),
      erf: effectiveCareERF,
    };

    // --- REMEDY ---
    // Legacy option: treat remedy period as legacy service
    const remedyLegacyPension = (remedyService * projectedPayReal) / legacyAccrual * legacyERF;
    let remedyLegacyLS = 0;
    if (inputs.legacyScheme === '1995') {
      remedyLegacyLS = (remedyService * projectedPayReal) / legacyAccrual * LUMPSUM_FACTOR_1995 * legacyLSERF;
    }

    // CARE option: calculate year-by-year CARE for remedy period
    let remedyCarePension = 0;
    const remedyStartYr = schemeYear(remedyStart);
    const remedyEndYr = schemeYear(remedyEnd);
    let rPay = inputs.currentPay * fteProp;
    for (let yr = remedyStartYr; yr < remedyEndYr && yr < 2022; yr++) {
      const windBackYears = currentSchemeYr - yr;
      const historicalPay = rPay / Math.pow(1 + basis.growthRate, Math.max(0, windBackYears));
      const accrued = historicalPay / 54;
      let revalAmount = accrued;
      for (let ryr = yr + 1; ryr < retSchemeYr; ryr++) {
        const cpiRate = getCPI(ryr, inputs.useHistoricalCpi, inputs.assumedCpi);
        revalAmount *= (1 + (cpiRate + 1.5) / 100);
      }
      remedyCarePension += revalAmount;
    }
    remedyCarePension = (remedyCarePension / discountFactor) * effectiveCareERF;

    const remedy: RemedyResult = {
      legacyOption: { pension: roundPound(Math.max(0, remedyLegacyPension)), lumpSum: roundPound(Math.max(0, remedyLegacyLS)) },
      careOption: { pension: roundPound(Math.max(0, remedyCarePension)), lumpSum: 0 },
      betterOption: remedyLegacyPension + remedyLegacyLS * 0.05 >= remedyCarePension ? 'legacy' : 'care',
    };

    // --- COMMUTATION ---
    const commFactor = lookupCommutationFactor(inputs.legacyScheme, ageAtRet.years, ageAtRet.months);
    const careCommFactor = lookupCommutationFactor('2015', ageAtRet.years, ageAtRet.months);

    // Legacy commutation (in addition to automatic lump sum for 1995)
    const maxLegacyCommutablePortion = legacy.pension * 0.25 * commFactor; // approximate 25% of capital value
    const legacyMaxCommPension = maxLegacyCommutablePortion / commFactor;
    const commutationLegacy: CommutationResult = {
      maxCommutablePension: roundPound(legacyMaxCommPension),
      maxLumpSum: roundPound(legacy.lumpSum + legacyMaxCommPension * commFactor),
      postCommutationPension: roundPound(legacy.pension - legacyMaxCommPension),
      commutationFactor: commFactor,
    };

    // CARE commutation
    const totalCareForComm = care.pension + (remedy.betterOption === 'care' ? remedy.careOption.pension : 0);
    const careMaxComm = totalCareForComm * 0.25 * careCommFactor / (careCommFactor + 0.25 * careCommFactor); // Simplified
    const commutationCare: CommutationResult = {
      maxCommutablePension: roundPound(careMaxComm),
      maxLumpSum: roundPound(careMaxComm * careCommFactor),
      postCommutationPension: roundPound(totalCareForComm - careMaxComm),
      commutationFactor: careCommFactor,
    };

    // --- FLEXIBILITIES ---
    const apPension = inputs.additionalPensionAmount * effectiveCareERF;
    const marginalRate = inputs.currentPay > 43662 ? 0.42 : inputs.currentPay > 26561 ? 0.21 : 0.20;
    const apMultiplier = 10 + Math.max(0, retAge - yearsBetween(dob, today) - 30) * 0.25;
    const apGrossCost = inputs.additionalPensionAmount * apMultiplier;

    const errboGrossAnnual = inputs.currentPay * (inputs.errboYears * 0.015);
    const effectiveNPA = spa - inputs.errboYears;

    const addedYearsPension = (addedYearsService * projectedPayReal) / (inputs.legacyScheme === '1995' ? 80 : 60) * legacyERF;
    let addedYearsLS = 0;
    if (inputs.legacyScheme === '1995') {
      addedYearsLS = (addedYearsService * projectedPayReal) / 80 * LUMPSUM_FACTOR_1995 * legacyLSERF;
    }

    const flexibilities: FlexibilitiesResult = {
      additionalPension: {
        addedPension: roundPound(apPension),
        grossCost: roundPound(apGrossCost),
        netCost: roundPound(apGrossCost * (1 - marginalRate)),
      },
      errbo: {
        yearsReduced: inputs.errboYears,
        effectiveNPA,
        grossAnnualCost: roundPound(errboGrossAnnual),
        netAnnualCost: roundPound(errboGrossAnnual * (1 - marginalRate)),
      },
      addedYears: {
        addedService: addedYearsService,
        addedPension: roundPound(addedYearsPension),
        addedLumpSum: roundPound(addedYearsLS),
      },
    };

    // --- SURVIVOR ---
    const legacySurvivorRate = inputs.legacyScheme === '1995' ? 0.5 : 0.375;
    const unreducedLegacy = legacy.pension / (legacyERF || 1);
    const unreducedCare = care.pension / (effectiveCareERF || 1);
    const survivor: SurvivorResult = {
      legacyPension: roundPound(unreducedLegacy * legacySurvivorRate),
      carePension: roundPound(unreducedCare * 0.3375),
      total: roundPound(unreducedLegacy * legacySurvivorRate + unreducedCare * 0.3375),
    };

    // --- TOTALS ---
    const bestRemedyP = Math.max(remedy.legacyOption.pension, remedy.careOption.pension);
    const bestRemedyLS = remedy.betterOption === 'legacy' ? remedy.legacyOption.lumpSum : 0;
    const totalPension = legacy.pension + care.pension + bestRemedyP + flexibilities.additionalPension.addedPension;
    const totalLS = legacy.lumpSum + bestRemedyLS;

    return {
      legacy,
      care,
      remedy,
      commutationLegacy,
      commutationCare,
      flexibilities,
      survivor,
      totalPension: roundPound(totalPension),
      totalPensionAfterCommutation: roundPound(totalPension - commutationLegacy.maxCommutablePension - commutationCare.maxCommutablePension),
      totalLumpSum: roundPound(totalLS + commutationLegacy.maxLumpSum + commutationCare.maxLumpSum),
    };
  };

  const low = calcBasis(bases[0]);
  const mid = calcBasis(bases[1]);
  const high = calcBasis(bases[2]);

  // --- ABS CHECK ---
  let absCheck: PensionResults['absCheck'] = null;
  if (inputs.useAbsData) {
    const nextAbsDate = new Date(schemeYear(today) + 1, 2, 31); // 31 March next
    const absDate = parseDate(inputs.absDate);
    const monthsToNextAbs = yearsBetween(absDate, nextAbsDate);

    // Legacy pension should be roughly the same (service frozen)
    const payGrowth = Math.pow(1 + (cpi + 1) / 100, monthsToNextAbs);
    const projLegacyP = inputs.absLegacyPension * payGrowth;
    const projLegacyLS = inputs.absLegacyLumpSum * payGrowth;

    // CARE should have grown by one year's accrual + revaluation
    const careReval = 1 + (getCPI(schemeYear(today), inputs.useHistoricalCpi, inputs.assumedCpi) + 1.5) / 100;
    const newYearAccrual = (inputs.currentPay * (inputs.isPartTime ? inputs.currentFteProportion : 1)) / 54;
    const projCarePension = inputs.absCarePension * careReval + newYearAccrual;

    absCheck = {
      nextAbsDate: nextAbsDate.toISOString().split('T')[0],
      projectedLegacyPension: roundPound(projLegacyP),
      projectedLegacyLumpSum: roundPound(projLegacyLS),
      projectedCarePension: roundPound(projCarePension),
    };
  }

  return {
    protectionStatus: protection,
    spa,
    spaDate,
    ageAtRetirement: ageAtRet,
    totalService: totalCalendarService + transferIn + addedYearsService,
    low, mid, high,
    absCheck,
  };
}
