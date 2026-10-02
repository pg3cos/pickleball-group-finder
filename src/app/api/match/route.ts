import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const formatSizes: Record<string, number> = {
    Singles: 2,
    Doubles: 4,
    Rotation: 4,
};

const timeBlocks = [
    "06_08",
    "08_10",
    "10_12",
    "12_14",
    "14_16",
    "16_18",
    "18_20",
];

function addDays(date: Date, days: number) {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
}

function formatDate(date: Date) {
    return date.toISOString().split("T")[0];
}

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
        const today = new Date();

        const endDate = addDays(today, 30);

        const { data: players, error: playersError } =
            await supabaseAdmin
                .from("players")
                .select("id, skill_level")
                .not("email_verified_at", "is", null)
                .eq("active", true);

        if (playersError) {
            console.error("Matching player lookup failed:", playersError);

            return NextResponse.json(
                { error: "Unable to load players." },
                { status: 500 }
            );
        }

        if (!players || players.length === 0) {
            return NextResponse.json({
                message: "No verified active players available.",
                groupsCreated: 0,
            });
        }

        const playerIds = players.map((player) => player.id);

        const { data: formats, error: formatsError } =
            await supabaseAdmin
                .from("player_formats")
                .select("player_id, format")
                .in("player_id", playerIds);

        if (formatsError) {
            console.error(
                "Matching format lookup failed:",
                formatsError
            );

            return NextResponse.json(
                { error: "Unable to load player formats." },
                { status: 500 }
            );
        }

        const { data: weeklyAvailability, error: weeklyError } =
            await supabaseAdmin
                .from("weekly_availability")
                .select(
                    "player_id, day_of_week, time_block"
                )
                .in("player_id", playerIds);

        if (weeklyError) {
            console.error(
                "Matching availability lookup failed:",
                weeklyError
            );

            return NextResponse.json(
                { error: "Unable to load player availability." },
                { status: 500 }
            );
        }

        const groupsCreated: string[] = [];

        for (
            let date = new Date(today);
            date <= endDate;
            date = addDays(date, 1)
        ) {
            const dateString = formatDate(date);
            const dayOfWeek = date.getDay();

            for (const timeBlock of timeBlocks) {
                const availablePlayerIds =
                    weeklyAvailability
                        ?.filter(
                            (availability) =>
                                availability.day_of_week === dayOfWeek &&
                                availability.time_block === timeBlock
                        )
                        .map((availability) => availability.player_id) ??
                    [];

                if (availablePlayerIds.length === 0) {
                    continue;
                }

                for (const format of Object.keys(formatSizes)) {
                    const groupSize = formatSizes[format];

                    const matchingPlayerIds =
                        formats
                            ?.filter(
                                (playerFormat) =>
                                    playerFormat.format === format &&
                                    availablePlayerIds.includes(
                                        playerFormat.player_id
                                    )
                            )
                            .map((playerFormat) => playerFormat.player_id) ??
                        [];

                    if (matchingPlayerIds.length < 2) {
                        continue;
                    }

                    const selectedPlayerIds =
                        matchingPlayerIds.slice(0, groupSize);

                    const { data: existingGroup } =
                        await supabaseAdmin
                            .from("groups")
                            .select("id")
                            .eq("play_date", dateString)
                            .eq("time_block", timeBlock)
                            .eq("format", format)
                            .in("status", ["forming", "committed"])
                            .maybeSingle();

                    if (existingGroup) {
                        continue;
                    }

                    const { data: group, error: groupError } =
                        await supabaseAdmin
                            .from("groups")
                            .insert({
                                play_date: dateString,
                                time_block: timeBlock,
                                format,
                                status: "forming",
                            })
                            .select("id")
                            .single();

                    if (groupError || !group) {
                        console.error(
                            "Group creation failed:",
                            groupError
                        );
                        continue;
                    }

                    const memberRows = selectedPlayerIds.map(
                        (playerId) => ({
                            group_id: group.id,
                            player_id: playerId,
                            status: "invited",
                        })
                    );

                    const { error: membersError } =
                        await supabaseAdmin
                            .from("group_members")
                            .insert(memberRows);

                    if (membersError) {
                        console.error(
                            "Group member creation failed:",
                            membersError
                        );

                        await supabaseAdmin
                            .from("groups")
                            .delete()
                            .eq("id", group.id);

                        continue;
                    }

                    groupsCreated.push(group.id);
                }
            }
        }

        return NextResponse.json({
            message: "Matching run completed.",
            groupsCreated: groupsCreated.length,
        });
    } catch (error) {
        console.error("Matching API error:", error);

        return NextResponse.json(
            { error: "Matching run failed." },
            { status: 500 }
        );
    }
}