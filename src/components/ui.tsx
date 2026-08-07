import type { Health, Priority, TaskStatus } from "@/lib/domain";

export function Header({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <header className="pageHead"><div className="eyebrow">{eyebrow}</div><h1>{title}</h1><p>{description}</p></header>;
}

export function Status({ value }: { value: TaskStatus }) {
  return <span className={`pill status-${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

export function PriorityTag({ value }: { value: Priority }) {
  return <span className={`priority ${value.toLowerCase()}`}>{value}</span>;
}

export function HealthTag({ value }: { value: Health }) {
  return <span className={`pill health-${value.toLowerCase().replaceAll(" ", "-")}`}>{value}</span>;
}

export function Progress({ value }: { value: number }) {
  return <div className="bar"><i style={{ width: `${value}%` }} /></div>;
}
