import { type ReactNode } from "react";
import { CircleAlert } from "lucide-react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="fcw-flex-center fcw-flex-col fcw-gap-md fcw-py-lg" style={{ minHeight: "40vh" }}>
      <div className="fcw-text-tertiary" style={{ opacity: 0.6 }}>
        {icon || <CircleAlert size={48} />}
      </div>
      <h3 className="fcw-h3 fcw-text-secondary" style={{ margin: 0 }}>{title}</h3>
      {description && <p className="fcw-body fcw-text-tertiary fcw-text-center">{description}</p>}
      {action}
    </div>
  );
}
