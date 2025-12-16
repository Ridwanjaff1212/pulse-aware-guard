import { useState } from "react";
import { Mic, Volume2, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface KeywordSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentKeyword?: string;
  onSaveKeyword: (keyword: string) => void;
}

export function KeywordSetupDialog({
  open,
  onOpenChange,
  currentKeyword,
  onSaveKeyword,
}: KeywordSetupDialogProps) {
  const [keyword, setKeyword] = useState(currentKeyword || "");
  const [isRecording, setIsRecording] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  const handleRecordVoice = () => {
    setIsRecording(true);
    // Simulate voice recording
    setTimeout(() => {
      setIsRecording(false);
    }, 3000);
  };

  const handleTestKeyword = () => {
    setIsTesting(true);
    setTimeout(() => {
      setIsTesting(false);
    }, 2000);
  };

  const handleSave = () => {
    if (keyword.trim()) {
      onSaveKeyword(keyword.trim());
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5 text-primary" />
            Emergency Voice Keyword
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Set a secret phrase that instantly activates Emergency Mode when
            spoken. This works even when your phone is locked.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">
              Your Emergency Phrase
            </label>
            <Input
              placeholder="e.g., 'Call Mom now'"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="bg-secondary/50 border-border"
            />
            <p className="text-xs text-muted-foreground">
              Choose something natural but unique that you wouldn't say
              accidentally.
            </p>
          </div>

          <div className="rounded-lg border border-border/50 bg-secondary/30 p-4">
            <h4 className="mb-3 text-sm font-medium text-foreground">
              Voice Training
            </h4>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleRecordVoice}
                disabled={!keyword.trim()}
              >
                {isRecording ? (
                  <>
                    <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
                    Recording...
                  </>
                ) : (
                  <>
                    <Mic className="mr-2 h-4 w-4" />
                    Record Voice
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleTestKeyword}
                disabled={!keyword.trim() || isRecording}
              >
                {isTesting ? (
                  <>
                    <Check className="mr-2 h-4 w-4 text-safe" />
                    Verified
                  </>
                ) : (
                  <>
                    <Volume2 className="mr-2 h-4 w-4" />
                    Test
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-warning/10 p-3">
            <AlertCircle className="mt-0.5 h-4 w-4 text-warning" />
            <p className="text-xs text-warning">
              Never share your emergency phrase with anyone. It's your secret
              safety trigger.
            </p>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              className="flex-1"
              onClick={handleSave}
              disabled={!keyword.trim()}
            >
              <Check className="mr-2 h-4 w-4" />
              Save Keyword
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
