"use client";

import React, { useState } from "react";
import WobbleButton from "./wobble-button";
import { Pen, Smile, MessageSquare } from "lucide-react";

interface ReviewItem {
  id: string | number;
  name: string;
  review: string;
  date: string;
  avatarBg?: string;
}

const INITIAL_REVIEWS: ReviewItem[] = [
  {
    id: 1,
    name: "Addy",
    review: "The event was really well organized. Had a great time!",
    date: "1h ago",
    avatarBg: "#f1e8dd",
  },
  {
    id: 2,
    name: "Mia",
    review: "Loved the atmosphere and the people. Definitely coming again.",
    date: "2h ago",
    avatarBg: "#e0e7ff",
  },
  {
    id: 3,
    name: "Ethan",
    review: "Everything was smooth from entry to the end of the event.",
    date: "4h ago",
    avatarBg: "#fee2e2",
  },
  {
    id: 4,
    name: "Sophia",
    review: "Such a fun event! The activities were amazing.",
    date: "6h ago",
    avatarBg: "#fef3c7",
  },
  {
    id: 5,
    name: "Noah",
    review: "Great experience overall. Can't wait for the next one!",
    date: "1d ago",
    avatarBg: "#dcfce7",
  },
];

interface ReviewTabProps {
  currentUserName?: string;
}

export default function ReviewTab({ currentUserName = "You" }: ReviewTabProps) {
  const [reviews, setReviews] = useState<ReviewItem[]>(INITIAL_REVIEWS);
  const [inputText, setInputText] = useState("");

  const handlePostReview = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed) return;

    const newReview: ReviewItem = {
      id: Date.now(),
      name: currentUserName || "Student",
      review: trimmed,
      date: "Just now",
      avatarBg: "#fed7aa",
    };

    setReviews([newReview, ...reviews]);
    setInputText("");
  };

  return (
    <section className="animate-tab-slide flex flex-col gap-6">
      {/* Review Input Box */}
      <div className="bg-[#a8abf6] rounded-[28px] p-6 sm:p-8 shadow-sm">
        <form onSubmit={handlePostReview} className="flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-3 w-full sm:flex-1">
            <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center shrink-0 shadow-sm">
              <Pen className="w-5 h-5 text-gray-800" />
            </div>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Write your review..."
              className="w-full bg-transparent border-none outline-none font-['Dingos-Bold',sans-serif] text-lg text-gray-900 placeholder-gray-700/80 px-2 py-1"
            />

            <button
              type="button"
              onClick={() => setInputText((prev) => prev + " 😊")}
              className="w-10 h-10 rounded-full bg-white/80 hover:bg-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              title="Add emoji"
            >
              <Smile className="w-5 h-5 text-gray-800" />
            </button>
          </div>

          <div className="w-full sm:w-auto flex justify-end">
            <WobbleButton
              type="submit"
              text="Post"
              hoverText="Share"
              fillColor="white"
              textColor="black"
              className="w-full sm:w-auto px-8"
              disabled={!inputText.trim()}
            />
          </div>
        </form>
      </div>

      {/* User Reviews List */}
      <div className="bg-white rounded-[28px] p-6 sm:p-10 shadow-sm border border-black/5">
        <div className="flex items-center gap-2 mb-6 pb-4 border-b border-gray-100">
          <MessageSquare className="w-5 h-5 text-indigo-600" />
          <h3 className="font-['Dingos-Bold',sans-serif] text-xl text-gray-900">
            Student Reviews ({reviews.length})
          </h3>
        </div>

        <div className="space-y-6">
          {reviews.map((rev) => (
            <div key={rev.id} className="flex items-start gap-4 pb-6 border-b border-gray-100 last:border-none last:pb-0">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center font-bold text-gray-700 shrink-0 text-base shadow-xs"
                style={{ backgroundColor: rev.avatarBg || "#f1e8dd" }}
              >
                {rev.name.slice(0, 2).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <h4 className="font-['Dingos-Bold',sans-serif] text-lg text-gray-900">
                    {rev.name}
                  </h4>
                  <span className="text-xs text-gray-400 font-sans">{rev.date}</span>
                </div>
                <p className="text-gray-700 text-sm mt-1 leading-relaxed">
                  {rev.review}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
