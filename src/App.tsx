import { useState, useMemo } from 'react';
import { Calculator, Shield, TrendingUp, PiggyBank, Users, BarChart3, Clock, Menu, X, Download, Sliders } from 'lucide-react';
import type { PensionInputs, ChosenResult } from './lib/types';
import { DEFAULT_INPUTS } from './lib/types';
import { calculatePension } from './lib/calculations/engine';
import { formatCurrency, parseDate } from './lib/utils';
import { calculateScottishTax } from './lib/data/spaAndTax';
import { DATA_VERSION } from './lib/data/erfTables';
import { Card, CardHeader, CardBody, SectionTitle, CollapsibleSection, InputField, SelectField, Toggle, Tooltip } from './components/ui';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, Legend, ResponsiveContainer } from 'recharts';
import type { SingleBasisResult } from './lib/types';

function buildChosen(r: SingleBasisResult, inputs: PensionInputs, legDA: number, careDA: number): ChosenResult {
  const rem = inputs.remedyChoice;
  const cp = inputs.commutationPercent / 100;
  const remPen = rem === 'legacy' ? r.remedy.legacyOption.pension : r.remedy.careOption.pension;
  const remLS = rem === 'legacy' ? r.remedy.legacyOption.lumpSum : 0;
  const preComm = r.legacy.pension + r.care.pension + remPen + r.flexibilities.additionalPension.addedPension;
  const autoLS = r.legacy.lumpSum + remLS;
  const lcPen = r.commutationLegacy.maxCommutablePension * cp;
  const lcLS = lcPen * r.commutationLegacy.commutationFactor;
  const ccPen = r.commutationCare.maxCommutablePension * cp;
  const ccLS = ccPen * r.commutationCare.commutationFactor;
  const pension = preComm - lcPen - ccPen;
  const lumpSum = autoLS + lcLS + ccLS;

  const components: ChosenResult['components'] = [
    { label: `Pre-2015 Legacy (${inputs.legacyScheme})`, pension: r.legacy.pension, lumpSum: r.legacy.lumpSum, factor: r.legacy.erf, drawAge: legDA },
  ];
  if (rem === 'legacy') {
    components.push({ label: 'Remedy 2015–22 (Legacy rules)', pension: r.remedy.legacyOption.pension, lumpSum: r.remedy.legacyOption.lumpSum, factor: r.legacy.erf, drawAge: legDA, highlight: 'legacy' });
  } else {
    components.push({ label: 'Remedy 2015–22 (CARE rules)', pension: r.remedy.careOption.pension, lumpSum: 0, factor: r.care.erf, drawAge: careDA, highlight: 'care' });
  }
  components.push(
    { label: 'CARE — Accrued to date', pension: r.care.accruedPast, lumpSum: 0, factor: r.care.erf, drawAge: careDA },
    { label: 'CARE — Projected future', pension: r.care.projectedFuture, lumpSum: 0, factor: r.care.erf, drawAge: careDA },
  );
  if (r.flexibilities.additionalPension.addedPension > 0) components.push({ label: 'Additional Pension', pension: r.flexibilities.additionalPension.addedPension, lumpSum: 0, factor: r.care.erf, drawAge: careDA });
  if (r.flexibilities.addedYears.addedPension > 0) components.push({ label: 'Added Years', pension: r.flexibilities.addedYears.addedPension, lumpSum: r.flexibilities.addedYears.addedLumpSum, factor: r.legacy.erf, drawAge: legDA });
  if (cp > 0) components.push({ label: `Commutation (${Math.round(cp * 100)}% of max)`, pension: -(lcPen + ccPen), lumpSum: lcLS + ccLS, factor: 0, drawAge: 0 });

  return { pension: Math.round(pension), lumpSum: Math.round(lumpSum), monthlyPension: Math.round(pension / 12), components };
}

