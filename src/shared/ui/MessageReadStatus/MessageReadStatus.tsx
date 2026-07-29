import { Check, CheckCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

type MessageReadStatusProps = {
  readAt?: string;
  compact?: boolean;
};

export function MessageReadStatus({ readAt, compact }: MessageReadStatusProps) {
  const { t } = useTranslation();
  const label = t(readAt ? "chats.message.read" : "chats.message.sent");

  return (
    <span
      className={`message-read-status${readAt ? " is-read" : ""}${compact ? " is-compact" : ""}`}
      aria-label={label}
      title={label}
    >
      {readAt ? <CheckCheck size={compact ? 12 : 14} /> : <Check size={compact ? 12 : 14} />}
      {!compact && label}
    </span>
  );
}
