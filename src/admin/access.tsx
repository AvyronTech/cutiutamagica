import { useContext, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { canOpenAdminPath } from "@/lib/admin-access-policy";
import { AdminAccessContext } from "./access-context";
export function AdminLink({
  to,
  children,
  className,
}: {
  to: string;
  children: ReactNode;
  className?: string;
}) {
  const permissions = useContext(AdminAccessContext);
  if (!canOpenAdminPath(to, permissions)) return null;
  return (
    <Link to={to} className={className}>
      {children}
    </Link>
  );
}
