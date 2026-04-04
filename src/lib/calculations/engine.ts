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

function getLegacyFactors(scheme: '1995' | '2008', drawAge: { years: number; months: number }) {
  const npa = scheme === '1995' ? 60 : 65;
  const drawAgeExact = drawAge.years + drawAge.months / 12;
  let pensionFactor = 1.0;
  let lumpSumFactor = 1.0;
  if (drawAgeExact < npa) {
    if (scheme === '1995') {
      pensionFactor = lookupFactor(ERF1_1995_PENSION, drawAge.years, drawAge.months);
      lumpSumFactor = lookupFactor(ERF7_1995_LUMPSUM, drawAge.years, drawAge.months);
    } else {
      pensionFactor = lookupFactor(ERF2_NPA65_PENSION, drawAge.years, drawAge.months);
      lumpSumFactor = pensionFactor;
    }
  } else if (drawAgeExact > npa && scheme === '2008') {
    pensionFactor = lookupFactor(LRF1_2008_PENSION, drawAge.years, drawAge.months);
  }
  return { pensionFactor, lumpSumFactor };
}

function getCareERF(drawAgeExact: number, spa: number, errboYears: number) {
  const effectiveNPA = spa - errboYears;
  const yearsToNPA = effectiveNPA - drawAgeExact;
  if (yearsToNPA > 0) {
    const fy = Math.floor(yearsToNPA);
    const fm = Math.floor((yearsToNPA - fy) * 12);
    return lookupFactor(ERF_2015_PENSION, fy, fm);
  } else if (yearsToNPA < 0) {
    const fy = Math.floor(-yearsToNPA);
    const fm = Math.floor((-yearsToNPA - fy) * 12);
    return lookupFactor(LRF_2015_PENSION, fy, fm);
  }
  return 1.0;
}

