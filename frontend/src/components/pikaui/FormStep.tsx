"use client";

interface Field {
  label: string;
  value: string;
  type: string;
  filled: boolean;
}

interface FormStepProps {
  title: string;
  fields: Field[];
  step: number;
  totalSteps: number;
}

export function FormStep({ title, fields, step, totalSteps }: FormStepProps) {
  const progress = (step / totalSteps) * 100;
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-white font-semibold text-sm">{title}</h3>
        <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">Step {step}/{totalSteps}</span>
      </div>
      <div className="h-1 bg-zinc-800 rounded-full mb-4 overflow-hidden">
        <div className="h-full bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
      <div className="space-y-2">
        {fields.map((field: Field, i: number) => (
          <div key={i} className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${field.filled ? "bg-emerald-500/5 border-emerald-500/20" : "bg-zinc-800/50 border-zinc-700/50"}`}>
            <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${field.filled ? "bg-emerald-500" : "border border-zinc-600"}`}>
              {field.filled && <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] text-zinc-500">{field.label}</p>
              <p className={`text-sm truncate ${field.filled ? "text-white" : "text-zinc-600 italic"}`}>{field.filled ? field.value : "Waiting..."}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
