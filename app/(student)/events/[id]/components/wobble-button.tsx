"use client";

import React, { useRef, useState, useCallback } from "react";

interface WobbleButtonProps {
  text: string;
  hoverText?: string;
  fillColor?: string;
  textColor?: string;
  className?: string;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  style?: React.CSSProperties;
}

export default function WobbleButton({
  text,
  hoverText,
  fillColor = "black",
  textColor = "white",
  className = "",
  onClick,
  disabled = false,
  type = "button",
  style,
}: WobbleButtonProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    if (!buttonRef.current || disabled) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distanceX = (e.clientX - centerX) * 0.25;
    const distanceY = (e.clientY - centerY) * 0.25;

    setTransform({
      x: distanceX,
      y: distanceY,
      scale: 1.04,
    });
  }, [disabled]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    setTransform({ x: 0, y: 0, scale: 1 });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (!disabled) setIsHovered(true);
  }, [disabled]);

  const displayText = isHovered && hoverText ? hoverText : text;

  return (
    <button
      ref={buttonRef}
      type={type}
      disabled={disabled}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        backgroundColor: fillColor,
        color: textColor,
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        ...style,
      }}
      className={`relative inline-flex items-center justify-center px-8 py-3.5 rounded-full text-base font-bold tracking-wide transition-transform duration-200 ease-out active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none shadow-md hover:shadow-lg cursor-pointer font-['Dingos-Bold',sans-serif] ${className}`}
    >
      <span className="relative z-10 transition-all duration-200 inline-block">
        {displayText}
      </span>
    </button>
  );
}
