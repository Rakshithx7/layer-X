import { createFileRoute } from "@tanstack/react-router";
import { CommandCenter } from "@/components/app/CommandCenter";

export const Route = createFileRoute("/app/")({
  component: DashboardPage,
});

function DashboardPage() {
  return <CommandCenter />;
}
