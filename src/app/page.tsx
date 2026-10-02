"use client";

import { FormEvent, useState } from "react";

const formats = ["Singles", "Doubles", "Rotation"];

const days = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const timeBlocks = [
  { value: "06_08", label: "6–8 AM" },
  { value: "08_10", label: "8–10 AM" },
  { value: "10_12", label: "10 AM–12 PM" },
  { value: "12_14", label: "12–2 PM" },
  { value: "14_16", label: "2–4 PM" },
  { value: "16_18", label: "4–6 PM" },
  { value: "18_20", label: "6–8 PM" },
];

type SpecificDateAvailability = {
  date: string;
  timeBlocks: string[];
};

export default function Home() {
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const [specificDate, setSpecificDate] = useState("");
  const [specificTimeBlocks, setSpecificTimeBlocks] = useState<string[]>([]);
  const [specificDates, setSpecificDates] = useState<
    SpecificDateAvailability[]
  >([]);

  function toggleSpecificTimeBlock(timeBlock: string) {
    setSpecificTimeBlocks((current) =>
      current.includes(timeBlock)
        ? current.filter((value) => value !== timeBlock)
        : [...current, timeBlock]
    );
  }

  function addSpecificDate() {
    if (!specificDate || specificTimeBlocks.length === 0) {
      return;
    }

    setSpecificDates((current) => {
      const existingDate = current.find(
        (entry) => entry.date === specificDate
      );

      if (existingDate) {
        return current.map((entry) =>
          entry.date === specificDate
            ? {
              ...entry,
              timeBlocks: Array.from(
                new Set([
                  ...entry.timeBlocks,
                  ...specificTimeBlocks,
                ])
              ),
            }
            : entry
        );
      }

      return [
        ...current,
        {
          date: specificDate,
          timeBlocks: [...specificTimeBlocks],
        },
      ].sort((a, b) => a.date.localeCompare(b.date));
    });

    setSpecificDate("");
    setSpecificTimeBlocks([]);
  }

  function removeSpecificDate(date: string) {
    setSpecificDates((current) =>
      current.filter((entry) => entry.date !== date)
    );
  }

  function formatDate(dateString: string) {
    const [year, month, day] = dateString.split("-");

    return `${month}/${day}/${year}`;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setMessage("");
    setSubmitting(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const name = formData.get("name");
    const email = formData.get("email");
    const skillLevel = formData.get("skillLevel");

    const selectedFormats = formData.getAll("formats");

    const availability = formData
      .getAll("availability")
      .map((value) => {
        const [day, timeBlock] = String(value).split("|");

        return {
          day: Number(day),
          timeBlock,
        };
      });

    const dateAvailability = specificDates.flatMap((entry) =>
      entry.timeBlocks.map((timeBlock) => ({
        date: entry.date,
        timeBlock,
      }))
    );

    try {
      const response = await fetch("/api/players", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
          skillLevel,
          formats: selectedFormats,
          availability,
          dateAvailability,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error || "Something went wrong.");
        return;
      }

      setMessage(
        "Registration submitted successfully."
      );
      form.reset();
      setSpecificDate("");
      setSpecificTimeBlocks([]);
      setSpecificDates([]);
    } catch {
      setMessage("Unable to connect to the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12 text-gray-900">
      <div className="mx-auto max-w-4xl rounded-xl bg-white p-8 shadow">
        <h1 className="mb-2 text-3xl font-bold">
          Lawton Pickleball
        </h1>

        <p className="mb-8 text-gray-800">
          Find people to play pickleball with.
        </p>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label
              htmlFor="name"
              className="mb-2 block font-medium"
            >
              Name
            </label>

            <input
              id="name"
              name="name"
              type="text"
              required
              maxLength={80}
              className="w-full rounded-lg border border-gray-400 bg-white px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="email"
              className="mb-2 block font-medium"
            >
              Email
            </label>

            <input
              id="email"
              name="email"
              type="email"
              required
              maxLength={254}
              className="w-full rounded-lg border border-gray-400 bg-white px-3 py-2 text-gray-900"
            />
          </div>

          <div>
            <label
              htmlFor="skillLevel"
              className="mb-2 block font-medium"
            >
              Skill level
            </label>

            <select
              id="skillLevel"
              name="skillLevel"
              defaultValue=""
              required
              className="w-full rounded-lg border border-gray-400 bg-white px-3 py-2 text-gray-900"
            >
              <option value="" disabled>
                Select your skill level
              </option>

              <option value="0">
                0 — I don't own a paddle
              </option>

              <option value="1">
                1 — Beginner
              </option>

              <option value="2">
                2 — Recreational
              </option>

              <option value="3">
                3 — Intermediate
              </option>

              <option value="4">
                4 — Advanced
              </option>

              <option value="5">
                5 — Professionally rated
              </option>
            </select>
          </div>

          <fieldset>
            <legend className="mb-3 block font-medium">
              What kind of games are you interested in?
            </legend>

            <div className="space-y-3">
              {formats.map((format) => (
                <label
                  key={format}
                  className="flex cursor-pointer items-center gap-3"
                >
                  <input
                    type="checkbox"
                    name="formats"
                    value={format}
                    className="h-4 w-4"
                  />

                  <span>{format}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 block font-medium">
              When are you usually available?
            </legend>

            <p className="mb-4 text-sm text-gray-700">
              Select every time block when you could normally play.
            </p>

            <div className="overflow-x-auto rounded-lg border border-gray-300">
              <table className="w-full min-w-[700px] border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border-b border-r border-gray-300 p-3 text-left">
                      Time
                    </th>

                    {days.map((day) => (
                      <th
                        key={day.value}
                        className="border-b border-gray-300 p-3 text-center"
                      >
                        {day.label}
                      </th>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {timeBlocks.map((timeBlock) => (
                    <tr key={timeBlock.value}>
                      <td className="border-b border-r border-gray-300 p-3 font-medium whitespace-nowrap">
                        {timeBlock.label}
                      </td>

                      {days.map((day) => {
                        const value = `${day.value}|${timeBlock.value}`;

                        return (
                          <td
                            key={value}
                            className="border-b border-gray-300 p-3 text-center"
                          >
                            <input
                              type="checkbox"
                              name="availability"
                              value={value}
                              aria-label={`${day.label} ${timeBlock.label}`}
                              className="h-5 w-5"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-2 block font-medium">
              Specific dates
            </legend>

            <p className="mb-4 text-sm text-gray-700">
              Add dates when you are available outside of your normal
              weekly schedule.
            </p>

            <div className="space-y-4 rounded-lg border border-gray-300 p-4">
              <div>
                <label
                  htmlFor="specificDate"
                  className="mb-2 block text-sm font-medium"
                >
                  Date
                </label>

                <input
                  id="specificDate"
                  type="date"
                  value={specificDate}
                  min={new Date().toISOString().split("T")[0]}
                  onChange={(event) =>
                    setSpecificDate(event.target.value)
                  }
                  className="rounded-lg border border-gray-400 bg-white px-3 py-2 text-gray-900"
                />
              </div>

              <div>
                <p className="mb-3 text-sm font-medium">
                  Available times
                </p>

                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {timeBlocks.map((timeBlock) => (
                    <label
                      key={timeBlock.value}
                      className="flex cursor-pointer items-center gap-2"
                    >
                      <input
                        type="checkbox"
                        checked={specificTimeBlocks.includes(
                          timeBlock.value
                        )}
                        onChange={() =>
                          toggleSpecificTimeBlock(
                            timeBlock.value
                          )
                        }
                        className="h-4 w-4"
                      />

                      <span className="text-sm">
                        {timeBlock.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={addSpecificDate}
                disabled={
                  !specificDate ||
                  specificTimeBlocks.length === 0
                }
                className="rounded-lg bg-gray-800 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                Add Date
              </button>

              {specificDates.length > 0 && (
                <div className="border-t border-gray-300 pt-4">
                  <p className="mb-3 text-sm font-medium">
                    Added dates
                  </p>

                  <div className="space-y-3">
                    {specificDates.map((entry) => (
                      <div
                        key={entry.date}
                        className="flex items-start justify-between gap-4 rounded-lg bg-gray-100 p-3"
                      >
                        <div>
                          <p className="font-medium">
                            {formatDate(entry.date)}
                          </p>

                          <p className="text-sm text-gray-700">
                            {entry.timeBlocks
                              .map(
                                (value) =>
                                  timeBlocks.find(
                                    (block) =>
                                      block.value === value
                                  )?.label
                              )
                              .join(", ")}
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            removeSpecificDate(entry.date)
                          }
                          className="text-sm font-medium text-gray-700 underline"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-lg bg-black px-4 py-3 font-medium text-white disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Join"}
          </button>

          {message && (
            <p className="rounded-lg bg-gray-200 p-3 text-sm text-gray-900">
              {message}
            </p>
          )}
        </form>
        <div className="mt-8 border-t border-gray-300 pt-6">
          <div className="flex flex-wrap gap-4">
            <a
              href="/calendar"
              className="rounded-lg border border-gray-400 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
            >
              View Calendar
            </a>

            <a
              href="/my-games"
              className="rounded-lg border border-gray-400 bg-white px-4 py-2 font-semibold hover:bg-gray-50"
            >
              My Games
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}