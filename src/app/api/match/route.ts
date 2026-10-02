import { NextResponse } from "next/server";
import { runMatching } from "@/lib/run-matching";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");

  if (
    !process.env.MATCH_SECRET ||
    authHeader !== `Bearer ${process.env.MATCH_SECRET}`
  ) {
    return NextResponse.json(
      { error: "Unauthorized." },
      { status: 401 }
    );
  }

  try {
    const result = await runMatching();

    return NextResponse.json({
      message: "Matching run completed.",
      groupsCreated: result.groupsCreated,
    });
  } catch (error) {
    console.error("Matching API error:", error);

    return NextResponse.json(
      { error: "Matching run failed." },
      { status: 500 }
    );
  }
}