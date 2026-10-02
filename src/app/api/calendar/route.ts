import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function GET() {
  try {
    const { data: groups, error: groupsError } =
      await supabaseAdmin
        .from("groups")
        .select("id, play_date, time_block, format")
        .in("status", ["forming", "committed"])
        .order("play_date")
        .order("time_block");

    if (groupsError) {
      console.error(
        "Calendar groups lookup failed:",
        groupsError
      );

      return NextResponse.json(
        { error: "Unable to load calendar." },
        { status: 500 }
      );
    }

    if (!groups || groups.length === 0) {
      return NextResponse.json([]);
    }

    const groupIds = groups.map((group) => group.id);

    const { data: members, error: membersError } =
      await supabaseAdmin
        .from("group_members")
        .select("group_id, status")
        .in("group_id", groupIds)
        .in("status", ["invited", "committed"]);

    if (membersError) {
      console.error(
        "Calendar group member lookup failed:",
        membersError
      );

      return NextResponse.json(
        { error: "Unable to load calendar." },
        { status: 500 }
      );
    }

    const calendarGroups = groups.map((group) => {
      const groupMembers =
        members?.filter(
          (member) => member.group_id === group.id
        ) ?? [];

      const registered = groupMembers.length;

      const committed = groupMembers.filter(
        (member) => member.status === "committed"
      ).length;

      return {
        date: group.play_date,
        timeBlock: group.time_block,
        format: group.format,
        registered,
        committed,
      };
    });

    return NextResponse.json(calendarGroups);
  } catch (error) {
    console.error("Calendar API error:", error);

    return NextResponse.json(
      { error: "Unable to load calendar." },
      { status: 500 }
    );
  }
}