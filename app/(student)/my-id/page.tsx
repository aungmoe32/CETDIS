import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import { getBaseUrl } from "@/utils/url";
import QrDisplay from "./qr-display";
import NfcSection from "./nfc-section";

export const metadata = { title: "My Digital ID · CETDIS" };

export default async function MyIdPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");

  const baseUrl = getBaseUrl();
  const scanUrl = `${baseUrl}/scan/${profile.checkInToken}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8 gap-5 pb-24 select-none">
      {/* Universal Campus Pass Card */}
      <div className="w-full max-w-sm bg-white border border-gray-200/90 rounded-3xl shadow-xs p-6 sm:p-7 flex flex-col items-center gap-5 relative overflow-hidden">
        {/* Pass Top Badge */}
        <div className="flex items-center justify-between w-full border-b border-gray-100 pb-3">
          {/* <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center shadow-2xs">
              <svg
                className="h-3.5 w-3.5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2.5}
              >
                <circle cx="12" cy="12" r="9" />
                <circle cx="12" cy="12" r="5" />
                <circle
                  cx="12"
                  cy="12"
                  r="1.5"
                  fill="currentColor"
                  strokeWidth={0}
                />
              </svg>
            </div>
            <span className="font-bold text-gray-900 text-xs tracking-tight font-dingos-bold">
              CETDIS PASS
            </span>
          </div> */}

          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-full font-dingos-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
            <span>Universal Pass</span>
          </span>
        </div>

        {/* Student Profile Info */}
        {/* <div className="flex flex-col items-center text-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-700 flex items-center justify-center text-white font-dingos-bold text-xl shadow-xs">
            {profile.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 font-dingos-bold tracking-tight">
              {profile.fullName}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">{profile.email}</p>
          </div>
        </div> */}

        {/* QR Code Container */}
        <div className="bg-gray-50/80 rounded-3xl p-4 border border-gray-200/80 shadow-2xs flex flex-col items-center">
          <QrDisplay value={scanUrl} />
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold font-dingos-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>Active &amp; Ready to Scan</span>
          </div>
        </div>

        {/* Helper Note & Pass Token */}
        <div className="w-full text-center space-y-1">
          <p className="text-xs text-gray-500">
            Show this QR code at any campus event door
          </p>
          {/* <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
            ID: {profile.checkInToken.slice(0, 18)}...
          </p> */}
        </div>
      </div>

      {/* NFC Physical Card / Wristband Section */}
      <NfcSection
        purchasedNfc={profile.purchasedNfc}
        nfcIssued={profile.nfcIssued}
      />
    </div>
  );
}
