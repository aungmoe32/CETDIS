"use client";

import React, { useState } from "react";
import Link from "next/link";
import TabSwitch from "./tab-switch";
import ReviewTab from "./review-tab";
import WobbleButton from "./wobble-button";
import CheckoutModal from "../checkout-modal";
import { rsvpAction } from "../actions";
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Heart,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Tag,
} from "lucide-react";

export interface EventData {
  id: string;
  title: string;
  dateTime: string;
  location: string | null;
  maxCapacity: number;
  price: number;
  organizerName: string | null;
}

interface Props {
  event: EventData;
  ticketCount: number;
  hasTicket: boolean;
  isFull: boolean;
  isFree: boolean;
  currentUser: {
    id: string;
    fullName?: string;
  };
}

export default function EventDetailClient({
  event,
  ticketCount,
  hasTicket,
  isFull,
  isFree,
  currentUser,
}: Props) {
  const [activeTab, setActiveTab] = useState(0); // 0 = About, 1 = Review
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(24);

  const spotsRemaining = Math.max(0, event.maxCapacity - ticketCount);
  const capacityPercent = Math.min(
    100,
    Math.round((ticketCount / (event.maxCapacity || 1)) * 100)
  );

  const eventDate = new Date(event.dateTime);
  const formattedDate = eventDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = eventDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const handleLikeToggle = () => {
    setIsLiked((prev) => {
      setLikeCount((c) => (prev ? c - 1 : c + 1));
      return !prev;
    });
  };

  const renderActionButton = (fillColor = "black", textColor = "white", hoverText = "Enjoy!") => {
    if (hasTicket) {
      return (
        <div className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-green-100/90 text-green-800 font-['Dingos-Bold',sans-serif] font-bold text-sm sm:text-base border border-green-300 shadow-xs">
          <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
          <span>You&apos;re Registered</span>
        </div>
      );
    }

    if (isFull) {
      return (
        <div className="inline-flex items-center gap-2 px-6 py-3.5 rounded-full bg-red-100 text-red-700 font-['Dingos-Bold',sans-serif] font-bold text-sm sm:text-base border border-red-200">
          <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          <span>Event Full</span>
        </div>
      );
    }

    if (isFree) {
      return (
        <form action={rsvpAction} className="inline-block">
          <input type="hidden" name="event_id" value={event.id} />
          <WobbleButton
            type="submit"
            text="RSVP (Free)"
            hoverText={hoverText}
            fillColor={fillColor}
            textColor={textColor}
          />
        </form>
      );
    }

    return (
      <CheckoutModal
        eventId={event.id}
        eventTitle={event.title}
        price={event.price}
        renderTrigger={(open) => (
          <WobbleButton
            type="button"
            onClick={open}
            text={`Buy Ticket (${event.price.toLocaleString()} MMK)`}
            hoverText="Checkout"
            fillColor={fillColor}
            textColor={textColor}
          />
        )}
      />
    );
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-6 sm:py-10 animate-scale-up">
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between mb-4">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-sm font-semibold text-gray-600 hover:text-black transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Events</span>
        </Link>
        <span className="text-xs font-mono text-gray-400">
          CETDIS • Campus Events
        </span>
      </div>

      {/* Main Card Shell */}
      <div className="bg-[#f1e8dd] rounded-[36px] sm:rounded-[48px] p-5 sm:p-9 shadow-xl flex flex-col gap-6 border border-black/5">
        {/* Header Bar: Tabs & Rating */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <TabSwitch
            activeTab={activeTab}
            onChange={setActiveTab}
            textA="About"
            textB="Review"
          />

          <button
            type="button"
            onClick={handleLikeToggle}
            className="flex items-center gap-3 bg-white px-5 py-2.5 sm:px-6 sm:py-3 rounded-full shadow-sm hover:shadow-md transition-all active:scale-95 cursor-pointer border border-black/5"
            title="Like this event"
          >
            <span className="font-['Dingos-Bold',sans-serif] text-xl text-gray-900 font-extrabold">
              {likeCount}
            </span>
            <div className="w-7 h-7 flex items-center justify-center">
              <Heart
                className={`w-6 h-6 transition-transform duration-200 ${
                  isLiked
                    ? "text-red-500 fill-red-500 scale-110"
                    : "text-gray-900 hover:scale-105"
                }`}
              />
            </div>
          </button>
        </div>

        {/* Tab Content Panel */}
        <div key={activeTab} className="min-h-[400px]">
          {activeTab === 0 ? (
            <section className="animate-tab-slide flex flex-col gap-6">
              {/* Vibrant Hero Card */}
              <div className="bg-[#6dd2b0] rounded-[28px] p-6 sm:p-8 relative flex flex-col gap-5 shadow-sm text-[#0f3d2e]">
                {/* Title & Action Row */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="flex-1 pr-0 sm:pr-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/40 text-xs font-bold font-['Dingos',sans-serif] mb-2 uppercase tracking-wide">
                      <Tag className="w-3.5 h-3.5" />
                      <span>{isFree ? "Free Entry" : `${event.price.toLocaleString()} MMK`}</span>
                    </div>
                    <h1 className="font-['Dingos-Bold',sans-serif] text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight tracking-tight text-gray-950">
                      {event.title}
                    </h1>
                  </div>

                  <div className="shrink-0">
                    {renderActionButton("#f1e8dd", "black", "Join Now!")}
                  </div>
                </div>

                {/* Speaker / Organizer */}
                <p className="text-base text-[#1b4337] font-medium">
                  Hosted by{" "}
                  <span className="font-bold underline decoration-1 underline-offset-2">
                    {event.organizerName || "CETDIS Organizer Team"}
                  </span>
                </p>

                {/* Event Metadata Badges */}
                <div className="flex flex-wrap gap-2.5 pt-1">
                  <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/40 backdrop-blur-xs font-['Dingos',sans-serif] text-sm font-semibold text-[#0f3d2e]">
                    <Calendar className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>{formattedDate}</span>
                  </span>

                  <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/40 backdrop-blur-xs font-['Dingos',sans-serif] text-sm font-semibold text-[#0f3d2e]">
                    <Clock className="w-4 h-4 text-blue-700 shrink-0" />
                    <span>{formattedTime}</span>
                  </span>

                  {event.location && (
                    <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/40 backdrop-blur-xs font-['Dingos',sans-serif] text-sm font-semibold text-[#0f3d2e]">
                      <MapPin className="w-4 h-4 text-red-600 shrink-0" />
                      <span>{event.location}</span>
                    </span>
                  )}
                </div>

                {/* Capacity & Availability Bar */}
                <div className="flex flex-col gap-2 pt-2 border-t border-black/10">
                  <div className="flex justify-between items-center text-sm font-semibold font-['Dingos',sans-serif]">
                    <span className="inline-flex items-center gap-1.5 text-gray-800">
                      <Users className="w-4 h-4 text-indigo-700" />
                      Availability
                    </span>
                    <span className="font-['Dingos-Bold',sans-serif] text-base text-gray-950">
                      {ticketCount} / {event.maxCapacity}
                    </span>
                  </div>

                  <div className="w-full h-2.5 bg-black/15 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[#007c7a] to-[#0091b1] transition-all duration-700 ease-out shadow-xs"
                      style={{ width: `${capacityPercent}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-xs font-medium text-[#1b4337]">
                    <span>
                      {isFull
                        ? "Event reached full capacity"
                        : `${spotsRemaining} spots remaining`}
                    </span>
                    <span>{capacityPercent}% filled</span>
                  </div>
                </div>
              </div>

              {/* Event Description & Highlights Cards */}
              <div className="bg-white rounded-[28px] p-6 sm:p-10 shadow-sm border border-black/5 flex flex-col gap-6">
                <div className="border-b border-gray-100 pb-6">
                  <h3 className="font-['Dingos-Bold',sans-serif] text-2xl font-bold text-gray-900 mb-2">
                    Event Overview
                  </h3>
                  <p className="text-gray-600 leading-relaxed text-base">
                    Join students, faculty, and organizers for {event.title}. Bring your digital ticket
                    or NFC wristband for frictionless entry at the door.
                  </p>
                </div>

                <div className="border-b border-gray-100 pb-6">
                  <h4 className="font-['Dingos-Bold',sans-serif] text-xl font-bold text-gray-900 mb-2">
                    Campus Check-In & Entry
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    CETDIS empowers fast, offline-ready check-in. Event organizers scan your dynamic QR
                    token or tap your NFC tag at the door. Entry is verified in under a second even without internet.
                  </p>
                  <ul className="mt-4 space-y-2 text-sm text-gray-700 list-disc pl-5">
                    <li>
                      <strong>Digital QR:</strong> Found under the &ldquo;My ID&rdquo; tab in your student dashboard.
                    </li>
                    <li>
                      <strong>NFC Ready:</strong> Compatible with physical wristbands issued on campus.
                    </li>
                    <li>
                      <strong>Confirmation:</strong> Immediate check-in audit timestamp stored securely.
                    </li>
                  </ul>
                </div>

                <div>
                  <h4 className="font-['Dingos-Bold',sans-serif] text-xl font-bold text-gray-900 mb-2">
                    Guidelines & Requirements
                  </h4>
                  <p className="text-gray-600 leading-relaxed text-sm">
                    Please arrive 10 minutes prior to the scheduled start time. If you can no longer attend,
                    please inform the organizer so waitlisted attendees can claim your spot.
                  </p>
                </div>
              </div>

              {/* Bottom CTA Button */}
              <div className="flex justify-center items-center my-4">
                {renderActionButton("black", "white", "Register Now")}
              </div>
            </section>
          ) : (
            <ReviewTab currentUserName={currentUser.fullName} />
          )}
        </div>
      </div>
    </div>
  );
}
