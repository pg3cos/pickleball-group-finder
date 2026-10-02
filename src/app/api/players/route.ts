import { NextResponse } from "next/server";
import { createHash, randomBytes } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { sendVerificationEmail } from "@/lib/email";

const allowedFormats = ["Singles", "Doubles", "Rotation"];

const allowedTimeBlocks = [
    "06_08",
    "08_10",
    "10_12",
    "12_14",
    "14_16",
    "16_18",
    "18_20",
];

function isValidAvailability(
    value: unknown
): value is { day: number; timeBlock: string }[] {
    if (!Array.isArray(value)) {
        return false;
    }

    return value.every((item) => {
        if (!item || typeof item !== "object") {
            return false;
        }

        const entry = item as {
            day?: unknown;
            timeBlock?: unknown;
        };

        return (
            typeof entry.day === "number" &&
            Number.isInteger(entry.day) &&
            entry.day >= 0 &&
            entry.day <= 6 &&
            typeof entry.timeBlock === "string" &&
            allowedTimeBlocks.includes(entry.timeBlock)
        );
    });
}

function isValidDateAvailability(
    value: unknown
): value is { date: string; timeBlock: string }[] {
    if (!Array.isArray(value)) {
        return false;
    }

    return value.every((item) => {
        if (!item || typeof item !== "object") {
            return false;
        }

        const entry = item as {
            date?: unknown;
            timeBlock?: unknown;
        };

        return (
            typeof entry.date === "string" &&
            /^\d{4}-\d{2}-\d{2}$/.test(entry.date) &&
            typeof entry.timeBlock === "string" &&
            allowedTimeBlocks.includes(entry.timeBlock)
        );
    });
}

function hashToken(token: string) {
    return createHash("sha256").update(token).digest("hex");
}

export async function POST(request: Request) {
    try {
        const body = await request.json();

        const name =
            typeof body.name === "string" ? body.name.trim() : "";

        const email =
            typeof body.email === "string"
                ? body.email.trim().toLowerCase()
                : "";

        const skillLevel = Number(body.skillLevel);

        const formats = Array.isArray(body.formats)
            ? body.formats.filter(
                (format: unknown): format is string =>
                    typeof format === "string" &&
                    allowedFormats.includes(format)
            )
            : [];

        const availability = body.availability;
        const dateAvailability = body.dateAvailability;

        if (!name || name.length > 80) {
            return NextResponse.json(
                { error: "Please provide a valid name." },
                { status: 400 }
            );
        }

        if (!email || email.length > 254 || !email.includes("@")) {
            return NextResponse.json(
                { error: "Please provide a valid email address." },
                { status: 400 }
            );
        }

        if (
            !Number.isInteger(skillLevel) ||
            skillLevel < 0 ||
            skillLevel > 5
        ) {
            return NextResponse.json(
                { error: "Skill level must be between 0 and 5." },
                { status: 400 }
            );
        }

        if (formats.length === 0) {
            return NextResponse.json(
                { error: "Please select at least one format." },
                { status: 400 }
            );
        }

        if (!isValidAvailability(availability)) {
            return NextResponse.json(
                { error: "Invalid weekly availability information." },
                { status: 400 }
            );
        }

        if (!isValidDateAvailability(dateAvailability)) {
            return NextResponse.json(
                { error: "Invalid specific-date availability information." },
                { status: 400 }
            );
        }

        if (availability.length === 0 && dateAvailability.length === 0) {
            return NextResponse.json(
                { error: "Please select at least one available time." },
                { status: 400 }
            );
        }

        const { data: player, error: playerError } = await supabaseAdmin
            .from("players")
            .insert({
                name,
                email,
                skill_level: skillLevel,
                email_verified_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (playerError) {
            if (playerError.code === "23505") {
                return NextResponse.json(
                    { error: "That email address is already registered." },
                    { status: 409 }
                );
            }

            console.error("Player creation failed:", playerError);

            return NextResponse.json(
                { error: "Unable to create player." },
                { status: 500 }
            );
        }

        const formatRows = formats.map((format: string) => ({
            player_id: player.id,
            format,
        }));

        const { error: formatError } = await supabaseAdmin
            .from("player_formats")
            .insert(formatRows);

        if (formatError) {
            console.error("Player format creation failed:", formatError);

            await supabaseAdmin
                .from("players")
                .delete()
                .eq("id", player.id);

            return NextResponse.json(
                { error: "Unable to save format preferences." },
                { status: 500 }
            );
        }

        if (availability.length > 0) {
            const availabilityRows = availability.map((entry) => ({
                player_id: player.id,
                day_of_week: entry.day,
                time_block: entry.timeBlock,
            }));

            const { error: availabilityError } = await supabaseAdmin
                .from("weekly_availability")
                .insert(availabilityRows);

            if (availabilityError) {
                console.error(
                    "Weekly availability creation failed:",
                    availabilityError
                );

                await supabaseAdmin
                    .from("players")
                    .delete()
                    .eq("id", player.id);

                return NextResponse.json(
                    { error: "Unable to save weekly availability." },
                    { status: 500 }
                );
            }
        }

        if (dateAvailability.length > 0) {
            const dateAvailabilityRows = dateAvailability.map((entry) => ({
                player_id: player.id,
                available_date: entry.date,
                time_block: entry.timeBlock,
            }));

            const { error: dateAvailabilityError } = await supabaseAdmin
                .from("date_availability")
                .insert(dateAvailabilityRows);

            if (dateAvailabilityError) {
                console.error(
                    "Specific-date availability creation failed:",
                    dateAvailabilityError
                );

                await supabaseAdmin
                    .from("players")
                    .delete()
                    .eq("id", player.id);

                return NextResponse.json(
                    { error: "Unable to save specific-date availability." },
                    { status: 500 }
                );
            }
        }

        

        return NextResponse.json(
            {
                playerId: player.id,
                message: "Registration successful.",
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Player API error:", error);

        return NextResponse.json(
            { error: "Invalid request." },
            { status: 400 }
        );
    }
}