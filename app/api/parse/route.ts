import { NextResponse } from "next/server";
import { parseXiaoyuzhouEpisode } from "@/lib/xiaoyuzhou-parser";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "Missing url." }, { status: 400 });
    }

    const episode = await parseXiaoyuzhouEpisode(body.url);
    return NextResponse.json({ episode });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to parse episode.",
      },
      { status: 422 },
    );
  }
}
