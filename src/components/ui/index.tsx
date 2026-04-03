import React, { useState } from 'react';
import { Info, ChevronDown, ChevronUp } from 'lucide-react';

export function Tooltip({ text }: { text: string }) {
  return (
    <span className="relative group inline-flex items-center ml-1.5">
      <Info size={13} className="text-slate-400 hover:text-sky-500 cursor-help transition-colors" />
      <span className="absolute bottom-full left-0 -translate-x-2 mb-2 hidden group-hover:block w-60 p-2.5 bg-slate-800 text-white text-xs rounded-lg shadow-xl z-50 font-normal leading-relaxed pointer-events-none">
        {text}
        <span className="absolute top-full left-4 border-4 border-transparent border-t-slate-800" />
      </span>
    </span>
  );
}

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-xl border border-slate-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`px-5 py-4 border-b border-slate-100 ${className}`}>
      {children}
    </div>
  );
}

export function CardBody({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`p-5 ${className}`}>{children}</div>;
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
      {children}
    </h2>
  );
}

export function CollapsibleSection({
  title,
  defaultOpen = false,
  children,
  badge,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
  badge?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-slate-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 hover:bg-slate-100 transition-colors text-left"
      >
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-2">
          {title}
          {badge && (
            <span className="bg-sky-100 text-sky-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full normal-case tracking-normal">
              {badge}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
      </button>
      {open && <div className="p-4 space-y-3 bg-white">{children}</div>}
    </div>
  );
}

export function InputField({
  label, name, type = 'number', value, onChange, tooltip, step, disabled, min, max, error
}: {
  label: string; name: string; type?: string; value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  tooltip?: string; step?: string; disabled?: boolean; min?: string; max?: string; error?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-600 flex items-center">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        step={step}
        disabled={disabled}
        min={min}
        max={max}
        className={`w-full px-3 py-2 bg-slate-50 border rounded-lg text-sm transition-all
          focus:outline-none focus:ring-2 focus:bg-white
          ${error ? 'border-red-400 focus:ring-red-200' : 'border-slate-200 focus:ring-sky-200 focus:border-sky-400'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-slate-300'}
        `}
      />
      {error && <p className="text-[10px] text-red-500 font-medium">{error}</p>}
    </div>
  );
}

export function SelectField({
  label, name, value, onChange, options, tooltip
}: {
  label: string; name: string; value: string;
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  options: { value: string; label: string }[];
  tooltip?: string;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-slate-600 flex items-center">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </label>
      <select
        name={name}
        value={value}
        onChange={onChange}
        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm
          focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 hover:border-slate-300"
      >
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

export function Toggle({
  label, checked, onChange, tooltip
}: {
  label: string; checked: boolean;
  onChange: (checked: boolean) => void;
  tooltip?: string;
}) {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors
          ${checked ? 'bg-sky-500' : 'bg-slate-300'}`}
      >
        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transform transition-transform mt-0.5
          ${checked ? 'translate-x-4 ml-0.5' : 'translate-x-0.5'}`} />
      </button>
      <span className="text-xs font-medium text-slate-700 flex items-center">
        {label}
        {tooltip && <Tooltip text={tooltip} />}
      </span>
    </label>
  );
}

export function StatCard({
  label, value, subValue, highlight, className = ''
}: {
  label: string; value: string; subValue?: string; highlight?: boolean; className?: string;
}) {
  return (
    <div className={`p-4 rounded-xl border ${highlight ? 'border-sky-300 bg-sky-50/50' : 'border-slate-100 bg-slate-50'} ${className}`}>
      <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-light tracking-tight ${highlight ? 'text-sky-700' : 'text-slate-900'}`}>{value}</p>
      {subValue && <p className="text-xs text-slate-500 mt-1">{subValue}</p>}
    </div>
  );
}
