"use client";

import { ByocKeyForm } from "@/components/identity/byoc-key-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { copy } from "@/lib/copy";

type ByocModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ByocModal({ open, onOpenChange }: ByocModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{copy.providers.byocModalTitle}</DialogTitle>
          <DialogDescription>{copy.providers.byocModalBody}</DialogDescription>
        </DialogHeader>
        <ByocKeyForm onSaved={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
