import { useState, useMemo } from 'react';
import { Calculator, Shield, TrendingUp, PiggyBank, Users, BarChart3, Clock, Menu, X, Download, ArrowRight } from 'lucide-react';
import type { PensionInputs } from './lib/types';
import { DEFAULT_INPUTS } from './lib/types';
import { calculatePension } from './lib/calculations/engine';
import { formatCurrency, formatDate, parseDate } from './lib/utils';
import { calculateScottishTax } from './lib/data/spaAndTax';
import { DATA_VERSION } from './lib/data/erfTables';
import {
  Card, CardHeader, CardBody, SectionTitle, CollapsibleSection,
  InputField, SelectField, Toggle, Tooltip,
} from './components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer } from 'recharts';

export default function App() {
  const [inputs, setInputs] = useState<PensionInputs>(DEFAULT_INPUTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'projection' | 'abscheck'>('projection');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setInputs(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value }));
  };
  const handleToggle = (name: string) => (checked: boolean) => setInputs(prev => ({ ...prev, [name]: checked }));

  const results = useMemo(() => calculatePension(inputs), [inputs]);

  const yearsToRet = results ? (parseDate(inputs.retirementDate).getTime() - new Date().getTime()) / (365.25 * 24 * 60 * 60 * 1000) : 0;
  const nomMul = inputs.showNominal ? Math.pow(1 + inputs.assumedCpi / 100, yearsToRet) : 1;
  const fmt = (v: number) => formatCurrency(v * nomMul);

  const basisResults = results ? [
    { label: 'CPI + 0%', key: 'low' as const, data: results.low },
    { label: 'CPI + 1%', key: 'mid' as const, data: results.mid },
    { label: 'CPI + 2%', key: 'high' as const, data: results.high },
  ] : [];

  const chartData = results ? [
    { name: 'CPI+0%', Legacy: (results.low.legacy.pension + results.low.remedy.legacyOption.pension) * nomMul, CARE: results.low.care.pension * nomMul },
    { name: 'CPI+1%', Legacy: (results.mid.legacy.pension + results.mid.remedy.legacyOption.pension) * nomMul, CARE: results.mid.care.pension * nomMul },
    { name: 'CPI+2%', Legacy: (results.high.legacy.pension + results.high.remedy.legacyOption.pension) * nomMul, CARE: results.high.care.pension * nomMul },
  ] : [];

  const legNPA = inputs.legacyScheme === '1995' ? 60 : 65;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2"><div className="bg-sky-600 p-1.5 rounded-lg text-white"><Calculator size={18} /></div><span className="font-semibold text-sm">NHS Pension Calculator</span></div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* Sidebar */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-[380px] bg-white border-r border-slate-200 md:h-screen md:overflow-y-auto md:sticky md:top-0 shrink-0 z-20 print:hidden`}>
          <div className="p-5 space-y-5">
            <div className="hidden md:flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="bg-sky-600 p-2 rounded-xl text-white"><Calculator size={22} /></div>
              <div><h1 className="text-lg font-semibold tracking-tight">NHS Scotland Pension</h1><p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Projection Calculator</p></div>
            </div>

            <section className="space-y-3">
              <SectionTitle><Shield size={14} className="text-sky-500" /> Personal Details</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Date of Birth" name="dateOfBirth" type="date" value={inputs.dateOfBirth} onChange={handleChange} tooltip="Used for age, SPA, and protection status." />
                <InputField label="Date Joined Scheme" name="dateJoinedScheme" type="date" value={inputs.dateJoinedScheme} onChange={handleChange} tooltip="Date you first joined NHS pension in Scotland." />
              </div>
              <InputField label="Your Name (optional)" name="name" type="text" value={inputs.name} onChange={handleChange} />
              <SelectField label="Legacy Scheme" name="legacyScheme" value={inputs.legacyScheme} onChange={handleChange}
                options={[{ value: '1995', label: '1995 Section (1/80th + auto lump sum)' }, { value: '2008', label: '2008 Section (1/60th)' }]}
                tooltip="The scheme you were in before April 2015." />
              <InputField label="Current Pensionable Pay (FTE) £" name="currentPay" value={inputs.currentPay} onChange={handleChange} tooltip="Full-time equivalent pensionable salary." />
            </section>

            {/* Retirement & Drawdown */}
            <section className="space-y-3">
              <SectionTitle><Clock size={14} className="text-sky-500" /> Retirement & Drawdown</SectionTitle>
              <InputField label="Stop Working Date" name="retirementDate" type="date" value={inputs.retirementDate} onChange={handleChange} tooltip="When you plan to leave NHS employment. Benefits stop accruing." />

              <Toggle label="Draw legacy and CARE at different dates" checked={inputs.splitDrawdown} onChange={handleToggle('splitDrawdown')}
                tooltip={`Legacy NPA is ${legNPA}. CARE NPA is your SPA (${results?.spa ?? '67-68'}). You may want to draw them at different times.`} />

              {inputs.splitDrawdown && (
                <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <InputField label={`Legacy Draw Date (NPA ${legNPA})`} name="legacyDrawDate" type="date" value={inputs.legacyDrawDate} onChange={handleChange}
                    tooltip={`When to start receiving your ${inputs.legacyScheme} pension. ERF applies if before age ${legNPA}.`} />
                  <InputField label={`CARE Draw Date (NPA ${results?.spa ?? '67-68'})`} name="careDrawDate" type="date" value={inputs.careDrawDate} onChange={handleChange}
                    tooltip="When to start receiving your 2015 CARE pension. ERF applies if before SPA." />
                </div>
              )}
            </section>

            <section className="space-y-3">
              <Toggle label="Part-time working" checked={inputs.isPartTime} onChange={handleToggle('isPartTime')} tooltip="CARE accrual based on actual (not FTE) pay." />
              {inputs.isPartTime && <InputField label="FTE Proportion (e.g. 0.8)" name="currentFteProportion" step="0.01" min="0.01" max="1" value={inputs.currentFteProportion} onChange={handleChange} />}
            </section>

            <CollapsibleSection title="Annual Benefit Statement" badge={inputs.useAbsData ? 'Active' : undefined}>
              <Toggle label="Use ABS data" checked={inputs.useAbsData} onChange={handleToggle('useAbsData')} />
              {inputs.useAbsData && <div className="space-y-3 pt-2">
                <InputField label="Statement Date" name="absDate" type="date" value={inputs.absDate} onChange={handleChange} />
                <InputField label="Legacy Pension (£/yr)" name="absLegacyPension" value={inputs.absLegacyPension} onChange={handleChange} />
                <InputField label="Legacy Lump Sum (£)" name="absLegacyLumpSum" value={inputs.absLegacyLumpSum} onChange={handleChange} />
                <InputField label="CARE Pension (£/yr)" name="absCarePension" value={inputs.absCarePension} onChange={handleChange} />
              </div>}
            </CollapsibleSection>

            <CollapsibleSection title="Transfers & Added Years">
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Transfer-in (years)" name="transferInYears" value={inputs.transferInYears} onChange={handleChange} />
                <InputField label="Transfer-in (days)" name="transferInDays" value={inputs.transferInDays} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Added Years" name="addedYears" value={inputs.addedYears} onChange={handleChange} />
                <InputField label="Added Days" name="addedDays" value={inputs.addedDays} onChange={handleChange} />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Scheme Flexibilities">
              <InputField label="Additional Pension (£/yr)" name="additionalPensionAmount" step="250" value={inputs.additionalPensionAmount} onChange={handleChange} tooltip="Purchase extra CARE pension (max £6,750)." />
              <InputField label="ERRBO (years, max 5)" name="errboYears" step="1" min="0" max="5" value={inputs.errboYears} onChange={handleChange} tooltip="Buy out early retirement reduction." />
            </CollapsibleSection>

            <CollapsibleSection title="Assumptions">
              <InputField label="Assumed CPI (%)" name="assumedCpi" step="0.1" value={inputs.assumedCpi} onChange={handleChange} />
              <Toggle label="Use historical CPI (2015–2025)" checked={inputs.useHistoricalCpi} onChange={handleToggle('useHistoricalCpi')} />
              <Toggle label="Show in future money (nominal)" checked={inputs.showNominal} onChange={handleToggle('showNominal')} />
            </CollapsibleSection>

            <p className="text-[9px] text-slate-400 pt-2 border-t border-slate-100">Factor data v{DATA_VERSION.version} · Updated {DATA_VERSION.lastUpdated}</p>
          </div>
        </div>

        {/* Main Results */}
        <div className="flex-1 p-4 md:p-8 md:overflow-y-auto md:h-screen">
          <div className="max-w-5xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 print:hidden">
              <div>
                <h2 className="text-2xl md:text-3xl font-light tracking-tight">{inputs.name ? `${inputs.name}'s ` : ''}Projection</h2>
                {results && <p className="text-slate-500 text-sm mt-1">
                  Stop work age {results.ageAtRetirement.years}
                  {inputs.splitDrawdown && ` · Legacy draw ${results.legacyDrawAge.years} · CARE draw ${results.careDrawAge.years}`}
                  {' · '}{results.protectionStatus.status === 'full' ? 'Protected' : results.protectionStatus.status === 'tapered' ? 'Tapered' : 'Unprotected'}
                  {' · SPA '}{results.spa}
                  {inputs.showNominal ? ' · Future money' : " · Today's money"}
                </p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('projection')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'projection' ? 'bg-sky-100 text-sky-700' : 'bg-white text-slate-600'}`}><BarChart3 size={14} className="inline mr-1" />Projection</button>
                {inputs.useAbsData && <button onClick={() => setActiveTab('abscheck')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'abscheck' ? 'bg-sky-100 text-sky-700' : 'bg-white text-slate-600'}`}><Clock size={14} className="inline mr-1" />Check ABS</button>}
                <button onClick={() => window.print()} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1"><Download size={14} />PDF</button>
              </div>
            </header>

            {!results ? (
              <Card className="p-12 text-center"><p className="text-slate-400">Enter your details to see your projection.</p></Card>
            ) : activeTab === 'abscheck' && results.absCheck ? (
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Clock size={16} className="text-sky-500" /> What Should Your Next ABS Show?</h3></CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[{ label: 'Legacy Pension', prev: inputs.absLegacyPension, proj: results.absCheck.projectedLegacyPension },
                      { label: 'Legacy Lump Sum', prev: inputs.absLegacyLumpSum, proj: results.absCheck.projectedLegacyLumpSum },
                      { label: 'CARE Pension', prev: inputs.absCarePension, proj: results.absCheck.projectedCarePension }
                    ].map(i => <div key={i.label} className="space-y-2"><p className="text-[10px] font-semibold text-slate-500 uppercase">{i.label}</p><p className="text-xs text-slate-500">Last ABS: {formatCurrency(i.prev)}</p><p className="text-lg font-semibold text-sky-700">→ {formatCurrency(i.proj)}</p></div>)}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-4">Next ABS expected: {formatDate(parseDate(results.absCheck.nextAbsDate))}</p>
                </CardBody>
              </Card>
            ) : (
              <>
                {/* KEY METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {basisResults.map(({ label, key, data }) => (
                    <Card key={key} className={key === 'mid' ? 'ring-2 ring-sky-300' : ''}>
                      <CardBody>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{label} {key === 'mid' && <span className="text-sky-600">· Central</span>}</p>
                        <div className="space-y-4">
                          <div><p className="text-xs text-slate-500 mb-0.5">With max commutation</p><p className="text-2xl font-light tracking-tight">{fmt(data.totalPensionAfterCommutation)}<span className="text-sm text-slate-400">/yr</span></p><p className="text-xs text-slate-500">+ {fmt(data.totalLumpSum)} lump sum</p></div>
                          <div className="pt-3 border-t border-slate-100"><p className="text-xs text-slate-500 mb-0.5">Without commutation</p><p className="text-lg font-light">{fmt(data.totalPension)}<span className="text-sm text-slate-400">/yr</span></p>{data.legacy.lumpSum > 0 && <p className="text-xs text-slate-500">+ {fmt(data.legacy.lumpSum)} auto lump sum</p>}</div>
                        </div>
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {/* REMEDY — COMPLETE TOTALS */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Shield size={16} className="text-sky-500" /> McCloud Remedy — Your Choice at Retirement<Tooltip text="For 2015–2022, you choose legacy or CARE rules. These show your TOTAL pension under each choice." /></h3></CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {basisResults.map(({ label, key, data }) => (
                        <div key={key} className="space-y-3">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase">{label}</p>
                          <div className={`p-3 rounded-lg border-2 ${data.remedy.betterOption === 'legacy' ? 'border-sky-400 bg-sky-50/50' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold">Choose Legacy for 2015–22</span>
                              {data.remedy.betterOption === 'legacy' && <span className="text-[9px] bg-sky-100 text-sky-700 px-1.5 py-0.5 rounded-full font-bold">BETTER</span>}
                            </div>
                            <p className="text-xl font-light">{fmt(data.remedy.totalWithLegacyRemedy.pension)}<span className="text-sm text-slate-400">/yr</span></p>
                            {data.remedy.totalWithLegacyRemedy.lumpSum > 0 && <p className="text-xs text-slate-500">+ {fmt(data.remedy.totalWithLegacyRemedy.lumpSum)} lump sum</p>}
                          </div>
                          <div className={`p-3 rounded-lg border-2 ${data.remedy.betterOption === 'care' ? 'border-emerald-400 bg-emerald-50/50' : 'border-slate-200'}`}>
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-xs font-semibold">Choose CARE for 2015–22</span>
                              {data.remedy.betterOption === 'care' && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full font-bold">BETTER</span>}
                            </div>
                            <p className="text-xl font-light">{fmt(data.remedy.totalWithCareRemedy.pension)}<span className="text-sm text-slate-400">/yr</span></p>
                            {data.remedy.totalWithCareRemedy.lumpSum > 0 && <p className="text-xs text-slate-500">+ {fmt(data.remedy.totalWithCareRemedy.lumpSum)} lump sum</p>}
                          </div>
                          <p className="text-xs text-slate-500 text-center">Difference: {fmt(Math.abs(data.remedy.difference))}/yr</p>
                        </div>
                      ))}
                    </div>
                    <p className="text-[10px] text-amber-600 mt-4 bg-amber-50 px-3 py-2 rounded-lg">⚠ Approximation — use SPPA's Remedy Calculator for definitive figures.</p>
                  </CardBody>
                </Card>

                {/* DEFERRED COMPARISON */}
                {results.deferredMid && (
                  <Card>
                    <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><ArrowRight size={16} className="text-sky-500" /> What If You Delay Drawing?</h3>
                      <p className="text-xs text-slate-500 mt-1">Comparison: draw immediately at retirement vs wait until NPA (no early retirement reduction).</p>
                    </CardHeader>
                    <CardBody>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 rounded-xl border border-orange-200 bg-orange-50/30">
                          <p className="text-[10px] font-semibold text-orange-700 uppercase mb-2">Draw immediately (age {results.ageAtRetirement.years})</p>
                          <p className="text-2xl font-light">{fmt(results.mid.totalPension)}<span className="text-sm text-slate-400">/yr</span></p>
                          <p className="text-xs text-slate-500 mt-1">Legacy ERF: {results.mid.legacy.erf.toFixed(3)} · CARE ERF: {results.mid.care.erf.toFixed(3)}</p>
                          {results.mid.legacy.lumpSum > 0 && <p className="text-xs text-slate-500">+ {fmt(results.mid.legacy.lumpSum)} lump sum</p>}
                        </div>
                        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                          <p className="text-[10px] font-semibold text-emerald-700 uppercase mb-2">Delay to NPA (Legacy {legNPA}, CARE {results.spa})</p>
                          <p className="text-2xl font-light">{fmt(results.deferredMid.totalPension)}<span className="text-sm text-slate-400">/yr</span></p>
                          <p className="text-xs text-slate-500 mt-1">Legacy ERF: {results.deferredMid.legacy.erf.toFixed(3)} · CARE ERF: {results.deferredMid.care.erf.toFixed(3)}</p>
                          {results.deferredMid.legacy.lumpSum > 0 && <p className="text-xs text-slate-500">+ {fmt(results.deferredMid.legacy.lumpSum)} lump sum</p>}
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-3 text-center">
                        Delaying adds {fmt(results.deferredMid.totalPension - results.mid.totalPension)}/yr
                        ({((results.deferredMid.totalPension / results.mid.totalPension - 1) * 100).toFixed(0)}% more)
                        — but you forgo income for {legNPA - results.ageAtRetirement.years}–{results.spa - results.ageAtRetirement.years} years.
                      </p>
                    </CardBody>
                  </Card>
                )}

                {/* CHART */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><BarChart3 size={16} className="text-sky-500" /> Pension Composition</h3></CardHeader>
                  <CardBody className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `£${Math.round(v/1000)}k`} />
                        <RTooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="Legacy" stackId="a" fill="#0284c7" radius={[0, 0, 4, 4]} />
                        <Bar dataKey="CARE" stackId="a" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>

                {/* TAX */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><PiggyBank size={16} className="text-sky-500" /> Net Pension (Scottish Tax)</h3></CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {basisResults.map(({ label, key, data }) => {
                        const tax = calculateScottishTax(data.totalPension * nomMul);
                        return (
                          <div key={key} className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                            <p className="text-[10px] font-semibold text-slate-500 uppercase">{label}</p>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Gross</span><span className="font-medium">{formatCurrency(tax.gross)}</span></div>
                            <div className="flex justify-between text-sm"><span className="text-slate-500">Tax</span><span className="text-red-500">−{formatCurrency(tax.totalTax)}</span></div>
                            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 font-semibold"><span>Net</span><span className="text-sky-700">{formatCurrency(tax.net)}</span></div>
                            <p className="text-xs text-slate-400">{formatCurrency(tax.monthlyNet)}/month</p>
                          </div>
                        );
                      })}
                    </div>
                  </CardBody>
                </Card>

                {/* BREAKDOWN */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><TrendingUp size={16} className="text-sky-500" /> Breakdown (Central)
                    {inputs.splitDrawdown && <span className="text-xs font-normal text-slate-500 ml-2">Legacy drawn at {results.legacyDrawAge.years} · CARE drawn at {results.careDrawAge.years}</span>}
                  </h3></CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider">
                        <tr><th className="px-5 py-3 text-left">Component</th><th className="px-5 py-3 text-right">Pension</th><th className="px-5 py-3 text-right">Lump Sum</th><th className="px-5 py-3 text-right">Factor</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr><td className="px-5 py-3 font-medium">Pre-2015 Legacy ({inputs.legacyScheme})<br/><span className="text-[10px] text-slate-400">Draw age {results.legacyDrawAge.years}</span></td><td className="px-5 py-3 text-right">{fmt(results.mid.legacy.pension)}</td><td className="px-5 py-3 text-right text-slate-500">{fmt(results.mid.legacy.lumpSum)}</td><td className="px-5 py-3 text-right text-slate-400 text-xs">{results.mid.legacy.erf.toFixed(3)}</td></tr>
                        <tr className="bg-sky-50/30"><td className="px-5 py-3 font-medium text-sky-800">Remedy (Legacy)<br/><span className="text-[10px] text-sky-500">Draw age {results.legacyDrawAge.years}</span></td><td className="px-5 py-3 text-right text-sky-700">{fmt(results.mid.remedy.legacyOption.pension)}</td><td className="px-5 py-3 text-right text-sky-600">{fmt(results.mid.remedy.legacyOption.lumpSum)}</td><td className="px-5 py-3 text-right text-slate-400 text-xs">{results.mid.legacy.erf.toFixed(3)}</td></tr>
                        <tr className="bg-emerald-50/30"><td className="px-5 py-3 font-medium text-emerald-800">Remedy (CARE)<br/><span className="text-[10px] text-emerald-500">Draw age {results.careDrawAge.years}</span></td><td className="px-5 py-3 text-right text-emerald-700">{fmt(results.mid.remedy.careOption.pension)}</td><td className="px-5 py-3 text-right text-slate-400">—</td><td className="px-5 py-3 text-right text-slate-400 text-xs">{results.mid.care.erf.toFixed(3)}</td></tr>
                        <tr><td className="px-5 py-3 font-medium">CARE — Accrued<br/><span className="text-[10px] text-slate-400">Draw age {results.careDrawAge.years}</span></td><td className="px-5 py-3 text-right">{fmt(results.mid.care.accruedPast)}</td><td className="px-5 py-3 text-right text-slate-400">—</td><td className="px-5 py-3 text-right text-slate-400 text-xs">{results.mid.care.erf.toFixed(3)}</td></tr>
                        <tr><td className="px-5 py-3 font-medium">CARE — Future<br/><span className="text-[10px] text-slate-400">Draw age {results.careDrawAge.years}</span></td><td className="px-5 py-3 text-right">{fmt(results.mid.care.projectedFuture)}</td><td className="px-5 py-3 text-right text-slate-400">—</td><td className="px-5 py-3 text-right text-slate-400 text-xs">{results.mid.care.erf.toFixed(3)}</td></tr>
                        {results.mid.flexibilities.additionalPension.addedPension > 0 && <tr><td className="px-5 py-3 font-medium">Additional Pension</td><td className="px-5 py-3 text-right">{fmt(results.mid.flexibilities.additionalPension.addedPension)}</td><td className="px-5 py-3 text-right text-slate-400">—</td><td className="px-5 py-3" /></tr>}
                        {results.mid.flexibilities.addedYears.addedPension > 0 && <tr><td className="px-5 py-3 font-medium">Added Years</td><td className="px-5 py-3 text-right">{fmt(results.mid.flexibilities.addedYears.addedPension)}</td><td className="px-5 py-3 text-right text-slate-500">{fmt(results.mid.flexibilities.addedYears.addedLumpSum)}</td><td className="px-5 py-3" /></tr>}
                        <tr className="bg-slate-50 font-semibold"><td className="px-5 py-3">Total (best remedy)</td><td className="px-5 py-3 text-right text-sky-700">{fmt(results.mid.totalPension)}</td><td className="px-5 py-3 text-right">{fmt(results.mid.legacy.lumpSum + results.mid.remedy.legacyOption.lumpSum)}</td><td className="px-5 py-3" /></tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* SURVIVORS */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Users size={16} className="text-sky-500" /> Survivor Benefits<Tooltip text="Estimated annual dependant pension based on unreduced pension." /></h3></CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {basisResults.map(({ label, key, data }) => (
                        <div key={key} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">{label}</p>
                          <p className="text-lg font-light">{fmt(data.survivor.total)}<span className="text-sm text-slate-400">/yr</span></p>
                          <p className="text-xs text-slate-500 mt-1">Legacy: {fmt(data.survivor.legacyPension)} · CARE: {fmt(data.survivor.carePension)}</p>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>

                {inputs.errboYears > 0 && <Card><CardHeader><h3 className="text-sm font-semibold text-slate-700">ERRBO Impact</h3></CardHeader><CardBody>
                  <p className="text-sm">Buying out <strong>{inputs.errboYears} year{inputs.errboYears > 1 ? 's' : ''}</strong>. Effective NPA: <strong>{results.mid.flexibilities.errbo.effectiveNPA}</strong> (was {results.spa}).</p>
                  <p className="text-sm text-slate-500 mt-2">Cost: {formatCurrency(results.mid.flexibilities.errbo.grossAnnualCost)}/yr gross ({formatCurrency(results.mid.flexibilities.errbo.netAnnualCost)}/yr net)</p>
                </CardBody></Card>}

                <div className="text-[10px] text-slate-400 space-y-1 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-semibold text-slate-500 uppercase tracking-wider mb-2">Important Information</p>
                  <p>This calculator is for guidance only. Not financial advice.</p>
                  <p>Remedy comparison is an approximation. Use SPPA's Remedy Calculator for definitive figures.</p>
                  <p>Does not account for AVCs, pension debits, pension sharing, or ill-health retirement.</p>
                  <p>Factors v{DATA_VERSION.version} updated {DATA_VERSION.lastUpdated}. May change.</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