function calcBasis(
  inputs: PensionInputs, basis: SalaryBasis,
  dob: Date, djs: Date, retDate: Date,
  legDrawDate: Date, careDrawDate: Date,
  spa: number, protection: ReturnType<typeof calculateProtectionStatus>,
  today: Date,
): SingleBasisResult {
  const cpi = inputs.assumedCpi;
  const yearsToRet = yearsBetween(today, retDate);
  const currentSchemeYr = schemeYear(today);
  const retSchemeYr = schemeYear(retDate);
  const fteProp = inputs.isPartTime ? inputs.currentFteProportion : 1;

  const legDrawAge = ageInYearsAndMonths(dob, legDrawDate);
  const careDrawAgeAM = ageInYearsAndMonths(dob, careDrawDate);
  const careDrawAgeExact = yearsBetween(dob, careDrawDate);

  const projFTEPay = inputs.currentPay * Math.pow(1 + basis.growthRate, yearsToRet);
  const disc = Math.pow(1 + cpi / 100, yearsToRet);
  const projPayReal = projFTEPay / disc;

  // --- LEGACY ---
  const legAccrual = inputs.legacyScheme === '1995' ? 80 : 60;
  const legF = getLegacyFactors(inputs.legacyScheme, legDrawAge);
  const careStart = protection.careStartDate < retDate ? protection.careStartDate : retDate;
  const pre15End = careStart < CARE_START_DATE ? careStart : (protection.status === 'full' ? retDate : careStart);
  const pre15Svc = Math.max(0, yearsBetween(djs, pre15End > retDate ? retDate : pre15End));
  const tvIn = inputs.transferInYears + inputs.transferInDays / 365.25;
  const addSvc = inputs.addedYears + inputs.addedDays / 365.25;
  const effPre15 = Math.min(pre15Svc + tvIn + addSvc, 45);

  let legPen = (effPre15 * projPayReal) / legAccrual * legF.pensionFactor;
  let legLS = inputs.legacyScheme === '1995' ? (effPre15 * projPayReal) / legAccrual * LUMPSUM_FACTOR_1995 * legF.lumpSumFactor : 0;

  if (inputs.useAbsData && inputs.absLegacyPension > 0) {
    const absD = parseDate(inputs.absDate);
    const yAbsRet = yearsBetween(absD, retDate);
    const sg = Math.pow(1 + basis.growthRate, yAbsRet);
    const dd = Math.pow(1 + cpi / 100, yAbsRet);
    legPen = (inputs.absLegacyPension * sg / dd) * legF.pensionFactor;
    if (inputs.legacyScheme === '1995' && inputs.absLegacyLumpSum > 0)
      legLS = (inputs.absLegacyLumpSum * sg / dd) * legF.lumpSumFactor;
  }

  const legacy: LegacyResult = { pension: roundPound(Math.max(0, legPen)), lumpSum: roundPound(Math.max(0, legLS)), service: effPre15, projectedPay: roundPound(projPayReal), erf: legF.pensionFactor, lumpSumErf: legF.lumpSumFactor };

  // --- CARE ---
  const careERF = getCareERF(careDrawAgeExact, spa, inputs.errboYears);
  const careDeferYrs = Math.max(0, yearsBetween(retDate, careDrawDate));
  const careDeferGrowth = Math.pow(1 + 1.5 / 100, careDeferYrs);

  let careAccPast = 0, careProjFut = 0;
  if (inputs.useAbsData && inputs.absCarePension > 0) {
    const absSchYr = schemeYear(parseDate(inputs.absDate));
    let rev = inputs.absCarePension;
    for (let yr = absSchYr; yr < retSchemeYr; yr++) rev *= (1 + (getCPI(yr, inputs.useHistoricalCpi, cpi) + 1.5) / 100);
    careAccPast = rev / disc;
    let pay = inputs.currentPay * fteProp;
    for (let yr = currentSchemeYr; yr < retSchemeYr; yr++) {
      let ra = pay / 54;
      for (let r = yr + 1; r < retSchemeYr; r++) ra *= (1 + (getCPI(r, inputs.useHistoricalCpi, cpi) + 1.5) / 100);
      careProjFut += ra; pay *= (1 + basis.growthRate);
    }
    careProjFut /= disc;
  } else {
    const pay = inputs.currentPay * fteProp;
    const cActStart = new Date(Math.max(careStart.getTime(), CARE_START_DATE.getTime(), djs.getTime()));
    for (let yr = schemeYear(cActStart); yr < currentSchemeYr; yr++) {
      const hp = pay / Math.pow(1 + basis.growthRate, currentSchemeYr - yr);
      let ra = hp / 54;
      for (let r = yr + 1; r < retSchemeYr; r++) ra *= (1 + (getCPI(r, inputs.useHistoricalCpi, cpi) + 1.5) / 100);
      careAccPast += ra;
    }
    careAccPast /= disc;
    let fp = pay;
    for (let yr = currentSchemeYr; yr < retSchemeYr; yr++) {
      let ra = fp / 54;
      for (let r = yr + 1; r < retSchemeYr; r++) ra *= (1 + (getCPI(r, inputs.useHistoricalCpi, cpi) + 1.5) / 100);
      careProjFut += ra; fp *= (1 + basis.growthRate);
    }
    careProjFut /= disc;
  }

  const totalCare = (careAccPast + careProjFut) * careDeferGrowth * careERF;
  const care: CAREResult = { pension: roundPound(Math.max(0, totalCare)), accruedPast: roundPound(Math.max(0, careAccPast * careDeferGrowth * careERF)), projectedFuture: roundPound(Math.max(0, careProjFut * careDeferGrowth * careERF)), erf: careERF };

  // --- REMEDY ---
  const remStart = new Date(Math.max(CARE_START_DATE.getTime(), djs.getTime()));
  const remEnd = new Date(Math.min(REMEDY_END_DATE.getTime(), retDate.getTime()));
  const remSvc = remStart < remEnd ? yearsBetween(remStart, remEnd) : 0;

  const remLegPen = (remSvc * projPayReal) / legAccrual * legF.pensionFactor;
  const remLegLS = inputs.legacyScheme === '1995' ? (remSvc * projPayReal) / legAccrual * LUMPSUM_FACTOR_1995 * legF.lumpSumFactor : 0;

  let remCarePen = 0;
  for (let yr = schemeYear(remStart); yr <= Math.min(schemeYear(remEnd), 2021) && yr < 2022; yr++) {
    const wb = Math.max(0, currentSchemeYr - yr);
    const hp = (inputs.currentPay * fteProp) / Math.pow(1 + basis.growthRate, wb);
    let ra = hp / 54;
    for (let r = yr + 1; r < retSchemeYr; r++) ra *= (1 + (getCPI(r, inputs.useHistoricalCpi, cpi) + 1.5) / 100);
    remCarePen += ra;
  }
  remCarePen = (remCarePen / disc) * careDeferGrowth * careERF;

  const basePen = legacy.pension + care.pension;
  const baseLS = legacy.lumpSum;
  const totLegRem = { pension: roundPound(basePen + Math.max(0, remLegPen)), lumpSum: roundPound(baseLS + Math.max(0, remLegLS)) };
  const totCareRem = { pension: roundPound(basePen + Math.max(0, remCarePen)), lumpSum: roundPound(baseLS) };
  const better = (totLegRem.pension + totLegRem.lumpSum * 0.05 >= totCareRem.pension + totCareRem.lumpSum * 0.05) ? 'legacy' as const : 'care' as const;

  const remedy: RemedyResult = {
    legacyOption: { pension: roundPound(Math.max(0, remLegPen)), lumpSum: roundPound(Math.max(0, remLegLS)) },
    careOption: { pension: roundPound(Math.max(0, remCarePen)), lumpSum: 0 },
    betterOption: better, totalWithLegacyRemedy: totLegRem, totalWithCareRemedy: totCareRem,
    difference: roundPound(totLegRem.pension - totCareRem.pension),
  };

  // --- COMMUTATION ---
  const cf = lookupCommutationFactor(inputs.legacyScheme, legDrawAge.years, legDrawAge.months);
  const ccf = lookupCommutationFactor('2015', careDrawAgeAM.years, careDrawAgeAM.months);
  const lmc = legacy.pension * 0.25 * cf / (cf + 0.25 * cf);
  const commLeg: CommutationResult = { maxCommutablePension: roundPound(lmc), maxLumpSum: roundPound(legacy.lumpSum + lmc * cf), postCommutationPension: roundPound(legacy.pension - lmc), commutationFactor: cf };
  const tcfc = care.pension + (better === 'care' ? remedy.careOption.pension : 0);
  const cmc = tcfc * 0.25 * ccf / (ccf + 0.25 * ccf);
  const commCare: CommutationResult = { maxCommutablePension: roundPound(cmc), maxLumpSum: roundPound(cmc * ccf), postCommutationPension: roundPound(tcfc - cmc), commutationFactor: ccf };

  // --- FLEXIBILITIES ---
  const apPen = inputs.additionalPensionAmount * careERF * careDeferGrowth;
  const retAge = yearsBetween(dob, retDate);
  const mr = inputs.currentPay > 43662 ? 0.42 : inputs.currentPay > 26561 ? 0.21 : 0.20;
  const apMul = 10 + Math.max(0, retAge - yearsBetween(dob, today) - 30) * 0.25;
  const apGC = inputs.additionalPensionAmount * apMul;
  const errGC = inputs.currentPay * (inputs.errboYears * 0.015);
  const ayPen = (addSvc * projPayReal) / (inputs.legacyScheme === '1995' ? 80 : 60) * legF.pensionFactor;
  const ayLS = inputs.legacyScheme === '1995' ? (addSvc * projPayReal) / 80 * LUMPSUM_FACTOR_1995 * legF.lumpSumFactor : 0;
  const flex: FlexibilitiesResult = {
    additionalPension: { addedPension: roundPound(apPen), grossCost: roundPound(apGC), netCost: roundPound(apGC * (1 - mr)) },
    errbo: { yearsReduced: inputs.errboYears, effectiveNPA: spa - inputs.errboYears, grossAnnualCost: roundPound(errGC), netAnnualCost: roundPound(errGC * (1 - mr)) },
    addedYears: { addedService: addSvc, addedPension: roundPound(ayPen), addedLumpSum: roundPound(ayLS) },
  };

  // --- SURVIVOR ---
  const lsr = inputs.legacyScheme === '1995' ? 0.5 : 0.375;
  const ulp = legacy.pension / (legF.pensionFactor || 1);
  const ucp = care.pension / (careERF || 1);
  const survivor: SurvivorResult = { legacyPension: roundPound(ulp * lsr), carePension: roundPound(ucp * 0.3375), total: roundPound(ulp * lsr + ucp * 0.3375) };

  // --- TOTALS ---
  const bestRP = better === 'legacy' ? remedy.legacyOption.pension : remedy.careOption.pension;
  const bestRLS = better === 'legacy' ? remedy.legacyOption.lumpSum : 0;
  const totPen = legacy.pension + care.pension + bestRP + flex.additionalPension.addedPension;
  const totLS = legacy.lumpSum + bestRLS;

  return { legacy, care, remedy, commutationLegacy: commLeg, commutationCare: commCare, flexibilities: flex, survivor,
    totalPension: roundPound(totPen),
    totalPensionAfterCommutation: roundPound(totPen - commLeg.maxCommutablePension - cmc),
    totalLumpSum: roundPound(totLS + commLeg.maxLumpSum + commCare.maxLumpSum),
  };
}

