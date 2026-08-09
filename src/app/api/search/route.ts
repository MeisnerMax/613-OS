import { NextRequest, NextResponse } from "next/server";
import { require613WorkspaceSession } from "@/lib/db/authz";
import {
  getDevelopmentProjectDetail,
  getMigratedDevelopmentProjectIds,
  getPortfolioSnapshot,
} from "@/lib/read-model";

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };
const MAX_RESULTS = 12;
const MAX_QUERY_LENGTH = 80;

type SearchResult = {
  type: "task" | "asset" | "project";
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

type RankedResult = SearchResult & { score: number };

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function GET(request: NextRequest) {
  try {
    await require613WorkspaceSession();

    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return json({ results: [] });
    if (query.length > MAX_QUERY_LENGTH) return json({ results: [], error: "QUERY_TOO_LONG" }, 400);

    const snapshot = await getPortfolioSnapshot();
    const portfolioReady = Boolean(
      snapshot.sourceMode === "postgres" &&
      process.env.OPS_ASSET_SOURCE === "postgres" &&
      process.env.OPS_ASSET_DB_APPROVED === "true" &&
      process.env.OPS_DEVELOPMENT_SOURCE === "postgres" &&
      process.env.OPS_DEVELOPMENT_DB_APPROVED === "true"
    );

    if (!portfolioReady) {
      return json({ results: [], error: "SEARCH_SOURCE_NOT_READY" }, 503);
    }

    const projectIds = await getMigratedDevelopmentProjectIds();
    const projects = (await Promise.all(projectIds.map((id) => getDevelopmentProjectDetail(id))))
      .filter((project): project is NonNullable<typeof project> => Boolean(project));

    const ranked: RankedResult[] = [];

    for (const task of snapshot.tasks) {
      const score = matchScore(query, [
        task.id,
        task.title,
        task.asset,
        task.category,
        task.owner,
        task.support,
        task.info,
        task.nextStep,
        task.waitingFor,
        task.description,
        ...task.updates,
      ]);
      if (!score) continue;
      ranked.push({
        type: "task",
        id: task.id,
        title: task.title,
        subtitle: compact([task.asset, task.status, task.owner]),
        href: `/tasks?task=${encodeURIComponent(task.id)}`,
        score,
      });
    }

    for (const asset of snapshot.assets) {
      const score = matchScore(query, [
        asset.id,
        asset.name,
        asset.type,
        asset.status,
        asset.street,
        asset.zipCode,
        asset.city,
      ]);
      if (!score) continue;
      ranked.push({
        type: "asset",
        id: asset.id,
        title: asset.name,
        subtitle: compact([asset.type, address(asset.street, asset.zipCode, asset.city), asset.status]),
        href: `/assets/${encodeURIComponent(asset.id)}`,
        score,
      });
    }

    for (const project of projects) {
      const score = matchScore(query, [
        project.id,
        project.name,
        project.assetId,
        project.status,
        project.currentFocus,
        project.currentOwner,
      ]);
      if (!score) continue;
      ranked.push({
        type: "project",
        id: project.id,
        title: project.name,
        subtitle: compact([project.assetId, project.status, project.currentFocus]),
        href: `/projects/${encodeURIComponent(project.id)}`,
        score,
      });
    }

    const results = ranked
      .sort((a, b) => b.score - a.score || typeOrder(a.type) - typeOrder(b.type) || a.title.localeCompare(b.title))
      .slice(0, MAX_RESULTS)
      .map(({ score: _score, ...result }) => result);

    return json({ results });
  } catch (error) {
    const code = error instanceof Error ? error.message : "UNKNOWN";
    const status = code === "AUTH_REQUIRED" ? 401 : code === "WORKSPACE_DOMAIN_NOT_ALLOWED" ? 403 : 500;
    return json({ results: [], error: code }, status);
  }
}

function matchScore(query: string, values: Array<string | undefined>) {
  const needle = normalize(query);
  let best = 0;

  for (const raw of values) {
    if (!raw) continue;
    const value = normalize(raw);
    if (!value.includes(needle)) continue;
    if (value === needle) best = Math.max(best, 100);
    else if (value.startsWith(needle)) best = Math.max(best, 80);
    else if (value.split(/\s+/).some((part) => part.startsWith(needle))) best = Math.max(best, 65);
    else best = Math.max(best, 50);
  }

  return best;
}

function normalize(value: string) {
  return value.toLocaleLowerCase("de-DE").normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}

function compact(values: Array<string | undefined>) {
  return values.map((value) => value?.trim()).filter(Boolean).join(" · ");
}

function address(street: string | undefined, zipCode: string | undefined, city: string) {
  return [street, [zipCode, city].filter(Boolean).join(" ")].filter(Boolean).join(", ");
}

function typeOrder(type: SearchResult["type"]) {
  if (type === "task") return 0;
  if (type === "asset") return 1;
  return 2;
}
