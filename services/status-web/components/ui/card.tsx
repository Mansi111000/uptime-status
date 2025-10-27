import { ReactNode } from "react";

type Props = { className?: string; children?: ReactNode };

export function Card({ className = "", children }: Props) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function CardHeader({ className = "", children }: Props) {
  return <div className={`px-6 pt-5 pb-3 ${className}`}>{children}</div>;
}

export function CardTitle({ className = "", children }: Props) {
  return <h3 className={`text-lg font-semibold ${className}`}>{children}</h3>;
}

export function CardContent({ className = "", children }: Props) {
  return <div className={`px-6 pb-6 ${className}`}>{children}</div>;
}
