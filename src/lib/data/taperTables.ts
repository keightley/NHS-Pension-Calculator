// Taper protection tables
// Members with DoB in range get tapered protection ending on the specified date
// Source: SPPA NHSPenCalculator v3.1

export interface TaperEntry {
  dobFrom: string; // ISO date
  dobTo: string;
  endDate: string;
}

export const TAPER_1995_NPA60: TaperEntry[] = [
  {
    "dobFrom": "1962-04-02",
    "dobTo": "1962-05-01",
    "endDate": "2022-02-01"
  },
  {
    "dobFrom": "1962-05-02",
    "dobTo": "1962-06-01",
    "endDate": "2021-12-01"
  },
  {
    "dobFrom": "1962-06-02",
    "dobTo": "1962-07-01",
    "endDate": "2021-10-01"
  },
  {
    "dobFrom": "1962-07-02",
    "dobTo": "1962-08-01",
    "endDate": "2021-08-01"
  },
  {
    "dobFrom": "1962-08-02",
    "dobTo": "1962-09-01",
    "endDate": "2021-06-01"
  },
  {
    "dobFrom": "1962-09-02",
    "dobTo": "1962-10-01",
    "endDate": "2021-04-01"
  },
  {
    "dobFrom": "1962-10-02",
    "dobTo": "1962-11-01",
    "endDate": "2021-02-01"
  },
  {
    "dobFrom": "1962-11-02",
    "dobTo": "1962-12-01",
    "endDate": "2020-12-01"
  },
  {
    "dobFrom": "1962-12-02",
    "dobTo": "1963-01-01",
    "endDate": "2020-10-01"
  },
  {
    "dobFrom": "1963-01-02",
    "dobTo": "1963-02-01",
    "endDate": "2020-08-01"
  },
  {
    "dobFrom": "1963-02-02",
    "dobTo": "1963-03-01",
    "endDate": "2020-06-01"
  },
  {
    "dobFrom": "1963-03-02",
    "dobTo": "1963-04-01",
    "endDate": "2020-04-01"
  },
  {
    "dobFrom": "1963-04-02",
    "dobTo": "1963-05-01",
    "endDate": "2020-02-01"
  },
  {
    "dobFrom": "1963-05-02",
    "dobTo": "1963-06-01",
    "endDate": "2019-12-01"
  },
  {
    "dobFrom": "1963-06-02",
    "dobTo": "1963-07-01",
    "endDate": "2019-10-01"
  },
  {
    "dobFrom": "1963-07-02",
    "dobTo": "1963-08-01",
    "endDate": "2019-08-01"
  },
  {
    "dobFrom": "1963-08-02",
    "dobTo": "1963-09-01",
    "endDate": "2019-06-01"
  },
  {
    "dobFrom": "1963-09-02",
    "dobTo": "1963-10-01",
    "endDate": "2019-04-01"
  },
  {
    "dobFrom": "1963-10-02",
    "dobTo": "1963-11-01",
    "endDate": "2019-02-01"
  },
  {
    "dobFrom": "1963-11-02",
    "dobTo": "1963-12-01",
    "endDate": "2018-12-01"
  },
  {
    "dobFrom": "1963-12-02",
    "dobTo": "1964-01-01",
    "endDate": "2018-10-01"
  },
  {
    "dobFrom": "1964-01-02",
    "dobTo": "1964-02-01",
    "endDate": "2018-08-01"
  },
  {
    "dobFrom": "1964-02-02",
    "dobTo": "1964-03-01",
    "endDate": "2018-06-01"
  },
  {
    "dobFrom": "1964-03-02",
    "dobTo": "1964-04-01",
    "endDate": "2018-04-01"
  },
  {
    "dobFrom": "1964-04-02",
    "dobTo": "1964-05-01",
    "endDate": "2018-02-01"
  },
  {
    "dobFrom": "1964-05-02",
    "dobTo": "1964-06-01",
    "endDate": "2017-12-01"
  },
  {
    "dobFrom": "1964-06-02",
    "dobTo": "1964-07-01",
    "endDate": "2017-10-01"
  },
  {
    "dobFrom": "1964-07-02",
    "dobTo": "1964-08-01",
    "endDate": "2017-08-01"
  },
  {
    "dobFrom": "1964-08-02",
    "dobTo": "1964-09-01",
    "endDate": "2017-06-01"
  },
  {
    "dobFrom": "1964-09-02",
    "dobTo": "1964-10-01",
    "endDate": "2017-04-01"
  },
  {
    "dobFrom": "1964-10-02",
    "dobTo": "1964-11-01",
    "endDate": "2017-02-01"
  },
  {
    "dobFrom": "1964-11-02",
    "dobTo": "1964-12-01",
    "endDate": "2016-12-01"
  },
  {
    "dobFrom": "1964-12-02",
    "dobTo": "1965-01-01",
    "endDate": "2016-10-01"
  },
  {
    "dobFrom": "1965-01-02",
    "dobTo": "1965-02-01",
    "endDate": "2016-08-01"
  },
  {
    "dobFrom": "1965-02-02",
    "dobTo": "1965-03-01",
    "endDate": "2016-06-01"
  },
  {
    "dobFrom": "1965-03-02",
    "dobTo": "1965-04-01",
    "endDate": "2016-04-01"
  },
  {
    "dobFrom": "1965-04-02",
    "dobTo": "1965-05-01",
    "endDate": "2016-02-01"
  },
  {
    "dobFrom": "1965-05-02",
    "dobTo": "1965-06-01",
    "endDate": "2015-12-01"
  },
  {
    "dobFrom": "1965-06-02",
    "dobTo": "1965-07-01",
    "endDate": "2015-10-01"
  },
  {
    "dobFrom": "1965-07-02",
    "dobTo": "1965-08-01",
    "endDate": "2015-08-01"
  },
  {
    "dobFrom": "1965-08-02",
    "dobTo": "1965-08-31",
    "endDate": "2015-06-01"
  }
];

