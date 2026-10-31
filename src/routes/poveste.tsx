import { createFileRoute, redirect } from "@tanstack/react-router";
export const Route = createFileRoute("/poveste")({
  beforeLoad: () => {
    throw redirect({ to: "/despre-cutiuta", statusCode: 301 });
  },
});
