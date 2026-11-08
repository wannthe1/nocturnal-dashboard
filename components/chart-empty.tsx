import { SalesIcon } from "@/components/icons";

// What a chart shows before there's data: says what will appear here.
export function ChartEmpty({ text, height = "h-52" }: { text: string; height?: string }) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 rounded-2xl bg-sunken px-6 text-center ${height}`}>
      <span className="grid h-10 w-10 place-items-center rounded-full bg-accent-soft text-accent-text">
        <SalesIcon />
      </span>
      <p className="max-w-sm text-sm leading-relaxed text-muted">{text}</p>
    </div>
  );
}
