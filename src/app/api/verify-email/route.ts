import { NextResponse } from "next/server";
import { createHash } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "Verification token is missing." },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const { data: verificationToken, error: tokenError } =
      await supabaseAdmin
        .from("email_verification_tokens")
        .select(
          "id, player_id, expires_at, used_at"
        )
        .eq("token_hash", tokenHash)
        .maybeSingle();

    if (tokenError) {
      console.error(
        "Verification token lookup failed:",
        tokenError
      );

      return NextResponse.json(
        { error: "Unable to verify email." },
        { status: 500 }
      );
    }

    if (!verificationToken) {
      return NextResponse.json(
        { error: "Invalid verification link." },
        { status: 400 }
      );
    }

    if (verificationToken.used_at) {
      return NextResponse.json(
        { error: "This verification link has already been used." },
        { status: 400 }
      );
    }

    if (
      new Date(verificationToken.expires_at).getTime() <
      Date.now()
    ) {
      return NextResponse.json(
        { error: "This verification link has expired." },
        { status: 400 }
      );
    }

    const { error: playerError } = await supabaseAdmin
      .from("players")
      .update({
        email_verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", verificationToken.player_id);

    if (playerError) {
      console.error(
        "Player verification update failed:",
        playerError
      );

      return NextResponse.json(
        { error: "Unable to verify email." },
        { status: 500 }
      );
    }

    const { error: usedTokenError } = await supabaseAdmin
      .from("email_verification_tokens")
      .update({
        used_at: new Date().toISOString(),
      })
      .eq("id", verificationToken.id);

    if (usedTokenError) {
      console.error(
        "Verification token update failed:",
        usedTokenError
      );

      return NextResponse.json(
        { error: "Unable to complete email verification." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      verified: true,
      message: "Email verified successfully.",
    });
  } catch (error) {
    console.error("Email verification error:", error);

    return NextResponse.json(
      { error: "Unable to verify email." },
      { status: 500 }
    );
  }
}