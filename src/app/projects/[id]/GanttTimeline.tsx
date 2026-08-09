import type { CSSProperties } from "react";
import type { DevelopmentWorkPackage } from "@/lib/domain";

type GanttTimelineProps = {
  packages: ReadonlyArray<DevelopmentWorkPackage>;
  projectStart?: string;
  projectEnd?: string;
};

type DatedWorkPackage = DevelopmentWorkPackage & {
  start: string;
  end: string;
};

type PhaseGroup = {
  phase: string;
  packages: DatedWorkPackage[];
};

const DAY_MS = 86_400_000;

export function GanttTimeline({ packages, projectStart, projectEnd }: GanttTimelineProps) {
  const datedPackages = packages.filter(hasTimelineDates);
  if (!datedPackages.length) return null;

  const rangeStart = minDate([
    ...datedPackages.map((item) => item.start),
    ...(projectStart ? [projectStart] : []),
  ]);
  const rangeEnd = maxDate([
    ...datedPackages.map((item) => item.end),
    ...(projectEnd ? [projectEnd] : []),
  ]);

  if (!rangeStart || !rangeEnd) return null;

  const totalDays = Math.max(1, daysBetween(rangeStart, rangeEnd) + 1);
  const timelineWidth = Math.max(1100, Math.min(1800, Math.round(totalDays * 2.2)));
  const months = monthSegments(rangeStart, rangeEnd, totalDays);
  const today = toIsoDate(new Date());
  const todayOffset = isWithin(today, rangeStart, rangeEnd)
    ? percentage(daysBetween(rangeStart, today), totalDays)
    : null;
  const groups = groupByPhase(datedPackages);

  return <section className="panel ganttPanel">
    <div className="ganttHeading">
      <div>
        <span className="ganttEyebrow">Timeline</span>
        <h2>Project Gantt</h2>
        <p>Read-only schedule from PostgreSQL. Dependencies are shown exactly as source text until explicit package links are normalized.</p>
      </div>
      <div className="ganttLegend" aria-label="Gantt status legend">
        <span><i className="done" />Erledigt</span>
        <span><i className="progress" />In Bearbeitung</span>
        <span><i className="pending" />Nicht begonnen</span>
      </div>
    </div>

    <div className="ganttScroll">
      <div className="ganttCanvas" style={{ minWidth: `${320 + timelineWidth}px` }}>
        <div className="ganttHeaderRow">
          <div className="ganttLabelHeader">Work package</div>
          <div className="ganttMonthTrack">
            {months.map((month) => <div
              className="ganttMonth"
              key={month.key}
              style={{ left: `${month.left}%`, width: `${month.width}%` }}
            >{month.label}</div>)}
            {todayOffset !== null && <div className="ganttTodayHeader" style={{ left: `${todayOffset}%` }}>Today</div>}
          </div>
        </div>

        {groups.map((group) => <div className="ganttPhase" key={group.phase}>
          <div className="ganttPhaseTitle">
            <strong>{group.phase || "Unassigned phase"}</strong>
            <span>{group.packages.length} packages</span>
          </div>
          {group.packages.map((item) => {
            const left = percentage(daysBetween(rangeStart, item.start), totalDays);
            const width = Math.max(0.7, percentage(daysBetween(item.start, item.end) + 1, totalDays));
            const barStyle: CSSProperties = { left: `${left}%`, width: `${width}%` };
            const title = `${item.sourceId} · ${item.title}\n${item.start} – ${item.end}${item.dependency ? `\nDependency: ${item.dependency}` : ""}`;

            return <div className="ganttRow" key={item.sourceId}>
              <div className="ganttLabel">
                <div className="ganttLabelMain"><span>{item.sourceId}</span><strong>{item.title}</strong></div>
                <div className="ganttMeta"><span>{item.owner ?? "Unassigned"}</span><span>{item.start} → {item.end}</span></div>
                {item.dependency && <div className="ganttDependency" title={item.dependency}>↳ {item.dependency}</div>}
              </div>
              <div className="ganttTrack">
                {months.map((month) => <i className="ganttGridLine" key={month.key} style={{ left: `${month.left}%` }} />)}
                {todayOffset !== null && <i className="ganttTodayLine" style={{ left: `${todayOffset}%` }} />}
                <div className={`ganttBar ${statusClass(item.status)}`} style={barStyle} title={title}>
                  {width >= 6 && <span>{item.title}</span>}
                </div>
              </div>
            </div>;
          })}
        </div>)}
      </div>
    </div>
  </section>;
}

function hasTimelineDates(item: DevelopmentWorkPackage): item is DatedWorkPackage {
  return Boolean(item.start && item.end && parseIsoDate(item.start) && parseIsoDate(item.end));
}

function groupByPhase(packages: ReadonlyArray<DatedWorkPackage>): PhaseGroup[] {
  const groups: PhaseGroup[] = [];
  for (const item of packages) {
    const current = groups.at(-1);
    if (current?.phase === item.phase) current.packages.push(item);
    else groups.push({ phase: item.phase, packages: [item] });
  }
  return groups;
}

function monthSegments(start: string, end: string, totalDays: number) {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (!startDate || !endDate) return [];

  const cursor = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), 1));
  const result: Array<{ key: string; label: string; left: number; width: number }> = [];

  while (cursor <= endDate) {
    const monthStart = cursor < startDate ? startDate : new Date(cursor);
    const nextMonth = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
    const monthEnd = new Date(Math.min(endDate.getTime(), nextMonth.getTime() - DAY_MS));
    const left = percentage(daysBetween(start, toIsoDate(monthStart)), totalDays);
    const width = percentage(daysBetween(toIsoDate(monthStart), toIsoDate(monthEnd)) + 1, totalDays);
    result.push({
      key: `${cursor.getUTCFullYear()}-${cursor.getUTCMonth() + 1}`,
      label: new Intl.DateTimeFormat("en", { month: "short", year: "2-digit", timeZone: "UTC" }).format(cursor),
      left,
      width,
    });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return result;
}

function minDate(values: string[]) {
  return values.filter((value) => parseIsoDate(value)).sort()[0];
}

function maxDate(values: string[]) {
  return values.filter((value) => parseIsoDate(value)).sort().at(-1);
}

function daysBetween(start: string, end: string) {
  const startDate = parseIsoDate(start);
  const endDate = parseIsoDate(end);
  if (!startDate || !endDate) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / DAY_MS);
}

function parseIsoDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toIsoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function isWithin(value: string, start: string, end: string) {
  return value >= start && value <= end;
}

function percentage(days: number, totalDays: number) {
  return Math.max(0, Math.min(100, (days / totalDays) * 100));
}

function statusClass(status: string) {
  if (status === "Erledigt") return "done";
  if (status === "In Bearbeitung") return "progress";
  return "pending";
}
