import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const membershipId =
      typeof body.membershipId === "string"
        ? body.membershipId
        : "";

    if (!membershipId) {
      return NextResponse.json(
        { error: "Membership ID is required." },
        { status: 400 }
      );
    }

    const { data: membership, error: lookupError } =
      await supabaseAdmin
        .from("group_members")
        .select("id, status")
        .eq("id", membershipId)
        .maybeSingle();

    if (lookupError) {
      console.error(
        "Commit membership lookup failed:",
        lookupError
      );

      return NextResponse.json(
        { error: "Unable to find game." },
        { status: 500 }
      );
    }

    if (!membership) {
      return NextResponse.json(
        { error: "Game not found." },
        { status: 404 }
      );
    }

    if (membership.status === "committed") {
      return NextResponse.json({
        message: "Already committed.",
      });
    }

    if (membership.status !== "invited") {
      return NextResponse.json(
        { error: "This game is no longer available." },
        { status: 400 }
      );
    }

    const { error: updateError } =
      await supabaseAdmin
        .from("group_members")
        .update({
          status: "committed",
        })
        .eq("id", membershipId);

    if (updateError) {
      console.error(
        "Commit update failed:",
        updateError
      );

      return NextResponse.json(
        { error: "Unable to commit to game." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "You are committed to this game.",
    });
  } catch (error) {
    console.error("Commit API error:", error);

    return NextResponse.json(
      { error: "Unable to commit to game." },
      { status: 500 }
    );
  }
}