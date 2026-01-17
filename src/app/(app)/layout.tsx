import { SidebarNav } from "@/components/SidebarNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-[274px] flex-none border-r border-zinc-200 bg-white sm:block">
          <SidebarNav />
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="h-[49px] w-full border-b border-zinc-200 bg-white" />
          <main className="min-w-0 flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}

