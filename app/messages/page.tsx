import type { Metadata } from "next";
import Link from "next/link";

import { AppNav } from "@/components/AppNav";
import { ItemThumbnail } from "@/components/ItemCard";
import { CountBadge } from "@/components/TopAppBar";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";

export const metadata: Metadata = {
  title: "הודעות | שיתוף קהילתי",
};

const dateFormat = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jerusalem",
});

export default async function MessagesPage() {
  const user = await requirePageUser();
  const repo = await getRepository();
  const conversations = await repo.getConversations(user.id);

  return (
    <AppNav user={user} activePath="/messages" headerTitle="הודעות">
      <h1 className="mb-1 font-headline-md text-headline-md-mobile text-brand-deep md:text-headline-md">
        הודעות
      </h1>
      <p className="mb-stack-md font-body-md text-on-surface-variant">
        שיחה אחת לכל פריט, בינך לבין הצד השני. רק שניכם רואים אותה.
      </p>

      {conversations.length === 0 ? (
        <div className="rounded-xl border border-secondary/10 bg-white/70 p-10 text-center">
          <p className="text-on-surface-variant">
            עדיין אין שיחות. אפשר לפתוח שיחה מעמוד של פריט, או לשלוח בקשת השאלה.
          </p>
          <Link href="/catalog" className="mt-3 inline-block font-bold text-secondary underline">
            לקטלוג הפריטים
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {conversations.map((conversation) => {
            const unread = conversation.unread_count > 0;
            return (
              <li key={conversation.id}>
                <Link
                  href={`/messages/${conversation.id}`}
                  className={`flex items-center gap-3 rounded-2xl border bg-white p-4 transition-colors hover:bg-white/70 ${
                    unread ? "border-brand-mint" : "border-secondary/10"
                  }`}
                >
                  <ItemThumbnail item={conversation.item} className="h-14 w-14 rounded-lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-brand-deep">
                      {conversation.other_party_name ?? "חבר/ת קהילה"}
                      <span className="font-normal text-on-surface-variant">
                        {" · "}
                        {conversation.item?.name ?? "פריט"}
                      </span>
                    </p>
                    <p
                      className={`truncate text-sm ${
                        unread ? "font-bold text-brand-deep" : "text-on-surface-variant"
                      }`}
                    >
                      {conversation.last_message_preview}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className="text-xs text-on-surface-variant" dir="ltr">
                      {dateFormat.format(new Date(conversation.last_message_at))}
                    </span>
                    <CountBadge count={conversation.unread_count} />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppNav>
  );
}
