"use client";

import React, { useState } from "react";

export interface WobbleButtonProps {
  /** Label text */
  text: string;
  /** Alternative label shown on hover */
  hoverText?: string;
  /** Background color */
  fillColor?: string;
  /** Background color on hover */
  hoverColor?: string;
  /** Text color */
  textColor?: string;
  /** Text color on hover */
  hoverTextColor?: string;
  /** Font family class (default: font-dingos-bold) */
  fontFamily?: string;
  /** Additional CSS class names */
  className?: string;
  /** Width in px or css string */
  width?: number | string;
  /** Height in px or css string */
  height?: number | string;
  /** Click handler */
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Optional icon prefix */
  icon?: React.ReactNode;
  /** Disabled state */
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
}

/**
 * High-performance, zero-tick Wobble Button
 * Captures the organic, playful micro-interaction vibe of Immersive-Event-Ticket
 * without continuous requestAnimationFrame or spring physics loops.
 */
export default function WobbleButton({
  text,
  hoverText,
  fillColor = "#4f46e5",
  hoverColor,
  textColor = "#ffffff",
  hoverTextColor,
  fontFamily = "font-dingos-bold",
  className = "",
  width,
  height,
  onClick,
  icon,
  disabled = false,
  type = "button",
}: WobbleButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const style: React.CSSProperties = {
    backgroundColor: isHovered && hoverColor ? hoverColor : fillColor,
    color: isHovered && hoverTextColor ? hoverTextColor : textColor,
    ...(width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={style}
      className={`relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full font-bold tracking-wide select-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-xs hover:shadow-md transition-all duration-200 ease-out active:scale-95 hover:scale-[1.03] ${fontFamily} ${className}`}
    >
      {icon && (
        <span className="inline-flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
          {icon}
        </span>
      )}
      <span className="relative inline-block overflow-hidden transition-all duration-200">
        {hoverText ? (
          <span className="block transition-transform duration-200 ease-out">
            {isHovered ? hoverText : text}
          </span>
        ) : (
          <span>{text}</span>
        )}
      </span>
    </button>
  );
}