export function calculatePension(inputs: PensionInputs): PensionResults | null {
  const dob = parseDate(inputs.dateOfBirth);
  const djs = parseDate(inputs.dateJoinedScheme);
  const retDate = parseDate(inputs.retirementDate);
  const today = new Date();
  if (retDate <= today || dob >= today) return null;

  const spa = lookupSPA(dob);
  const spaDate = getSPADate(dob);
  const ageAtRet = ageInYearsAndMonths(dob, retDate);
  const protection = calculateProtectionStatus(dob, djs, inputs.legacyScheme);
  const legNPA = inputs.legacyScheme === '1995' ? 60 : 65;

  // Draw dates
  let legDrawDate = retDate;
  let careDrawDate = retDate;
  if (inputs.splitDrawdown) {
    if (inputs.legacyDrawDate) legDrawDate = parseDate(inputs.legacyDrawDate);
    if (inputs.careDrawDate) careDrawDate = parseDate(inputs.careDrawDate);
  }
  if (legDrawDate < retDate) legDrawDate = retDate;
  if (careDrawDate < retDate) careDrawDate = retDate;

  const legacyDrawAge = ageInYearsAndMonths(dob, legDrawDate);
  const careDrawAge = ageInYearsAndMonths(dob, careDrawDate);

  const tvIn = inputs.transferInYears + inputs.transferInDays / 365.25;
  const addSvc = inputs.addedYears + inputs.addedDays / 365.25;
  const totalSvc = yearsBetween(djs, retDate) + tvIn + addSvc;

  const cpi = inputs.assumedCpi;
  const bases: SalaryBasis[] = [
    { label: 'CPI + 0%', growthRate: cpi / 100 },
    { label: 'CPI + 1%', growthRate: (cpi + 1) / 100 },
    { label: 'CPI + 2%', growthRate: (cpi + 2) / 100 },
  ];

  const low = calcBasis(inputs, bases[0], dob, djs, retDate, legDrawDate, careDrawDate, spa, protection, today);
  const mid = calcBasis(inputs, bases[1], dob, djs, retDate, legDrawDate, careDrawDate, spa, protection, today);
  const high = calcBasis(inputs, bases[2], dob, djs, retDate, legDrawDate, careDrawDate, spa, protection, today);

  // Deferred comparison: draw at NPA instead
  const retAgeExact = yearsBetween(dob, retDate);
  let deferredMid: SingleBasisResult | null = null;
  if (retAgeExact < legNPA || retAgeExact < spa) {
    const dLD = retAgeExact < legNPA ? new Date(dob.getFullYear() + legNPA, dob.getMonth(), dob.getDate()) : retDate;
    const dCD = retAgeExact < spa ? new Date(dob.getFullYear() + spa, dob.getMonth(), dob.getDate()) : retDate;
    deferredMid = calcBasis(inputs, bases[1], dob, djs, retDate, dLD, dCD, spa, protection, today);
  }

  // ABS check
  let absCheck: PensionResults['absCheck'] = null;
  if (inputs.useAbsData && inputs.absDate) {
    const nAbs = new Date(schemeYear(today) + 1, 2, 31);
    const pg = Math.pow(1 + (cpi + 1) / 100, yearsBetween(parseDate(inputs.absDate), nAbs));
    const cr = 1 + (getCPI(schemeYear(today), inputs.useHistoricalCpi, cpi) + 1.5) / 100;
    const na = (inputs.currentPay * (inputs.isPartTime ? inputs.currentFteProportion : 1)) / 54;
    absCheck = { nextAbsDate: nAbs.toISOString().split('T')[0], projectedLegacyPension: roundPound(inputs.absLegacyPension * pg), projectedLegacyLumpSum: roundPound(inputs.absLegacyLumpSum * pg), projectedCarePension: roundPound(inputs.absCarePension * cr + na) };
  }

  return { protectionStatus: protection, spa, spaDate, ageAtRetirement: ageAtRet, legacyDrawAge, careDrawAge, totalService: totalSvc, low, mid, high, deferredMid, absCheck };
}
