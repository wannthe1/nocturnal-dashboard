"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import { Segmented, type SegmentedItem } from "@/components/segmented";

// Filter pills that are real links. The thumb moves the moment you tap, and the
// old figures dim (see [data-pending] in globals.css) until the new ones arrive.
export function LinkSegmented({
  items,
  value,
  label,
}: {
  items: (SegmentedItem & { href: string })[];
  value: string;
  label: string;
}) {
  const router = useRouter();
  const [shown, setShown] = useOptimistic(value);
  const [pending, startTransition] = useTransition();

  return (
    <div data-pending={pending} className="contents">
      <Segmented
        items={items}
        value={shown}
        label={label}
        renderItem={(item, props) => (
          <Link
            key={item.key}
            href={item.href!}
            scroll={false}
            prefetch={true}
            {...props}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.shiftKey) return;
              e.preventDefault();
              startTransition(() => {
                setShown(item.key);
                router.push(item.href!, { scroll: false });
              });
            }}
          >
            {item.label}
          </Link>
        )}
      />
    </div>
  );
}
