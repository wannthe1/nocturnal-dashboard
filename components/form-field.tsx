// A labelled form row, shared by the add/edit forms.
export function Field({
  label,
  htmlFor,
  hint,
  wide,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`space-y-1.5 ${wide ? "sm:col-span-2" : ""}`}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-muted">{label}</label>
      {children}
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </div>
  );
}
