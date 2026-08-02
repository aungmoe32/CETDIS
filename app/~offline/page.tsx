import type { Metadata } from "next";
import OfflineContent from "./offline-content";

export const metadata: Metadata = {
  title: "You're offline — CETDIS",
};

export default function OfflinePage() {
  return <OfflineContent />;
}
