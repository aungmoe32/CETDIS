import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Offline",
};

export default function Page() {
  return (
    <>
      <h1>You are offline</h1>
      <h2>When offline, any page route will fallback to this page</h2>
    </>
  );
}
