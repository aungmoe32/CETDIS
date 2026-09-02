"use client";

import React from "react";

interface TabSwitchProps {
  activeTab: number; // 0 = About, 1 = Review
  onChange: (tabIndex: number) => void;
  textA?: string;
  textB?: string;
}

export default function TabSwitch({
  activeTab,
  onChange,
  textA = "About",
  textB = "Review",
}: TabSwitchProps) {
  return (
    <div className="relative inline-flex items-center bg-white p-1.5 rounded-full shadow-sm border border-black/5 select-none">
      {/* Animated Sliding Pill */}
      <div
        className="absolute top-1.5 bottom-1.5 w-[calc(50%-6px)] rounded-full bg-black transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] pointer-events-none"
        style={{
          transform: `translateX(calc(${activeTab} * 100%))`,
          left: "6px",
        }}
        aria-hidden="true"
      />

      <button
        type="button"
        onClick={() => onChange(0)}
        className={`relative z-10 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-lg sm:text-xl font-extrabold uppercase tracking-wider font-['Dingos-Bold',sans-serif] transition-colors duration-200 cursor-pointer ${
          activeTab === 0 ? "text-white" : "text-gray-800 hover:text-black"
        }`}
      >
        {textA}
      </button>

      <button
        type="button"
        onClick={() => onChange(1)}
        className={`relative z-10 px-6 py-2.5 sm:px-8 sm:py-3 rounded-full text-lg sm:text-xl font-extrabold uppercase tracking-wider font-['Dingos-Bold',sans-serif] transition-colors duration-200 cursor-pointer ${
          activeTab === 1 ? "text-white" : "text-gray-800 hover:text-black"
        }`}
      >
        {textB}
      </button>
    </div>
  );
}
