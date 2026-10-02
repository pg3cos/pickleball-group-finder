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

export async function runMatching() {
  const today = new Date();
  const endDate = addDays(today, 30);

  const { data: players, error: playersError } =
    await supabaseAdmin
      .from("players")
      .select("id, skill_level")
      .not("email_verified_at", "is", null)
      .eq("active", true);

  if (playersError) {
    throw new Error(
      `Unable to load players: ${playersError.message}`
    );
  }

  if (!players || players.length === 0) {
    return {
      groupsCreated: 0,
    };
  }

  const playerIds = players.map((player) => player.id);

  const { data: formats, error: formatsError } =
    await supabaseAdmin
      .from("player_formats")
      .select("player_id, format")
      .in("player_id", playerIds);

  if (formatsError) {
    throw new Error(
      `Unable to load player formats: ${formatsError.message}`
    );
  }

  const { data: weeklyAvailability, error: weeklyError } =
    await supabaseAdmin
      .from("weekly_availability")
      .select("player_id, day_of_week, time_block")
      .in("player_id", playerIds);

  if (weeklyError) {
    throw new Error(
      `Unable to load weekly availability: ${weeklyError.message}`
    );
  }

  const { data: dateAvailability, error: dateError } =
    await supabaseAdmin
      .from("date_availability")
      .select("player_id, available_date, time_block")
      .in("player_id", playerIds);

  if (dateError) {
    throw new Error(
      `Unable to load specific-date availability: ${dateError.message}`
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
      const weeklyPlayerIds =
        weeklyAvailability
          ?.filter(
            (availability) =>
              availability.day_of_week === dayOfWeek &&
              availability.time_block === timeBlock
          )
          .map((availability) => availability.player_id) ?? [];

      const specificDatePlayerIds =
        dateAvailability
          ?.filter(
            (availability) =>
              availability.available_date === dateString &&
              availability.time_block === timeBlock
          )
          .map((availability) => availability.player_id) ?? [];

      const availablePlayerIds = [
        ...new Set([
          ...weeklyPlayerIds,
          ...specificDatePlayerIds,
        ]),
      ];

      if (availablePlayerIds.length === 0) continue;

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
            .map((playerFormat) => playerFormat.player_id) ?? [];

        if (matchingPlayerIds.length < 2) continue;

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

        if (existingGroup) continue;

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

  return {
    groupsCreated: groupsCreated.length,
  };
}