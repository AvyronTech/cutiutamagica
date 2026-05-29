import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

type Props = {
  to?: string;
  label?: string;
};

export function BackButton({ to = "/", label = "Înapoi acasă" }: Props) {
  return (
    <Link
      to={to}
      className="group inline-flex items-center gap-2 rounded-full pl-2 pr-4 py-1.5 text-sm font-medium text-[color:var(--wood-dark)] bg-[color:var(--gold)]/15 border border-[color:var(--gold)]/40 shadow-soft hover:bg-[color:var(--gold)]/30 hover:shadow-warm transition-all"
    >
      <span className="flex items-center justify-center w-7 h-7 rounded-full bg-[color:var(--cream)] border border-[color:var(--gold)]/50 group-hover:-translate-x-0.5 transition-transform">
        <ArrowLeft className="w-3.5 h-3.5" />
      </span>
      {label}
    </Link>
  );
}
