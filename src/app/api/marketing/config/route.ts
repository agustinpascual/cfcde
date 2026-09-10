import { configuracaoMarketingPublica } from "@/lib/marketing-config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return Response.json(await configuracaoMarketingPublica(), {
      headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=300" },
    });
  } catch {
    return Response.json({ metaPixelIds: [], googleTagId: "" }, { status: 503 });
  }
}
