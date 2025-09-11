import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { runReindexAlgolia } from "@fern-api/docs-server/run-reindex-algolia";
import { runReindexTurbopuffer } from "@fern-api/docs-server/run-reindex-turbopuffer";

const BodySchema = z.object({
  domain: z.string(),
});

export async function POST(request: NextRequest): Promise<NextResponse> {
  const { domain } = BodySchema.parse(await request.json());

  const algolia = await runReindexAlgolia(domain);
  const turbopuffer = await runReindexTurbopuffer(domain);

  return NextResponse.json({
    algolia,
    turbopuffer,
  });
}
