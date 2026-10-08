import type { HTMLAttributes } from "react";
import { cx } from "@/lib/classes";

export function Cartao({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div {...props} className={cx("rounded-2xl border border-tema-borda bg-tema-superficie p-5", className)} />;
}
