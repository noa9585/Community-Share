"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

import { MaterialIcon } from "@/components/MaterialIcon";
import {
  CHAT_MESSAGE_EVENT,
  type ChatMessageRow,
} from "@/components/RealtimeRefresher";
import { markConversationReadAction, sendMessageAction } from "@/lib/actions/chat";
import { compressImage } from "@/lib/utils/compress-image";
import { MAX_MESSAGE_LENGTH } from "@/lib/validation/schemas";
import type { ChatMessage } from "@/types/database";

/** How close to the bottom (px) still counts as "reading the latest messages". */
const NEAR_BOTTOM_PX = 120;

const timeFormat = new Intl.DateTimeFormat("he-IL", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Jerusalem",
});

/**
 * A message the server has not rendered yet: one being sent from this tab, or
 * one that just arrived over Realtime. `clientId` ties a sent message to its
 * optimistic copy.
 */
type LiveMessage = ChatMessage & { status?: "sending" | "failed"; clientId?: string };

function Bubble({
  message,
  mine,
  onImageLoad,
}: {
  message: LiveMessage;
  mine: boolean;
  onImageLoad: () => void;
}) {
  if (message.kind === "system") {
    return (
      <li className="flex justify-center">
        <p className="max-w-[90%] rounded-full bg-secondary/10 px-4 py-1.5 text-center text-xs text-secondary">
          {message.body}
        </p>
      </li>
    );
  }

  return (
    <li className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] space-y-1 rounded-2xl px-4 py-2 ${
          mine
            ? "rounded-bl-sm bg-brand-mint text-brand-deep"
            : "rounded-br-sm border border-secondary/10 bg-white text-on-surface"
        }`}
      >
        {message.image_url && (
          <a href={message.image_url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={message.image_url}
              alt="תמונה שנשלחה בצ'אט"
              onLoad={onImageLoad}
              className="max-h-64 rounded-xl object-cover"
            />
          </a>
        )}
        {message.kind === "image" && !message.image_url && (
          <p className="text-sm italic opacity-70">תמונה נטענת...</p>
        )}
        {message.body && (
          <p className="whitespace-pre-line break-words font-body-md">{message.body}</p>
        )}
        <p className="flex items-center justify-end gap-1 text-[11px] opacity-60" dir="ltr">
          {timeFormat.format(new Date(message.created_at))}
          {mine && (
            <MaterialIcon
              name={message.status === "sending" ? "schedule" : message.status === "failed" ? "error" : "done"}
              size={14}
              className={message.status === "failed" ? "text-error opacity-100" : ""}
            />
          )}
        </p>
        {message.status === "failed" && (
          <p className="text-xs font-bold text-error">לא נשלחה</p>
        )}
      </div>
    </li>
  );
}

export function ChatThread({
  conversationId,
  currentUserId,
  messages,
}: {
  conversationId: string;
  currentUserId: string;
  messages: ChatMessage[];
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  // Whether the reader is at the latest messages. Kept in a ref because it
  // changes on every scroll and must not re-render the thread.
  const atBottomRef = useRef(true);
  const [live, setLive] = useState<LiveMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [image, setImage] = useState<{ file: File; preview: string } | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasNewBelow, setHasNewBelow] = useState(false);

  // What the server rendered, plus whatever is newer than that render.
  const serverIds = new Set(messages.map((message) => message.id));
  const shown: LiveMessage[] = [
    ...messages,
    ...live.filter((message) => !serverIds.has(message.id)),
  ];

  const lastMessage = shown.at(-1);
  const lastMessageId = lastMessage?.id;
  const lastIsMine = lastMessage?.sender_id === currentUserId;

  function scrollToBottom(smooth: boolean) {
    const list = listRef.current;
    if (!list) return;
    list.scrollTo({ top: list.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    atBottomRef.current = true;
    setHasNewBelow(false);
  }

  function handleScroll() {
    const list = listRef.current;
    if (!list) return;
    atBottomRef.current = list.scrollHeight - list.scrollTop - list.clientHeight < NEAR_BOTTOM_PX;
    if (atBottomRef.current) setHasNewBelow(false);
  }

  // Opening a chat starts at the latest message, before the first paint.
  useLayoutEffect(() => {
    const list = listRef.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [conversationId]);

  // A new message: follow it if the reader is at the bottom (or sent it),
  // otherwise leave their place alone and offer a jump button instead.
  // Either way, a message that arrived while the chat is open has been read.
  // Messages from the other side arrive here the moment Realtime sees them.
  useEffect(() => {
    function onMessage(event: Event) {
      const row = (event as CustomEvent<ChatMessageRow>).detail;
      if (row.conversation_id !== conversationId) return;
      setLive((current) => {
        if (current.some((message) => message.id === row.id)) return current;
        // Our own message coming back: confirm the optimistic copy.
        if (row.sender_id === currentUserId) {
          const index = current.findIndex(
            (message) => message.status === "sending" && message.body === row.body,
          );
          if (index >= 0) {
            const next = [...current];
            next[index] = { ...next[index], id: row.id, status: undefined };
            return next;
          }
        }
        return [...current, { ...row, image_url: null }];
      });
    }
    window.addEventListener(CHAT_MESSAGE_EVENT, onMessage);
    return () => window.removeEventListener(CHAT_MESSAGE_EVENT, onMessage);
  }, [conversationId, currentUserId]);

  useEffect(() => {
    if (!lastMessageId) return;
    if (!lastIsMine) void markConversationReadAction(conversationId);
    const frame = requestAnimationFrame(() => {
      if (atBottomRef.current || lastIsMine) scrollToBottom(true);
      else setHasNewBelow(true);
    });
    return () => cancelAnimationFrame(frame);
  }, [conversationId, lastMessageId, lastIsMine]);

  /** A picture that finishes loading grows the thread; stay at the bottom. */
  function handleImageLoad() {
    if (atBottomRef.current) scrollToBottom(false);
  }

  function clearImage() {
    if (image) URL.revokeObjectURL(image.preview);
    setImage(null);
  }

  async function pickImage(file: File | undefined) {
    if (!file) return;
    setError(null);
    setProcessing(true);
    const compressed = await compressImage(file);
    setProcessing(false);
    if (!compressed) {
      setError("הקובץ אינו תמונה תקינה");
      return;
    }
    clearImage();
    setImage({ file: compressed, preview: URL.createObjectURL(compressed) });
  }

  /**
   * Shows the message immediately, as messaging apps do, and sends it in the
   * background. The bubble shows a clock until the server confirms it.
   */
  function send() {
    const form = formRef.current;
    if (!form) return;

    const formData = new FormData(form);
    // The file picker itself is not submitted; only the shrunken copy is.
    formData.delete("image");
    if (image) formData.append("image", image.file);
    const body = String(formData.get("body") ?? "").trim();
    if (!body && !image) return;

    const clientId = crypto.randomUUID();
    setLive((current) => [
      ...current,
      {
        id: clientId,
        clientId,
        conversation_id: conversationId,
        sender_id: currentUserId,
        kind: image ? "image" : "text",
        body,
        // The local preview stands in until the server's copy is loaded.
        image_url: image?.preview ?? null,
        created_at: new Date().toISOString(),
        status: "sending",
      },
    ]);
    setError(null);
    form.reset();
    setImage(null);

    void sendMessageAction({}, formData)
      .catch(() => ({ error: "ההודעה לא נשלחה", messageId: undefined }))
      .then((result) => {
        const messageId = result.messageId;
        setLive((current) =>
          messageId
            ? current
                // Realtime may have delivered the same message already.
                .filter((message) => message.id !== messageId || message.clientId === clientId)
                .map((message) =>
                  message.clientId === clientId
                    ? { ...message, id: messageId, status: undefined }
                    : message,
                )
            : current.map((message) =>
                message.clientId === clientId ? { ...message, status: "failed" } : message,
              ),
        );
        if (result.error) setError(result.error);
      });
  }

  return (
    <div className="space-y-3">
      {/* The thread scrolls inside its own box, so the composer is always in
          view and new messages appear right above it, as in a messaging app. */}
      <div className="relative">
        <div
          ref={listRef}
          onScroll={handleScroll}
          className="h-[calc(100dvh-26rem)] min-h-64 overflow-y-auto overscroll-contain rounded-2xl border border-secondary/10 bg-white/50 p-3 md:h-[calc(100dvh-21rem)] md:p-4"
        >
          {shown.length === 0 ? (
            <p className="p-8 text-center text-on-surface-variant">
              עדיין אין הודעות. כתבו את ההודעה הראשונה.
            </p>
          ) : (
            <ul className="space-y-3" aria-live="polite">
              {shown.map((message) => (
                <Bubble
                  key={message.id}
                  message={message}
                  mine={message.sender_id === currentUserId}
                  onImageLoad={handleImageLoad}
                />
              ))}
            </ul>
          )}
        </div>

        {hasNewBelow && (
          <button
            type="button"
            onClick={() => scrollToBottom(true)}
            className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-secondary px-4 py-2 text-sm font-bold text-on-secondary shadow-lg"
          >
            <MaterialIcon name="arrow_downward" size={18} />
            הודעה חדשה
          </button>
        )}
      </div>

      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
        className="space-y-2 rounded-2xl border border-secondary/15 bg-white p-3 shadow-sm"
      >
        <input type="hidden" name="conversationId" value={conversationId} />

        {image && (
          <div className="relative inline-block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.preview} alt="" className="h-20 w-20 rounded-lg object-cover" />
            <button
              type="button"
              onClick={clearImage}
              aria-label="הסר תמונה"
              className="absolute -left-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white text-error shadow"
            >
              <MaterialIcon name="close" size={16} />
            </button>
          </div>
        )}

        <div className="flex items-end gap-2">
          <label
            className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-secondary transition-colors hover:bg-secondary/10"
            aria-label="צירוף תמונה"
          >
            <MaterialIcon name={processing ? "hourglass_empty" : "add_photo_alternate"} />
            <input
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp"
              disabled={processing}
              className="sr-only"
              onChange={(event) => {
                void pickImage(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </label>
          <textarea
            name="body"
            rows={1}
            maxLength={MAX_MESSAGE_LENGTH}
            placeholder="כתבו הודעה..."
            aria-label="הודעה"
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
                event.preventDefault();
                send();
              }
            }}
            className="max-h-32 min-h-11 flex-1 resize-none rounded-xl border-none bg-surface-container-low px-4 py-2.5 font-body-md text-on-surface focus:ring-2 focus:ring-trust-mint"
          />
          <button
            type="submit"
            disabled={processing}
            aria-label="שליחה"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-mint text-brand-deep transition-transform active:scale-90 disabled:opacity-60"
          >
            <MaterialIcon name="send" className="-scale-x-100" />
          </button>
        </div>

        {error && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </div>
  );
}
