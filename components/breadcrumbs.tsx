import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

// "Inventory › Add item" trail at the top of sub-pages.
export function Breadcrumbs({ items, label }: { items: { label: string; href?: string }[]; label: string }) {
  return (
    <nav aria-label={label}>
      <ol className="flex flex-wrap items-center gap-1 text-sm text-faint">
        {items.map((item, i) => (
          <li key={item.label} className="flex items-center gap-1">
            {i > 0 && <ChevronRightIcon className="h-3.5 w-3.5" />}
            {item.href ? (
              <Link href={item.href} className="transition-colors hover:text-ink">{item.label}</Link>
            ) : (
              <span aria-current="page" className="max-w-[16rem] truncate text-ink">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
