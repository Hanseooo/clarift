"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type ChatInputProps = {
  disabled?: boolean;
  isSending?: boolean;
  onSend: (message: string) => Promise<void>;
};

export function ChatInput({ disabled = false, isSending = false, onSend }: ChatInputProps) {
  const [message, setMessage] = useState("");

  const submit = async () => {
    const trimmed = message.trim();
    if (!trimmed || disabled || isSending) {
      return;
    }
    await onSend(trimmed);
    setMessage("");
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <textarea
        className="min-h-28 w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
        placeholder="Ask something about your notes..."
        value={message}
        onChange={(event) => setMessage(event.target.value)}
      />
      <Button className="w-full" disabled={disabled || isSending || !message.trim()} onClick={submit}>
        {isSending ? "Sending..." : "Send Message"}
      </Button>
    </section>
  );
}
