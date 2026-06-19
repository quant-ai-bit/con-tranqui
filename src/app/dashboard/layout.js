export const dynamic = 'force-dynamic';

import Sidebar from "@/components/Sidebar";
import ChatCopilot from "@/components/ChatCopilot";

export default function DashboardLayout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">{children}</main>
      <ChatCopilot />
    </div>
  );
}

