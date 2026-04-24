"use client";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  citations?: Array<{ chunk_id?: string | null }>;
};

type ChatMessagesProps = {
  messages: ChatMessage[];
  isSearching: boolean;
  error: string | null;
};

export function ChatMessages({ messages, isSearching, error }: ChatMessagesProps) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 space-y-4 min-h-[360px]">
      {messages.length ? (
        messages.map((message) => (
          <article
            key={message.id}
            className={`max-w-[85%] rounded-2xl px-4 py-3 ${
              message.role === "user"
                ? "ml-auto bg-primary text-primary-foreground"
                : "mr-auto bg-muted text-foreground"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            {message.citations?.length ? (
              <div className="mt-2 flex flex-wrap gap-2">
                {message.citations.map((citation, index) => (
                  <span key={`${message.id}-${index}`} className="rounded-full bg-accent-100 px-2 py-1 text-xs text-accent-800">
                    {citation.chunk_id ?? "chunk"}
                  </span>
                ))}
              </div>
            ) : null}
          </article>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">Start a conversation using your uploaded notes.</p>
      )}

      {isSearching ? (
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/60" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/60 [animation-delay:120ms]" />
            <span className="h-2 w-2 animate-pulse rounded-full bg-foreground/60 [animation-delay:240ms]" />
          </div>
          <span>Searching your notes...</span>
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </section>
  );
}
