"use client";

import * as React from "react";
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import { Loader2, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { deleteDocument } from "@/app/actions/documents";
import { cn } from "@/lib/utils";

interface DeleteDocumentButtonProps {
  documentId: string;
  className?: string;
}

export function DeleteDocumentButton({
  documentId,
  className,
}: DeleteDocumentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [isPending, setIsPending] = React.useState(false);

  async function handleDelete() {
    setIsPending(true);
    try {
      await deleteDocument(documentId);
      setOpen(false);
      router.push("/documents");
    } catch (error) {
      console.error("Failed to delete document:", error);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialogPrimitive.Root open={open} onOpenChange={setOpen}>
      <AlertDialogPrimitive.Trigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "bg-[#FEE2E2] text-[#991B1B] hover:bg-[#EF4444] hover:text-white dark:bg-[#FEE2E2] dark:text-[#991B1B] dark:hover:bg-[#EF4444] dark:hover:text-white",
            className
          )}
        >
          <Trash2 className="size-4" />
        </Button>
      </AlertDialogPrimitive.Trigger>

      <AlertDialogPrimitive.Portal>
        <AlertDialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-border bg-background p-6 shadow-lg rounded-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]">
          <AlertDialogPrimitive.Title className="text-sm font-semibold text-foreground">
            Delete this document?
          </AlertDialogPrimitive.Title>
          <AlertDialogPrimitive.Description className="text-sm text-muted-foreground">
            This will permanently remove the document and all associated data from
            the database. This action cannot be undone.
          </AlertDialogPrimitive.Description>

          <div className="flex justify-end gap-2">
            <AlertDialogPrimitive.Cancel asChild>
              <Button variant="ghost" size="sm" disabled={isPending}>
                Cancel
              </Button>
            </AlertDialogPrimitive.Cancel>
            <AlertDialogPrimitive.Action asChild>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={isPending}
                className="bg-[#EF4444] text-white hover:bg-[#DC2626]"
              >
                {isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </AlertDialogPrimitive.Action>
          </div>
        </AlertDialogPrimitive.Content>
      </AlertDialogPrimitive.Portal>
    </AlertDialogPrimitive.Root>
  );
}