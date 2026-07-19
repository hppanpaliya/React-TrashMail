import { useCallback, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  LayoutDashboard,
  ScrollText,
  AlertTriangle,
  Users,
  Ticket,
  ShieldAlert,
  MailOpen,
  TrendingUp,
  Paperclip,
  Settings,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { openSSE } from "../../../sse";
import { cx } from "../../../utils/cx";
import OverviewTab from "./OverviewTab";
import AuditLogsTab from "./AuditLogsTab";
import ConflictsTab from "./ConflictsTab";
import UsersTab from "./UsersTab";
import InvitesTab from "./InvitesTab";
import SystemEmailsTab from "./SystemEmailsTab";
import ReceivedEmailsTab from "./ReceivedEmailsTab";
import TopEmailsTab from "./TopEmailsTab";
import AttachmentsTab from "./AttachmentsTab";
import SettingsTab from "./SettingsTab";

const SECTIONS = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, group: "General", component: OverviewTab },
  { id: "logs", label: "Audit Logs", icon: ScrollText, group: "Activity", component: AuditLogsTab },
  { id: "conflicts", label: "Conflicts", icon: AlertTriangle, group: "Activity", component: ConflictsTab },
  { id: "users", label: "Users", icon: Users, group: "Access", component: UsersTab },
  { id: "invites", label: "Invites", icon: Ticket, group: "Access", component: InvitesTab },
  { id: "system", label: "System Emails", icon: ShieldAlert, group: "Mail", component: SystemEmailsTab },
  { id: "received", label: "Received Emails", icon: MailOpen, group: "Mail", component: ReceivedEmailsTab },
  { id: "top", label: "Top Inboxes", icon: TrendingUp, group: "Mail", component: TopEmailsTab },
  { id: "attachments", label: "Attachments", icon: Paperclip, group: "Mail", component: AttachmentsTab },
  { id: "settings", label: "Settings", icon: Settings, group: "System", component: SettingsTab },
];

const GROUPS = [...new Set(SECTIONS.map((s) => s.group))];

const AdminDashboard = () => {
  const { token } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const sectionId = searchParams.get("section");
  const section = SECTIONS.find((s) => s.id === sectionId) || SECTIONS[0];
  const selectSection = (id) => setSearchParams(id === SECTIONS[0].id ? {} : { section: id });

  // One SSE connection for the whole dashboard; the mounted tab subscribes to
  // the event types it cares about. Token travels in the x-auth-token header
  // (openSSE), never the URL — an admin JWT in access logs would be a
  // serious leak.
  const sseHandlers = useRef({});
  const subscribeSSE = useCallback((type, handler) => {
    sseHandlers.current[type] = handler;
    return () => {
      delete sseHandlers.current[type];
    };
  }, []);
  useEffect(() => {
    if (!token) return undefined;
    const close = openSSE("/api/admin/sse/logs", {
      onData: (parsed) => sseHandlers.current[parsed.type]?.(parsed.data),
      onError: (err) => console.error("SSE Error:", err),
    });
    return close;
  }, [token]);

  const ActiveTab = section.component;

  const navButton = (s, mobile) => {
    const active = s.id === section.id;
    return (
      <button
        key={s.id}
        type="button"
        role="tab"
        aria-selected={active}
        onClick={() => selectSection(s.id)}
        className={cx(
          "flex items-center gap-2.5 rounded-xl text-left transition-colors duration-150 focus-ring cursor-pointer",
          mobile ? "whitespace-nowrap px-3 py-2 text-[13px] font-medium" : "w-full px-3 py-2 text-sm",
          active ? "bg-accent-soft font-semibold text-accent" : "text-muted hover:bg-raised hover:text-ink"
        )}
      >
        <s.icon aria-hidden="true" className="h-4 w-4 shrink-0" />
        {s.label}
      </button>
    );
  };

  return (
    <div className="pt-2">
      <h1 className="font-display text-2xl font-bold text-ink sm:text-3xl">Admin</h1>

      {/* Mobile / tablet: horizontally scrolling pill row */}
      <div
        role="tablist"
        aria-label="Admin sections"
        className="scrollbar-none -mx-4 mt-4 flex gap-1 overflow-x-auto border-b border-hairline px-4 pb-2 sm:mx-0 sm:px-0 lg:hidden"
      >
        {SECTIONS.map((s) => navButton(s, true))}
      </div>

      <div className="mt-4 lg:mt-6 lg:flex lg:gap-8">
        {/* Desktop: grouped section sidebar */}
        <nav aria-label="Admin sections" className="hidden w-52 shrink-0 lg:block">
          <div className="sticky top-8 flex flex-col gap-5">
            {GROUPS.map((group) => (
              <div key={group}>
                <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wide text-faint">{group}</p>
                <div className="flex flex-col gap-0.5" role="tablist">
                  {SECTIONS.filter((s) => s.group === group).map((s) => navButton(s, false))}
                </div>
              </div>
            ))}
          </div>
        </nav>

        {/* Active section */}
        <div className="min-w-0 flex-1">
          <ActiveTab subscribeSSE={subscribeSSE} />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
