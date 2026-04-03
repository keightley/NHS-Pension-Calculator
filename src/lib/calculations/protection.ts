import type { LegacyScheme, ProtectionStatus } from '../types';
import { yearsBetween } from '../utils';
import { lookupTaperEndDate } from '../data/taperTables';

const PROTECTION_DATE = new Date(2012, 3, 1); // 1 April 2012
const CARE_START_DATE = new Date(2015, 3, 1); // 1 April 2015
const REMEDY_END_DATE = new Date(2022, 3, 1); // 1 April 2022

export function calculateProtectionStatus(
  dob: Date,
  dateJoinedScheme: Date,
  scheme: LegacyScheme
): ProtectionStatus {
  // Must have been in service on the protection date
  if (dateJoinedScheme > PROTECTION_DATE) {
    return { status: 'none', taperEndDate: null, careStartDate: dateJoinedScheme > CARE_START_DATE ? dateJoinedScheme : CARE_START_DATE };
  }

  const ageAtProtectionDate = yearsBetween(dob, PROTECTION_DATE);
  const npa = scheme === '1995' ? 60 : 65;
  const yearsToNPA = npa - ageAtProtectionDate;

  // Full protection: less than 10 years to NPA on protection date
  if (yearsToNPA < 10) {
    return { status: 'full', taperEndDate: null, careStartDate: new Date(9999, 0, 1) }; // Never enters CARE
  }

  // Tapered: between 10 and 13.5 years to NPA
  if (yearsToNPA <= 13.5) {
    const taperEnd = lookupTaperEndDate(dob, scheme);
    if (taperEnd) {
      return { status: 'tapered', taperEndDate: taperEnd, careStartDate: taperEnd };
    }
  }

  // No protection
  return { status: 'none', taperEndDate: null, careStartDate: CARE_START_DATE };
}

export { PROTECTION_DATE, CARE_START_DATE, REMEDY_END_DATE };
