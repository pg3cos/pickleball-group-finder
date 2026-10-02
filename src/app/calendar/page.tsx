"use client";

import { useEffect, useMemo, useState } from "react";

const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
];

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const timeLabels: Record<string, string> = {
    "06_08": "6–8 AM",
    "08_10": "8–10 AM",
    "10_12": "10 AM–12 PM",
    "12_14": "12–2 PM",
    "14_16": "2–4 PM",
    "16_18": "4–6 PM",
    "18_20": "6–8 PM",
};

type CalendarGroup = {
    date: string;
    timeBlock: string;
    format: string;
    registered: number;
    committed: number;
};

export default function CalendarPage() {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [groups, setGroups] = useState<CalendarGroup[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    useEffect(() => {
        async function loadCalendar() {
            try {
                setLoading(true);
                setError("");

                const response = await fetch("/api/calendar");

                if (!response.ok) {
                    throw new Error("Unable to load calendar.");
                }

                const data = await response.json();

                setGroups(data);
            } catch (error) {
                console.error("Calendar loading error:", error);
                setError("Unable to load the calendar.");
            } finally {
                setLoading(false);
            }
        }

        loadCalendar();
    }, []);

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(
        year,
        month + 1,
        0
    ).getDate();

    const calendarCells = useMemo(() => {
        const cells: (number | null)[] = [];

        for (let i = 0; i < firstDay; i++) {
            cells.push(null);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            cells.push(day);
        }

        while (cells.length % 7 !== 0) {
            cells.push(null);
        }

        return cells;
    }, [firstDay, daysInMonth]);

    function previousMonth() {
        setCurrentDate(new Date(year, month - 1, 1));
    }

    function nextMonth() {
        setCurrentDate(new Date(year, month + 1, 1));
    }

    function getGroupsForDay(day: number) {
        const dateString =
            `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

        return groups.filter(
            (group) => group.date === dateString
        );
    }

    return (
        <main className="min-h-screen bg-gray-100 px-4 py-8 text-gray-900">
            <div className="mx-auto max-w-7xl">
                <div className="mb-6 flex items-center justify-between">
                    <button
                        onClick={previousMonth}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
                    >
                        ←
                    </button>

                    <h1 className="text-2xl font-bold">
                        {monthNames[month]} {year}
                    </h1>

                    <button
                        onClick={nextMonth}
                        className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
                    >
                        →
                    </button>
                </div>

                {loading && (
                    <div className="mb-4 rounded-lg bg-white p-4 text-center">
                        Loading calendar...
                    </div>
                )}

                {error && (
                    <div className="mb-4 rounded-lg bg-red-100 p-4 text-red-900">
                        {error}
                    </div>
                )}

                <div className="overflow-hidden rounded-xl border border-gray-300 bg-white shadow">
                    <div className="grid grid-cols-7 border-b border-gray-300">
                        {dayNames.map((day) => (
                            <div
                                key={day}
                                className="border-r border-gray-300 bg-gray-50 p-3 text-center font-semibold last:border-r-0"
                            >
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7">
                        {calendarCells.map((day, index) => {
                            const dayGroups =
                                day === null ? [] : getGroupsForDay(day);

                            return (
                                <div
                                    key={index}
                                    className="min-h-32 border-b border-r border-gray-300 p-2 last:border-r-0"
                                >
                                    {day !== null && (
                                        <>
                                            <div className="mb-2 text-sm font-bold">
                                                {day}
                                            </div>

                                            <div className="space-y-2">
                                                {dayGroups.map((group, groupIndex) => (
                                                    <div
                                                        key={groupIndex}
                                                        className="rounded-lg border border-gray-200 bg-gray-50 p-2 text-xs"
                                                    >
                                                        <div className="font-semibold">
                                                            {timeLabels[group.timeBlock] ??
                                                                group.timeBlock}
                                                        </div>

                                                        <div className="mt-1">
                                                            {group.format}
                                                        </div>

                                                        <div className="mt-1">
                                                            {group.registered}/{group.format === "Singles" ? 2 : 4} registered
                                                        </div>

                                                        <div>
                                                            {group.committed}/{group.format === "Singles" ? 2 : 4} committed
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-4">
                    <a
                        href="/"
                        className="rounded-lg border border-gray-400 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
                    >
                        Registration
                    </a>

                    <a
                        href="/my-games"
                        className="rounded-lg border border-gray-400 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
                    >
                        My Games
                    </a>
                </div>
            </div>
        </main>
    );
}