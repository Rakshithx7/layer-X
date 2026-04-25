import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";

export const Route = createFileRoute("/app")({
  head: () => ({
    meta: [
      { title: "Dashboard — layer-x" },
      { name: "description", content: "Your layer-x command center." },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
