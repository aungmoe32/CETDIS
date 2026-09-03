export default function EventDetailLoading() {
  return (
    <div className="px-4 py-6 max-w-lg mx-auto space-y-5 animate-pulse">
      {/* Title & Badge */}
      <div className="flex items-start justify-between gap-3">
        <div className="h-6 w-56 bg-gray-200 rounded-md" />
        <div className="h-6 w-16 bg-gray-100 rounded-md shrink-0" />
      </div>

      {/* Date & Location Details */}
      <div className="space-y-2">
        <div className="h-4 w-44 bg-gray-100 rounded" />
        <div className="h-4 w-36 bg-gray-100 rounded" />
      </div>

      {/* Spots left */}
      <div className="h-3.5 w-28 bg-gray-100 rounded" />

      {/* RSVP Action Box */}
      <div className="pt-2 border-t border-gray-100">
        <div className="h-11 w-full bg-gray-200 rounded-xl" />
      </div>
    </div>
  );
}
