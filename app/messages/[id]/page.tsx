import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AppNav } from "@/components/AppNav";
import { ChatThread } from "@/components/ChatThread";
import { ItemThumbnail } from "@/components/ItemCard";
import { MaterialIcon } from "@/components/MaterialIcon";
import { requirePageUser } from "@/lib/auth/session";
import { getRepository } from "@/lib/data/index";
import { isValidStorageUrl } from "@/lib/utils/url";

export const metadata: Metadata = {
  title: "שיחה | שיתוף קהילתי",
};

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requirePageUser();
  const repo = await getRepository();

  // Returns null for anyone who is not one of the two participants.
  const conversation = await repo.getConversation(id, user.id);
  if (!conversation) notFound();

  const messages = conversation.messages.map((message) => ({
    ...message,
    image_url:
      message.image_url && isValidStorageUrl(message.image_url) ? message.image_url : null,
  }));
  const otherName = conversation.other_party_name ?? "חבר/ת קהילה";

  return (
    <AppNav user={user} activePath="/messages" headerTitle="הודעות">
      <div className="mx-auto max-w-3xl">
        <Link
          href="/messages"
          className="mb-4 inline-flex items-center gap-1 font-label-md text-label-md text-on-surface-variant hover:text-primary"
        >
          <MaterialIcon name="chevron_right" size={18} />
          לכל ההודעות
        </Link>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-secondary/10 bg-white p-4">
          <div className="flex min-w-0 items-center gap-3">
            <ItemThumbnail item={conversation.item} className="h-14 w-14 rounded-lg" />
            <div className="min-w-0">
              <h1 className="truncate font-headline-sm text-headline-sm text-brand-deep">
                {otherName}
              </h1>
              <p className="truncate text-sm text-on-surface-variant">
                {conversation.viewer_is_owner ? "מתעניין/ת בפריט שלך: " : "בעל/ת הפריט: "}
                {conversation.item ? (
                  <Link href={`/items/${conversation.item_id}`} className="font-bold underline">
                    {conversation.item.name}
                  </Link>
                ) : (
                  "פריט שאינו זמין עוד"
                )}
              </p>
            </div>
          </div>
          <Link
            href={`/report?user=${conversation.other_party_id}`}
            className="flex items-center gap-1 text-sm text-on-surface-variant underline hover:text-error"
          >
            <MaterialIcon name="flag" size={18} />
            דיווח על המשתמש/ת
          </Link>
        </div>

        <ChatThread conversationId={conversation.id} currentUserId={user.id} messages={messages} />
      </div>
    </AppNav>
  );
}