export default function App() {
  const [inputs, setInputs] = useState<PensionInputs>(DEFAULT_INPUTS);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'projection' | 'abscheck'>('projection');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setInputs(prev => ({ ...prev, [name]: type === 'number' ? (value === '' ? 0 : Number(value)) : value }));
  };
  const handleToggle = (name: string) => (checked: boolean) => setInputs(prev => ({ ...prev, [name]: checked }));
  const setChoice = (name: string, value: string | number) => setInputs(prev => ({ ...prev, [name]: value }));

  const results = useMemo(() => calculatePension(inputs), [inputs]);

  const yToRet = results ? (parseDate(inputs.retirementDate).getTime() - new Date().getTime()) / (365.25 * 24 * 60 * 60 * 1000) : 0;
  const nm = inputs.showNominal ? Math.pow(1 + inputs.assumedCpi / 100, yToRet) : 1;
  const fmt = (v: number) => formatCurrency(v * nm);

  const legDA = results ? results.legacyDrawAge.years : 60;
  const careDA = results ? results.careDrawAge.years : 68;

  const chosenMid = results ? buildChosen(results.mid, inputs, legDA, careDA) : null;
  const chosenLow = results ? buildChosen(results.low, inputs, legDA, careDA) : null;
  const chosenHigh = results ? buildChosen(results.high, inputs, legDA, careDA) : null;

  const chosenAll = chosenLow && chosenMid && chosenHigh ? [
    { label: 'CPI + 0%', key: 'low', chosen: chosenLow, raw: results!.low },
    { label: 'CPI + 1%', key: 'mid', chosen: chosenMid, raw: results!.mid },
    { label: 'CPI + 2%', key: 'high', chosen: chosenHigh, raw: results!.high },
  ] : [];

  const retAge = results ? results.ageAtRetirement.years : 60;
  const legNPA = results ? results.legacyNPA : 60;
  const spa = results ? results.spa : 68;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="flex items-center gap-2"><div className="bg-sky-600 p-1.5 rounded-lg text-white"><Calculator size={18} /></div><span className="font-semibold text-sm">NHS Pension Calculator</span></div>
        <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2">{sidebarOpen ? <X size={20} /> : <Menu size={20} />}</button>
      </div>

      <div className="flex flex-col md:flex-row">
        {/* SIDEBAR */}
        <div className={`${sidebarOpen ? 'block' : 'hidden'} md:block w-full md:w-[380px] bg-white border-r border-slate-200 md:h-screen md:overflow-y-auto md:sticky md:top-0 shrink-0 z-20 print:hidden`}>
          <div className="p-5 space-y-5">
            <div className="hidden md:flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="bg-sky-600 p-2 rounded-xl text-white"><Calculator size={22} /></div>
              <div><h1 className="text-lg font-semibold tracking-tight">NHS Scotland Pension</h1><p className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Projection Calculator</p></div>
            </div>

            <section className="space-y-3">
              <SectionTitle><Shield size={14} className="text-sky-500" /> Your Details</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Date of Birth" name="dateOfBirth" type="date" value={inputs.dateOfBirth} onChange={handleChange} />
                <InputField label="Date Joined" name="dateJoinedScheme" type="date" value={inputs.dateJoinedScheme} onChange={handleChange} />
              </div>
              <InputField label="Name (optional)" name="name" type="text" value={inputs.name} onChange={handleChange} />
              <SelectField label="Legacy Scheme" name="legacyScheme" value={inputs.legacyScheme} onChange={handleChange}
                options={[{ value: '1995', label: '1995 Section (1/80th + auto lump sum)' }, { value: '2008', label: '2008 Section (1/60th)' }]} />
              <InputField label="Pensionable Pay (FTE) £" name="currentPay" value={inputs.currentPay} onChange={handleChange} />
              <InputField label="Stop Working Date" name="retirementDate" type="date" value={inputs.retirementDate} onChange={handleChange} tooltip="When you leave NHS employment. Benefits stop accruing." />
            </section>

            {/* DRAW AGES */}
            <section className="space-y-3">
              <SectionTitle><Sliders size={14} className="text-sky-500" /> When to Draw Pension</SectionTitle>
              <p className="text-[10px] text-slate-500">Set the age you want to start receiving each pension. Legacy NPA is {legNPA}, CARE NPA is {spa} (SPA). Drawing before NPA applies an early retirement reduction.</p>
              <div className="grid grid-cols-2 gap-3">
                <InputField label={`Legacy draw age (NPA ${legNPA})`} name="legacyDrawAge" value={inputs.legacyDrawAge} onChange={handleChange} tooltip="Age to start legacy pension. 0 = same as retirement." min="0" max="75" />
                <InputField label={`CARE draw age (NPA ${spa})`} name="careDrawAge" value={inputs.careDrawAge} onChange={handleChange} tooltip="Age to start CARE pension. 0 = same as retirement." min="0" max="75" />
              </div>
            </section>

            {/* YOUR CHOICES */}
            <section className="space-y-3">
              <SectionTitle><Shield size={14} className="text-sky-500" /> Your Choices</SectionTitle>
              <SelectField label="McCloud Remedy choice" name="remedyChoice" value={inputs.remedyChoice}
                onChange={(e) => setChoice('remedyChoice', e.target.value)}
                options={[{ value: 'legacy', label: 'Legacy rules for 2015–22' }, { value: 'care', label: 'CARE rules for 2015–22' }]}
                tooltip="Which rules to apply for the remedy period. You choose at retirement." />
              <div className="space-y-1">
                <label className="text-[11px] font-medium text-slate-600 flex items-center">Commutation (%)<Tooltip text="How much of the maximum commutation to take. 100% = max lump sum, 0% = no commutation." /></label>
                <input type="range" min="0" max="100" step="25" value={inputs.commutationPercent} onChange={(e) => setChoice('commutationPercent', Number(e.target.value))}
                  className="w-full accent-sky-500" />
                <div className="flex justify-between text-[10px] text-slate-400"><span>No commutation</span><span>{inputs.commutationPercent}%</span><span>Max lump sum</span></div>
              </div>
            </section>

            <section className="space-y-3">
              <Toggle label="Part-time" checked={inputs.isPartTime} onChange={handleToggle('isPartTime')} />
              {inputs.isPartTime && <InputField label="FTE Proportion" name="currentFteProportion" step="0.01" min="0.01" max="1" value={inputs.currentFteProportion} onChange={handleChange} />}
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
                <InputField label="Transfer-in (yrs)" name="transferInYears" value={inputs.transferInYears} onChange={handleChange} />
                <InputField label="Transfer-in (days)" name="transferInDays" value={inputs.transferInDays} onChange={handleChange} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <InputField label="Added Years" name="addedYears" value={inputs.addedYears} onChange={handleChange} />
                <InputField label="Added Days" name="addedDays" value={inputs.addedDays} onChange={handleChange} />
              </div>
            </CollapsibleSection>

            <CollapsibleSection title="Scheme Flexibilities">
              <InputField label="Additional Pension (£/yr)" name="additionalPensionAmount" step="250" value={inputs.additionalPensionAmount} onChange={handleChange} />
              <InputField label="ERRBO (years)" name="errboYears" step="1" min="0" max="5" value={inputs.errboYears} onChange={handleChange} />
            </CollapsibleSection>

            <CollapsibleSection title="Assumptions">
              <InputField label="Assumed CPI (%)" name="assumedCpi" step="0.1" value={inputs.assumedCpi} onChange={handleChange} />
              <Toggle label="Historical CPI (2015–25)" checked={inputs.useHistoricalCpi} onChange={handleToggle('useHistoricalCpi')} />
              <Toggle label="Show future money (nominal)" checked={inputs.showNominal} onChange={handleToggle('showNominal')} />
            </CollapsibleSection>

            <p className="text-[9px] text-slate-400 pt-2 border-t border-slate-100">Factors v{DATA_VERSION.version} · {DATA_VERSION.lastUpdated}</p>
          </div>
        </div>

        {/* RESULTS */}
        <div className="flex-1 p-4 md:p-8 md:overflow-y-auto md:h-screen">
          <div className="max-w-5xl mx-auto space-y-6">
            <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 print:hidden">
              <div>
                <h2 className="text-2xl md:text-3xl font-light tracking-tight">{inputs.name ? `${inputs.name}'s ` : ''}Projection</h2>
                {results && <p className="text-slate-500 text-sm mt-1">
                  Stop work {retAge} · Legacy draw {legDA} · CARE draw {careDA}
                  {' · '}{results.protectionStatus.status === 'full' ? 'Protected' : results.protectionStatus.status === 'tapered' ? 'Tapered' : 'Unprotected'}
                  {' · Remedy: '}{inputs.remedyChoice} · Commutation: {inputs.commutationPercent}%
                  {inputs.showNominal ? ' · Future money' : ""}
                </p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setActiveTab('projection')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'projection' ? 'bg-sky-100 text-sky-700' : 'bg-white text-slate-600'}`}><BarChart3 size={14} className="inline mr-1" />Projection</button>
                {inputs.useAbsData && <button onClick={() => setActiveTab('abscheck')} className={`px-3 py-1.5 rounded-lg text-xs font-medium ${activeTab === 'abscheck' ? 'bg-sky-100 text-sky-700' : 'bg-white text-slate-600'}`}><Clock size={14} className="inline mr-1" />Check ABS</button>}
                <button onClick={() => window.print()} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-lg text-xs font-medium hover:bg-slate-50 flex items-center gap-1"><Download size={14} />PDF</button>
              </div>
            </header>

            {!results || !chosenMid ? (
              <Card className="p-12 text-center"><p className="text-slate-400">Enter your details to see your projection.</p></Card>
            ) : activeTab === 'abscheck' && results.absCheck ? (
              <Card>
                <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Clock size={16} className="text-sky-500" /> What Should Your Next ABS Show?</h3></CardHeader>
                <CardBody>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[{ label: 'Legacy Pension', prev: inputs.absLegacyPension, proj: results.absCheck.projectedLegacyPension },
                      { label: 'Legacy Lump Sum', prev: inputs.absLegacyLumpSum, proj: results.absCheck.projectedLegacyLumpSum },
                      { label: 'CARE Pension', prev: inputs.absCarePension, proj: results.absCheck.projectedCarePension }
                    ].map(i => <div key={i.label} className="space-y-2"><p className="text-[10px] font-semibold text-slate-500 uppercase">{i.label}</p><p className="text-xs text-slate-500">Last: {formatCurrency(i.prev)}</p><p className="text-lg font-semibold text-sky-700">→ {formatCurrency(i.proj)}</p></div>)}
                  </div>
                </CardBody>
              </Card>
            ) : (
              <>
                {/* KEY METRICS */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {chosenAll.map(({ label, key, chosen }) => (
                    <Card key={key} className={key === 'mid' ? 'ring-2 ring-sky-300' : ''}>
                      <CardBody>
                        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-3">{label} {key === 'mid' && <span className="text-sky-600">· Central</span>}</p>
                        <p className="text-2xl font-light tracking-tight">{fmt(chosen.pension)}<span className="text-sm text-slate-400">/yr</span></p>
                        <p className="text-xs text-slate-500 mt-1">{fmt(chosen.monthlyPension)}/month</p>
                        {chosen.lumpSum > 0 && <p className="text-xs text-slate-500 mt-1">+ {fmt(chosen.lumpSum)} lump sum</p>}
                      </CardBody>
                    </Card>
                  ))}
                </div>

                {/* REMEDY COMPARISON */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Shield size={16} className="text-sky-500" /> McCloud Remedy — Your Choice
                    <Tooltip text="Total pension under each remedy choice. Click to select. All results below will update." /></h3></CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <button onClick={() => setChoice('remedyChoice', 'legacy')} className={`p-4 rounded-xl border-2 text-left transition-all ${inputs.remedyChoice === 'legacy' ? 'border-sky-400 bg-sky-50/50 ring-1 ring-sky-200' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold">Legacy rules for 2015–22</span>
                          {inputs.remedyChoice === 'legacy' && <span className="text-[9px] bg-sky-100 text-sky-700 px-2 py-0.5 rounded-full font-bold">SELECTED</span>}
                          {results.mid.remedy.betterOption === 'legacy' && inputs.remedyChoice !== 'legacy' && <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">RECOMMENDED</span>}
                        </div>
                        <p className="text-2xl font-light">{fmt(results.mid.remedy.totalWithLegacyRemedy.pension)}<span className="text-sm text-slate-400">/yr</span></p>
                        {results.mid.remedy.totalWithLegacyRemedy.lumpSum > 0 && <p className="text-xs text-slate-500 mt-1">+ {fmt(results.mid.remedy.totalWithLegacyRemedy.lumpSum)} auto lump sum</p>}
                      </button>
                      <button onClick={() => setChoice('remedyChoice', 'care')} className={`p-4 rounded-xl border-2 text-left transition-all ${inputs.remedyChoice === 'care' ? 'border-emerald-400 bg-emerald-50/50 ring-1 ring-emerald-200' : 'border-slate-200 hover:border-slate-300'}`}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-sm font-semibold">CARE rules for 2015–22</span>
                          {inputs.remedyChoice === 'care' && <span className="text-[9px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">SELECTED</span>}
                          {results.mid.remedy.betterOption === 'care' && inputs.remedyChoice !== 'care' && <span className="text-[9px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">RECOMMENDED</span>}
                        </div>
                        <p className="text-2xl font-light">{fmt(results.mid.remedy.totalWithCareRemedy.pension)}<span className="text-sm text-slate-400">/yr</span></p>
                        {results.mid.remedy.totalWithCareRemedy.lumpSum > 0 && <p className="text-xs text-slate-500 mt-1">+ {fmt(results.mid.remedy.totalWithCareRemedy.lumpSum)} auto lump sum</p>}
                      </button>
                    </div>
                    <p className="text-xs text-slate-500 mt-3 text-center">Difference: {fmt(Math.abs(results.mid.remedy.difference))}/yr · <span className="text-amber-600">Approximation — use SPPA Remedy Calculator for definitive figures</span></p>
                  </CardBody>
                </Card>

                {/* BREAKDOWN */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><TrendingUp size={16} className="text-sky-500" /> Breakdown (Central) — Your Choices Applied</h3></CardHeader>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase tracking-wider">
                        <tr><th className="px-5 py-3 text-left">Component</th><th className="px-5 py-3 text-right">Pension</th><th className="px-5 py-3 text-right">Lump Sum</th><th className="px-5 py-3 text-right">Factor</th></tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {chosenMid.components.map((c, i) => (
                          <tr key={i} className={c.highlight === 'legacy' ? 'bg-sky-50/30' : c.highlight === 'care' ? 'bg-emerald-50/30' : c.pension < 0 ? 'bg-amber-50/30' : ''}>
                            <td className="px-5 py-3">
                              <span className={`font-medium ${c.highlight === 'legacy' ? 'text-sky-800' : c.highlight === 'care' ? 'text-emerald-800' : c.pension < 0 ? 'text-amber-700' : ''}`}>{c.label}</span>
                              {c.drawAge > 0 && <><br /><span className="text-[10px] text-slate-400">Draw age {c.drawAge}</span></>}
                            </td>
                            <td className={`px-5 py-3 text-right ${c.pension < 0 ? 'text-amber-600' : ''}`}>{c.pension < 0 ? '−' : ''}{fmt(Math.abs(c.pension))}</td>
                            <td className="px-5 py-3 text-right text-slate-500">{c.lumpSum > 0 ? fmt(c.lumpSum) : '—'}</td>
                            <td className="px-5 py-3 text-right text-slate-400 text-xs">{c.factor > 0 ? c.factor.toFixed(3) : '—'}</td>
                          </tr>
                        ))}
                        <tr className="bg-slate-50 font-semibold">
                          <td className="px-5 py-3">Your Projected Total</td>
                          <td className="px-5 py-3 text-right text-sky-700">{fmt(chosenMid.pension)}</td>
                          <td className="px-5 py-3 text-right">{fmt(chosenMid.lumpSum)}</td>
                          <td className="px-5 py-3" />
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </Card>

                {/* TAX */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><PiggyBank size={16} className="text-sky-500" /> Net Pension (Scottish Tax)</h3></CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {chosenAll.map(({ label, key, chosen }) => {
                        const tax = calculateScottishTax(chosen.pension * nm);
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

                {/* CHART */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><BarChart3 size={16} className="text-sky-500" /> Composition</h3></CardHeader>
                  <CardBody className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chosenAll.map(({ label, chosen }) => ({ name: label.replace('CPI + ', ''), Pension: chosen.pension * nm, 'Lump Sum': chosen.lumpSum * nm }))} margin={{ top: 10, right: 20, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 11 }} tickFormatter={v => `£${Math.round(v/1000)}k`} />
                        <RTooltip formatter={(v) => formatCurrency(v as number)} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgb(0 0 0 / 0.1)' }} />
                        <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                        <Bar dataKey="Pension" fill="#0284c7" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Lump Sum" fill="#059669" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardBody>
                </Card>

                {/* SURVIVORS */}
                <Card>
                  <CardHeader><h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2"><Users size={16} className="text-sky-500" /> Survivor Benefits</h3></CardHeader>
                  <CardBody>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {chosenAll.map(({ label, key, raw }) => (
                        <div key={key} className="p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <p className="text-[10px] font-semibold text-slate-500 uppercase mb-2">{label}</p>
                          <p className="text-lg font-light">{fmt(raw.survivor.total)}<span className="text-sm text-slate-400">/yr</span></p>
                          <p className="text-xs text-slate-500 mt-1">Legacy: {fmt(raw.survivor.legacyPension)} · CARE: {fmt(raw.survivor.carePension)}</p>
                        </div>
                      ))}
                    </div>
                  </CardBody>
                </Card>

                {inputs.errboYears > 0 && <Card><CardBody>
                  <p className="text-sm"><strong>ERRBO:</strong> Buying out {inputs.errboYears} year{inputs.errboYears > 1 ? 's' : ''}. Effective NPA: {results.mid.flexibilities.errbo.effectiveNPA} (was {spa}). Cost: {formatCurrency(results.mid.flexibilities.errbo.grossAnnualCost)}/yr gross.</p>
                </CardBody></Card>}

                <div className="text-[10px] text-slate-400 space-y-1 bg-slate-50 rounded-xl p-4 border border-slate-200">
                  <p className="font-semibold text-slate-500 uppercase tracking-wider mb-2">Important</p>
                  <p>For guidance only. Not financial advice. Remedy is an approximation. Factors v{DATA_VERSION.version} ({DATA_VERSION.lastUpdated}).</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
