"use client";

import { QRCodeSVG } from "qrcode.react";

export default function QrDisplay({ value }: { value: string }) {
  return (
    <QRCodeSVG
      value={value}
      size={200}
      bgColor="#f9fafb"
      fgColor="#111827"
      level="M"
    />
  );
}
