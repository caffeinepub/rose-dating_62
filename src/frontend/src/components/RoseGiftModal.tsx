import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";

interface RoseGiftModalProps {
  open: boolean;
  onClose: () => void;
  onGift: (amount: number) => Promise<void>;
  recipientName: string;
  currentBalance: number;
}

export default function RoseGiftModal({
  open,
  onClose,
  onGift,
  recipientName,
  currentBalance,
}: RoseGiftModalProps) {
  const [amount, setAmount] = useState("");
  const [isGifting, setIsGifting] = useState(false);

  const handleGift = async () => {
    const numAmount = Number.parseFloat(amount);

    if (Number.isNaN(numAmount) || numAmount < 0.01) {
      toast.error("Minimum gift amount is 0.01 Rose");
      return;
    }

    if (numAmount > currentBalance) {
      toast.error("Insufficient balance");
      return;
    }

    setIsGifting(true);
    try {
      await onGift(numAmount);
      toast.success(
        `Gifted ${numAmount.toFixed(4)} Roses to ${recipientName}!`,
      );
      setAmount("");
      onClose();
    } catch (error: any) {
      toast.error(error.message || "Failed to gift Roses");
    } finally {
      setIsGifting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <img
              src="/assets/generated/rose-gift-icon-transparent.dim_32x32.png"
              alt="Rose"
              className="h-6 w-6"
            />
            Gift Roses
          </DialogTitle>
          <DialogDescription>Send Roses to {recipientName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (Roses)</Label>
            <Input
              id="amount"
              type="number"
              step="0.0001"
              min="0.01"
              placeholder="0.0000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isGifting}
            />
            <p className="text-xs text-muted-foreground">
              Your balance: {currentBalance.toFixed(4)} Roses
            </p>
            <p className="text-xs text-muted-foreground">
              Minimum: 0.01 Rose • 5% platform fee applies
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isGifting}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleGift}
              disabled={
                isGifting ||
                !amount ||
                Number.isNaN(Number.parseFloat(amount)) ||
                Number.parseFloat(amount) < 0.01
              }
              className="flex-1"
            >
              {isGifting ? "Gifting..." : "Gift Roses"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
