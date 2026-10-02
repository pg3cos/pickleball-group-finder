"use client";

import { useState } from "react";

type Game = {
    membershipId: string;
    membershipStatus: string;
    id: string;
    play_date: string;
    time_block: string;
    format: string;
    status: string;
};

const timeLabels: Record<string, string> = {
    "06_08": "6–8 AM",
    "08_10": "8–10 AM",
    "10_12": "10 AM–12 PM",
    "12_14": "12–2 PM",
    "14_16": "2–4 PM",
    "16_18": "4–6 PM",
    "18_20": "6–8 PM",
};

export default function MyGamesPage() {
    const [email, setEmail] = useState("");
    const [games, setGames] = useState<Game[]>([]);
    const [playerName, setPlayerName] = useState("");
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);

    async function findGames(event: React.FormEvent) {
        event.preventDefault();

        setLoading(true);
        setMessage("");
        setGames([]);
        setPlayerName("");

        try {
            const response = await fetch("/api/my-games", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email }),
            });

            const data = await response.json();

            if (!response.ok) {
                setMessage(data.error || "Unable to find your games.");
                return;
            }

            if (!data.player) {
                setMessage("No player was found with that email address.");
                return;
            }

            setPlayerName(data.player.name);
            setGames(data.groups || []);

            if (!data.groups || data.groups.length === 0) {
                setMessage("You do not currently have any games.");
            }
        } catch {
            setMessage("Unable to load your games.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-12 text-gray-900">
            <div className="mx-auto max-w-xl rounded-xl bg-white p-8 shadow">
                <h1 className="text-2xl font-bold">
                    My Games
                </h1>

                <p className="mt-3 text-gray-700">
                    Enter the email address you registered with to
                    view your available games.
                </p>

                <form
                    onSubmit={findGames}
                    className="mt-6 space-y-4"
                >
                    <div>
                        <label
                            htmlFor="email"
                            className="block font-semibold"
                        >
                            Email
                        </label>

                        <input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            className="mt-1 w-full rounded-lg border border-gray-400 px-3 py-2"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="rounded-lg bg-black px-5 py-3 font-semibold text-white disabled:opacity-50"
                    >
                        {loading ? "Finding Games..." : "Find My Games"}
                    </button>
                </form>

                {message && (
                    <div className="mt-6 rounded-lg bg-gray-100 p-4">
                        {message}
                    </div>
                )}

                {playerName && games.length > 0 && (
                    <div className="mt-8">
                        <h2 className="text-xl font-bold">
                            {playerName}'s Games
                        </h2>

                        <div className="mt-4 space-y-3">
                            {games.map((game) => (
                                <div
                                    key={game.membershipId}
                                    className="rounded-lg border border-gray-300 p-4"
                                >
                                    <div className="font-bold">
                                        {game.format}
                                    </div>

                                    <div className="mt-1">
                                        {game.play_date}
                                    </div>

                                    <div>
                                        {timeLabels[game.time_block] ??
                                            game.time_block}
                                    </div>

                                    <div className="mt-2 text-sm">
                                        Status: {game.membershipStatus}
                                    </div>

                                    {game.membershipStatus === "invited" && (
                                        <button
                                            onClick={async () => {
                                                const response = await fetch("/api/commit", {
                                                    method: "POST",
                                                    headers: {
                                                        "Content-Type": "application/json",
                                                    },
                                                    body: JSON.stringify({
                                                        membershipId: game.membershipId,
                                                    }),
                                                });

                                                const data = await response.json();

                                                if (!response.ok) {
                                                    setMessage(
                                                        data.error || "Unable to commit to game."
                                                    );
                                                    return;
                                                }

                                                setGames((currentGames) =>
                                                    currentGames.map((currentGame) =>
                                                        currentGame.membershipId === game.membershipId
                                                            ? {
                                                                ...currentGame,
                                                                membershipStatus: "committed",
                                                            }
                                                            : currentGame
                                                    )
                                                );

                                                setMessage("You are committed to this game.");
                                            }}
                                            className="mt-3 rounded-lg bg-green-700 px-4 py-2 font-semibold text-white"
                                        >
                                            Commit to Game
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                <div className="mt-8 flex flex-wrap gap-4">
                    <a
                        href="/"
                        className="rounded-lg border border-gray-400 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
                    >
                        Registration
                    </a>

                    <a
                        href="/calendar"
                        className="rounded-lg border border-gray-400 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
                    >
                        Public Calendar
                    </a>
                </div>
            </div>
        </main>
    );
}