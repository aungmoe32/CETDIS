import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db";
import { profiles } from "@/drizzle/schema";
import { eq } from "drizzle-orm";
import QrDisplay from "./qr-display";

export const metadata = { title: "My Digital ID" };

export default async function MyIdPage() {
  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profile] = await db
    .select()
    .from(profiles)
    .where(eq(profiles.id, user.id))
    .limit(1);

  if (!profile) redirect("/login");

  const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? ""}/scan/${profile.checkInToken}`;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] px-4 py-8">
      <div className="w-full max-w-xs bg-white border border-gray-200 rounded-2xl shadow-sm p-6 flex flex-col items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
          <span className="text-indigo-600 font-bold text-lg">
            {profile.fullName.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="text-center">
          <p className="font-semibold text-gray-900">{profile.fullName}</p>
          <p className="text-xs text-gray-400">{profile.email}</p>
        </div>
        <div className="bg-gray-50 rounded-xl p-3">
          <QrDisplay value={scanUrl} />
        </div>
        <p className="text-xs text-gray-400 text-center">
          Show this QR code at the event entrance
        </p>
      </div>
    </div>
  );
}
