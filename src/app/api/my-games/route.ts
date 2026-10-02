import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string"
        ? body.email.trim().toLowerCase()
        : "";

    if (!email) {
      return NextResponse.json(
        { error: "Email is required." },
        { status: 400 }
      );
    }

    const { data: player, error: playerError } =
      await supabaseAdmin
        .from("players")
        .select("id, name")
        .eq("email", email)
        .eq("active", true)
        .maybeSingle();

    if (playerError) {
      console.error(
        "My games player lookup failed:",
        playerError
      );

      return NextResponse.json(
        { error: "Unable to find player." },
        { status: 500 }
      );
    }

    if (!player) {
      return NextResponse.json({
        player: null,
        groups: [],
      });
    }

    const { data: memberships, error: membershipError } =
      await supabaseAdmin
        .from("group_members")
        .select(
          `
          id,
          status,
          groups (
            id,
            play_date,
            time_block,
            format,
            status
          )
        `
        )
        .eq("player_id", player.id)
        .in("status", ["invited", "committed"]);

    if (membershipError) {
      console.error(
        "My games membership lookup failed:",
        membershipError
      );

      return NextResponse.json(
        { error: "Unable to load games." },
        { status: 500 }
      );
    }

    const groups =
      memberships
        ?.filter((membership) => membership.groups)
        .map((membership) => ({
          membershipId: membership.id,
          membershipStatus: membership.status,
          ...membership.groups,
        })) ?? [];

    return NextResponse.json({
      player: {
        name: player.name,
      },
      groups,
    });
  } catch (error) {
    console.error("My games API error:", error);

    return NextResponse.json(
      { error: "Unable to load games." },
      { status: 500 }
    );
  }
}