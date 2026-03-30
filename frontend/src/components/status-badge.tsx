import { Badge } from "@/components/ui/badge";
import type { DocumentStatus } from "@/lib/api";

interface StatusBadgeProps {
  status: DocumentStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  if (status === "failed") {
    return (
      <Badge className="border-red-500/30 bg-red-500/15 text-red-400 hover:bg-red-500/20">
        failed
      </Badge>
    );
  }
  if (status === "needs_review") {
    return (
      <Badge className="border-amber-500/30 bg-amber-500/15 text-amber-400 hover:bg-amber-500/20">
        needs review
      </Badge>
    );
  }
  if (status === "linked") {
    return (
      <Badge className="border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/20">
        linked
      </Badge>
    );
  }
  if (status === "processing") {
    return (
      <Badge className="border-purple-500/30 bg-purple-500/15 text-purple-400 hover:bg-purple-500/20">
        processing
      </Badge>
    );
  }
  // queued / default
  return (
    <Badge className="border-primary/30 bg-primary/15 text-primary hover:bg-primary/20">
      {status}
    </Badge>
  );
}
