import type {
  PensionInputs, PensionResults, SingleBasisResult,
  LegacyResult, CAREResult, RemedyResult, CommutationResult,
  FlexibilitiesResult, SurvivorResult,
} from '../types';
import { parseDate, yearsBetween, ageInYearsAndMonths, schemeYear, roundPound } from '../utils';
import { calculateProtectionStatus, CARE_START_DATE, REMEDY_END_DATE } from './protection';
import { lookupSPA, getSPADate, getCPI } from '../data/spaAndTax';
import { lookupFactor, ERF1_1995_PENSION, ERF2_NPA65_PENSION, ERF7_1995_LUMPSUM, LRF1_2008_PENSION, ERF_2015_PENSION, LRF_2015_PENSION } from '../data/erfTables';
import { lookupCommutationFactor, LUMPSUM_FACTOR_1995 } from '../data/commutation';

function getLegacyFactors(scheme: '1995' | '2008', ageYrs: number, ageMths: number) {
  const npa = scheme === '1995' ? 60 : 65;
  const exact = ageYrs + ageMths / 12;
  let pf = 1.0, lsf = 1.0;
  if (exact < npa) {
    pf = scheme === '1995' ? lookupFactor(ERF1_1995_PENSION, ageYrs, ageMths) : lookupFactor(ERF2_NPA65_PENSION, ageYrs, ageMths);
    lsf = scheme === '1995' ? lookupFactor(ERF7_1995_LUMPSUM, ageYrs, ageMths) : pf;
  } else if (exact > npa && scheme === '2008') {
    pf = lookupFactor(LRF1_2008_PENSION, ageYrs, ageMths);
  }
  return { pf, lsf };
}

function getCareERF(ageExact: number, spa: number, errbo: number) {
  const effNPA = spa - errbo;
  const gap = effNPA - ageExact;
  if (gap > 0) { const fy = Math.floor(gap); return lookupFactor(ERF_2015_PENSION, fy, Math.floor((gap - fy) * 12)); }
  if (gap < 0) { const fy = Math.floor(-gap); return lookupFactor(LRF_2015_PENSION, fy, Math.floor((-gap - fy) * 12)); }
  return 1.0;
}

interface BasisParams { growthRate: number; }