export const TAPER_2008_NPA65: TaperEntry[] = [
  {
    "dobFrom": "1957-04-02",
    "dobTo": "1957-05-01",
    "endDate": "2022-02-01"
  },
  {
    "dobFrom": "1957-05-02",
    "dobTo": "1957-06-01",
    "endDate": "2021-12-01"
  },
  {
    "dobFrom": "1957-06-02",
    "dobTo": "1957-07-01",
    "endDate": "2021-10-01"
  },
  {
    "dobFrom": "1957-07-02",
    "dobTo": "1957-08-01",
    "endDate": "2021-08-01"
  },
  {
    "dobFrom": "1957-08-02",
    "dobTo": "1957-09-01",
    "endDate": "2021-06-01"
  },
  {
    "dobFrom": "1957-09-02",
    "dobTo": "1957-10-01",
    "endDate": "2021-04-01"
  },
  {
    "dobFrom": "1957-10-02",
    "dobTo": "1957-11-01",
    "endDate": "2021-02-01"
  },
  {
    "dobFrom": "1957-11-02",
    "dobTo": "1957-12-01",
    "endDate": "2020-12-01"
  },
  {
    "dobFrom": "1957-12-02",
    "dobTo": "1958-01-01",
    "endDate": "2020-10-01"
  },
  {
    "dobFrom": "1958-01-02",
    "dobTo": "1958-02-01",
    "endDate": "2020-08-01"
  },
  {
    "dobFrom": "1958-02-02",
    "dobTo": "1958-03-01",
    "endDate": "2020-06-01"
  },
  {
    "dobFrom": "1958-03-02",
    "dobTo": "1958-04-01",
    "endDate": "2020-04-01"
  },
  {
    "dobFrom": "1958-04-02",
    "dobTo": "1958-05-01",
    "endDate": "2020-02-01"
  },
  {
    "dobFrom": "1958-05-02",
    "dobTo": "1958-06-01",
    "endDate": "2019-12-01"
  },
  {
    "dobFrom": "1958-06-02",
    "dobTo": "1958-07-01",
    "endDate": "2019-10-01"
  },
  {
    "dobFrom": "1958-07-02",
    "dobTo": "1958-08-01",
    "endDate": "2019-08-01"
  },
  {
    "dobFrom": "1958-08-02",
    "dobTo": "1958-09-01",
    "endDate": "2019-06-01"
  },
  {
    "dobFrom": "1958-09-02",
    "dobTo": "1958-10-01",
    "endDate": "2019-04-01"
  },
  {
    "dobFrom": "1958-10-02",
    "dobTo": "1958-11-01",
    "endDate": "2019-02-01"
  },
  {
    "dobFrom": "1958-11-02",
    "dobTo": "1958-12-01",
    "endDate": "2018-12-01"
  },
  {
    "dobFrom": "1958-12-02",
    "dobTo": "1959-01-01",
    "endDate": "2018-10-01"
  },
  {
    "dobFrom": "1959-01-02",
    "dobTo": "1959-02-01",
    "endDate": "2018-08-01"
  },
  {
    "dobFrom": "1959-02-02",
    "dobTo": "1959-03-01",
    "endDate": "2018-06-01"
  },
  {
    "dobFrom": "1959-03-02",
    "dobTo": "1959-04-01",
    "endDate": "2018-04-01"
  },
  {
    "dobFrom": "1959-04-02",
    "dobTo": "1959-05-01",
    "endDate": "2018-02-01"
  },
  {
    "dobFrom": "1959-05-02",
    "dobTo": "1959-06-01",
    "endDate": "2017-12-01"
  },
  {
    "dobFrom": "1959-06-02",
    "dobTo": "1959-07-01",
    "endDate": "2017-10-01"
  },
  {
    "dobFrom": "1959-07-02",
    "dobTo": "1959-08-01",
    "endDate": "2017-08-01"
  },
  {
    "dobFrom": "1959-08-02",
    "dobTo": "1959-09-01",
    "endDate": "2017-06-01"
  },
  {
    "dobFrom": "1959-09-02",
    "dobTo": "1959-10-01",
    "endDate": "2017-04-01"
  },
  {
    "dobFrom": "1959-10-02",
    "dobTo": "1959-11-01",
    "endDate": "2017-02-01"
  },
  {
    "dobFrom": "1959-11-02",
    "dobTo": "1959-12-01",
    "endDate": "2016-12-01"
  },
  {
    "dobFrom": "1959-12-02",
    "dobTo": "1960-01-01",
    "endDate": "2016-10-01"
  },
  {
    "dobFrom": "1960-01-02",
    "dobTo": "1960-02-01",
    "endDate": "2016-08-01"
  },
  {
    "dobFrom": "1960-02-02",
    "dobTo": "1960-03-01",
    "endDate": "2016-06-01"
  },
  {
    "dobFrom": "1960-03-02",
    "dobTo": "1960-04-01",
    "endDate": "2016-04-01"
  },
  {
    "dobFrom": "1960-04-02",
    "dobTo": "1960-05-01",
    "endDate": "2016-02-01"
  },
  {
    "dobFrom": "1960-05-02",
    "dobTo": "1960-06-01",
    "endDate": "2015-12-01"
  },
  {
    "dobFrom": "1960-06-02",
    "dobTo": "1960-07-01",
    "endDate": "2015-10-01"
  },
  {
    "dobFrom": "1960-07-02",
    "dobTo": "1960-08-01",
    "endDate": "2015-08-01"
  },
  {
    "dobFrom": "1960-08-02",
    "dobTo": "1960-08-31",
    "endDate": "2015-06-01"
  }
];

export function lookupTaperEndDate(dob: Date, scheme: '1995' | '2008'): Date | null {
  const table = scheme === '1995' ? TAPER_1995_NPA60 : TAPER_2008_NPA65;
  const dobTime = dob.getTime();
  for (const entry of table) {
    const from = new Date(entry.dobFrom).getTime();
    const to = new Date(entry.dobTo).getTime();
    if (dobTime >= from && dobTime <= to) {
      return new Date(entry.endDate);
    }
  }
  return null;
}
