import type { ReactNode } from "react";

/**
 * Tiny shared UI kit for the authenticated app - keeps the Kindred design
 * language (cream canvas, card surfaces, Spectral headings) consistent
 * across client, professional and admin areas.
 */

export function PageHeading({
  eyebrow,
  title,
  intro,
  actions,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
      <div className="max-w-xl">
        {eyebrow && (
          <span className="text-[13px] font-bold uppercase tracking-wider text-green">
            {eyebrow}
          </span>
        )}
        <h1 className="font-serif text-3xl md:text-4xl font-normal text-ink mt-1">
          {title}
        </h1>
        {intro && <p className="text-muted mt-2 text-[15px]">{intro}</p>}
      </div>
      {actions && <div className="flex gap-3">{actions}</div>}
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-card border border-hairline rounded-2xl p-6 ${className}`}
    >
      {children}
    </div>
  );
}

export function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
}) {
  return (
    <Card>
      <div className="text-[13px] font-semibold uppercase tracking-wide text-faint">
        {label}
      </div>
      <div className="font-serif text-3xl text-ink mt-2">{value}</div>
      {hint && <div className="text-[13px] text-muted mt-1">{hint}</div>}
    </Card>
  );
}

const complianceStyles: Record<string, string> = {
  green: "bg-green/10 text-green",
  amber: "bg-tan/30 text-[#7a6a3d]",
  red: "bg-red-100 text-red-700",
};

export function CompliancePill({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[13px] font-semibold capitalize ${complianceStyles[status] ?? "bg-sand text-muted"}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

const tierStyles: Record<string, string> = {
  bronze: "bg-[#a5713d]/15 text-[#8a5a2b]",
  silver: "bg-[#8a9a92]/20 text-[#5c6a63]",
  gold: "bg-tan/40 text-[#7a6432]",
  platinum: "bg-ink text-cream",
};

export function TierBadge({ tier }: { tier: string }) {
  if (!tier || tier === "none") return null;
  return (
    <span
      className={`inline-flex px-3 py-1 rounded-full text-[12px] font-bold uppercase tracking-wide ${tierStyles[tier] ?? ""}`}
    >
      {tier}
    </span>
  );
}

export function Button({
  children,
  variant = "primary",
  ...props
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const styles = {
    primary:
      "bg-green text-cream hover:bg-green-dark disabled:opacity-50 disabled:cursor-not-allowed",
    secondary:
      "bg-transparent text-ink border border-hairline-strong hover:border-green hover:text-green",
    danger: "bg-red-700 text-white hover:bg-red-800",
  }[variant];
  return (
    <button
      {...props}
      className={`px-5 py-2.5 rounded-full font-semibold text-[15px] transition-colors ${styles} ${props.className ?? ""}`}
    >
      {children}
    </button>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: ReactNode;
}) {
  return (
    <Card className="text-center py-14">
      <h3 className="font-serif text-xl text-ink">{title}</h3>
      <p className="text-muted text-[15px] mt-2 max-w-md mx-auto">{body}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </Card>
  );
}
