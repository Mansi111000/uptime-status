"use client";

export default function UptimeBadge({ value }: { value: number | undefined }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-md text-xs bg-gray-700 text-gray-300">
        --
      </span>
    );
  }
  const color =
    value >= 99.9 ? "bg-green-600" : value >= 98 ? "bg-yellow-600" : "bg-red-600";
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-md text-xs text-white ${color}`}>
      {value.toFixed(2)}%
    </span>
  );
}