function calcBasis(
  inp: PensionInputs, bp: BasisParams,
  dob: Date, djs: Date, retDate: Date,
  legDrawAge: { years: number; months: number }, _legDrawAgeExact: number,
  careDrawAge: { years: number; months: number }, careDrawAgeExact: number,
  spa: number, 
  protection: ReturnType<typeof calculateProtectionStatus>,
  today: Date,
): SingleBasisResult {
  const cpi = inp.assumedCpi;
  const yToRet = yearsBetween(today, retDate);
  const curSchYr = schemeYear(today);
  const retSchYr = schemeYear(retDate);
  const retAgeExact = yearsBetween(dob, retDate);
  const ftp = inp.isPartTime ? inp.currentFteProportion : 1;
  const disc = Math.pow(1 + cpi / 100, yToRet);
  const projPay = (inp.currentPay * Math.pow(1 + bp.growthRate, yToRet)) / disc;

  // Legacy
  const lf = getLegacyFactors(inp.legacyScheme, legDrawAge.years, legDrawAge.months);
  const lAcc = inp.legacyScheme === '1995' ? 80 : 60;
  const careStart = protection.careStartDate < retDate ? protection.careStartDate : retDate;
  const p15End = careStart < CARE_START_DATE ? careStart : (protection.status === 'full' ? retDate : careStart);
  const p15Svc = Math.max(0, yearsBetween(djs, p15End > retDate ? retDate : p15End));
  const tvIn = inp.transferInYears + inp.transferInDays / 365.25;
  const addSvc = inp.addedYears + inp.addedDays / 365.25;
  const effP15 = Math.min(p15Svc + tvIn + addSvc, 45);

  let lPen = (effP15 * projPay) / lAcc * lf.pf;
  let lLS = inp.legacyScheme === '1995' ? (effP15 * projPay) / lAcc * LUMPSUM_FACTOR_1995 * lf.lsf : 0;

  if (inp.useAbsData && inp.absLegacyPension > 0) {
    const aD = parseDate(inp.absDate);
    const yAR = yearsBetween(aD, retDate);
    const sg = Math.pow(1 + bp.growthRate, yAR);
    const dd = Math.pow(1 + cpi / 100, yAR);
    lPen = (inp.absLegacyPension * sg / dd) * lf.pf;
    if (inp.legacyScheme === '1995' && inp.absLegacyLumpSum > 0)
      lLS = (inp.absLegacyLumpSum * sg / dd) * lf.lsf;
  }

  const legacy: LegacyResult = { pension: roundPound(Math.max(0, lPen)), lumpSum: roundPound(Math.max(0, lLS)), service: effP15, projectedPay: roundPound(projPay), erf: lf.pf, lumpSumErf: lf.lsf };

  // CARE
  const cERF = getCareERF(careDrawAgeExact, spa, inp.errboYears);
  const cDefYrs = Math.max(0, careDrawAgeExact - retAgeExact);
  const cDefGr = Math.pow(1 + 1.5 / 100, cDefYrs);

  let cAcc = 0, cFut = 0;
  if (inp.useAbsData && inp.absCarePension > 0) {
    const aSY = schemeYear(parseDate(inp.absDate));
    let rv = inp.absCarePension;
    for (let y = aSY; y < retSchYr; y++) rv *= (1 + (getCPI(y, inp.useHistoricalCpi, cpi) + 1.5) / 100);
    cAcc = rv / disc;
    let pay = inp.currentPay * ftp;
    for (let y = curSchYr; y < retSchYr; y++) { let ra = pay / 54; for (let r = y + 1; r < retSchYr; r++) ra *= (1 + (getCPI(r, inp.useHistoricalCpi, cpi) + 1.5) / 100); cFut += ra; pay *= (1 + bp.growthRate); }
    cFut /= disc;
  } else {
    const pay = inp.currentPay * ftp;
    const cAS = new Date(Math.max(careStart.getTime(), CARE_START_DATE.getTime(), djs.getTime()));
    for (let y = schemeYear(cAS); y < curSchYr; y++) { const hp = pay / Math.pow(1 + bp.growthRate, curSchYr - y); let ra = hp / 54; for (let r = y + 1; r < retSchYr; r++) ra *= (1 + (getCPI(r, inp.useHistoricalCpi, cpi) + 1.5) / 100); cAcc += ra; }
    cAcc /= disc;
    let fp = pay;
    for (let y = curSchYr; y < retSchYr; y++) { let ra = fp / 54; for (let r = y + 1; r < retSchYr; r++) ra *= (1 + (getCPI(r, inp.useHistoricalCpi, cpi) + 1.5) / 100); cFut += ra; fp *= (1 + bp.growthRate); }
    cFut /= disc;
  }

  const tCare = (cAcc + cFut) * cDefGr * cERF;
  const care: CAREResult = { pension: roundPound(Math.max(0, tCare)), accruedPast: roundPound(Math.max(0, cAcc * cDefGr * cERF)), projectedFuture: roundPound(Math.max(0, cFut * cDefGr * cERF)), erf: cERF };

  // Remedy
  const rS = new Date(Math.max(CARE_START_DATE.getTime(), djs.getTime()));
  const rE = new Date(Math.min(REMEDY_END_DATE.getTime(), retDate.getTime()));
  const rSvc = rS < rE ? yearsBetween(rS, rE) : 0;
  const rLP = (rSvc * projPay) / lAcc * lf.pf;
  const rLLS = inp.legacyScheme === '1995' ? (rSvc * projPay) / lAcc * LUMPSUM_FACTOR_1995 * lf.lsf : 0;
  let rCP = 0;
  for (let y = schemeYear(rS); y <= Math.min(schemeYear(rE), 2021) && y < 2022; y++) {
    const wb = Math.max(0, curSchYr - y);
    const hp = (inp.currentPay * ftp) / Math.pow(1 + bp.growthRate, wb);
    let ra = hp / 54; for (let r = y + 1; r < retSchYr; r++) ra *= (1 + (getCPI(r, inp.useHistoricalCpi, cpi) + 1.5) / 100);
    rCP += ra;
  }
  rCP = (rCP / disc) * cDefGr * cERF;

  const bP = legacy.pension + care.pension;
  const bLS = legacy.lumpSum;
  const tLR = { pension: roundPound(bP + Math.max(0, rLP)), lumpSum: roundPound(bLS + Math.max(0, rLLS)) };
  const tCR = { pension: roundPound(bP + Math.max(0, rCP)), lumpSum: roundPound(bLS) };
  const better = (tLR.pension + tLR.lumpSum * 0.05 >= tCR.pension + tCR.lumpSum * 0.05) ? 'legacy' as const : 'care' as const;

  const remedy: RemedyResult = {
    legacyOption: { pension: roundPound(Math.max(0, rLP)), lumpSum: roundPound(Math.max(0, rLLS)) },
    careOption: { pension: roundPound(Math.max(0, rCP)), lumpSum: 0 },
    betterOption: better, totalWithLegacyRemedy: tLR, totalWithCareRemedy: tCR,
    difference: roundPound(tLR.pension - tCR.pension),
  };

  // Commutation
  const cf = lookupCommutationFactor(inp.legacyScheme, legDrawAge.years, legDrawAge.months);
  const ccf = lookupCommutationFactor('2015', careDrawAge.years, careDrawAge.months);
  const lmc = legacy.pension > 0 ? legacy.pension * 0.25 * cf / (cf + 0.25 * cf) : 0;
  const commLeg: CommutationResult = { maxCommutablePension: roundPound(lmc), maxLumpSum: roundPound(legacy.lumpSum + lmc * cf), postCommutationPension: roundPound(legacy.pension - lmc), commutationFactor: cf };
  const tcfc = care.pension + (better === 'care' ? remedy.careOption.pension : 0);
  const cmc = tcfc > 0 ? tcfc * 0.25 * ccf / (ccf + 0.25 * ccf) : 0;
  const commCare: CommutationResult = { maxCommutablePension: roundPound(cmc), maxLumpSum: roundPound(cmc * ccf), postCommutationPension: roundPound(tcfc - cmc), commutationFactor: ccf };

  // Flexibilities
  const apPen = inp.additionalPensionAmount * cERF * cDefGr;
  const mr = inp.currentPay > 43662 ? 0.42 : inp.currentPay > 26561 ? 0.21 : 0.20;
  const apMul = 10 + Math.max(0, retAgeExact - yearsBetween(dob, today) - 30) * 0.25;
  const apGC = inp.additionalPensionAmount * apMul;
  const errGC = inp.currentPay * (inp.errboYears * 0.015);
  const ayPen = (addSvc * projPay) / (inp.legacyScheme === '1995' ? 80 : 60) * lf.pf;
  const ayLS = inp.legacyScheme === '1995' ? (addSvc * projPay) / 80 * LUMPSUM_FACTOR_1995 * lf.lsf : 0;
  const flex: FlexibilitiesResult = {
    additionalPension: { addedPension: roundPound(apPen), grossCost: roundPound(apGC), netCost: roundPound(apGC * (1 - mr)) },
    errbo: { yearsReduced: inp.errboYears, effectiveNPA: spa - inp.errboYears, grossAnnualCost: roundPound(errGC), netAnnualCost: roundPound(errGC * (1 - mr)) },
    addedYears: { addedService: addSvc, addedPension: roundPound(ayPen), addedLumpSum: roundPound(ayLS) },
  };

  // Survivor (based on unreduced)
  const lsr = inp.legacyScheme === '1995' ? 0.5 : 0.375;
  const ulp = legacy.pension / (lf.pf || 1);
  const ucp = care.pension / (cERF || 1);
  const survivor: SurvivorResult = { legacyPension: roundPound(ulp * lsr), carePension: roundPound(ucp * 0.3375), total: roundPound(ulp * lsr + ucp * 0.3375) };

  // Totals (using best remedy)
  const bestRP = better === 'legacy' ? remedy.legacyOption.pension : remedy.careOption.pension;
  const bestRLS = better === 'legacy' ? remedy.legacyOption.lumpSum : 0;
  const totPen = legacy.pension + care.pension + bestRP + flex.additionalPension.addedPension;
  const totLS = legacy.lumpSum + bestRLS;

  return {
    legacy, care, remedy, commutationLegacy: commLeg, commutationCare: commCare, flexibilities: flex, survivor,
    totalPension: roundPound(totPen),
    totalPensionAfterCommutation: roundPound(totPen - lmc - cmc),
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
  const legNPA = inputs.legacyScheme === '1995' ? 60 : 65;
  const retAgeExact = yearsBetween(dob, retDate);
  const ageAtRet = ageInYearsAndMonths(dob, retDate);
  const protection = calculateProtectionStatus(dob, djs, inputs.legacyScheme);

  // Draw ages: 0 means draw at retirement; otherwise use specified age
  const legDrawAgeExact = inputs.legacyDrawAge > 0 ? inputs.legacyDrawAge : retAgeExact;
  const careDrawAgeExact = inputs.careDrawAge > 0 ? inputs.careDrawAge : retAgeExact;

  // Clamp: can't draw before retirement
  const effLegDraw = Math.max(legDrawAgeExact, retAgeExact);
  const effCareDraw = Math.max(careDrawAgeExact, retAgeExact);

  // Convert to years+months
  const legDrawYrs = Math.floor(effLegDraw);
  const legDrawMths = Math.floor((effLegDraw - legDrawYrs) * 12);
  const careDrawYrs = Math.floor(effCareDraw);
  const careDrawMths = Math.floor((effCareDraw - careDrawYrs) * 12);
  const legDrawAge = { years: legDrawYrs, months: legDrawMths };
  const careDrawAge = { years: careDrawYrs, months: careDrawMths };

  const tvIn = inputs.transferInYears + inputs.transferInDays / 365.25;
  const addSvc = inputs.addedYears + inputs.addedDays / 365.25;
  const totalSvc = yearsBetween(djs, retDate) + tvIn + addSvc;

  const cpi = inputs.assumedCpi;
  const bases = [
    { growthRate: cpi / 100 },
    { growthRate: (cpi + 1) / 100 },
    { growthRate: (cpi + 2) / 100 },
  ];

  const low = calcBasis(inputs, bases[0], dob, djs, retDate, legDrawAge, effLegDraw, careDrawAge, effCareDraw, spa, protection, today);
  const mid = calcBasis(inputs, bases[1], dob, djs, retDate, legDrawAge, effLegDraw, careDrawAge, effCareDraw, spa, protection, today);
  const high = calcBasis(inputs, bases[2], dob, djs, retDate, legDrawAge, effLegDraw, careDrawAge, effCareDraw, spa, protection, today);

  // ABS check
  let absCheck: PensionResults['absCheck'] = null;
  if (inputs.useAbsData && inputs.absDate) {
    const nAbs = new Date(schemeYear(today) + 1, 2, 31);
    const pg = Math.pow(1 + (cpi + 1) / 100, yearsBetween(parseDate(inputs.absDate), nAbs));
    const cr = 1 + (getCPI(schemeYear(today), inputs.useHistoricalCpi, cpi) + 1.5) / 100;
    const na = (inputs.currentPay * (inputs.isPartTime ? inputs.currentFteProportion : 1)) / 54;
    absCheck = { nextAbsDate: nAbs.toISOString().split('T')[0], projectedLegacyPension: roundPound(inputs.absLegacyPension * pg), projectedLegacyLumpSum: roundPound(inputs.absLegacyLumpSum * pg), projectedCarePension: roundPound(inputs.absCarePension * cr + na) };
  }

  return {
    protectionStatus: protection, spa, spaDate, legacyNPA: legNPA,
    retirementAge: retAgeExact, ageAtRetirement: ageAtRet,
    legacyDrawAge: legDrawAge, careDrawAge: careDrawAge,
    totalService: totalSvc,
    low, mid, high, absCheck,
  };
}
