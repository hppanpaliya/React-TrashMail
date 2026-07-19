import { useEffect, useState } from "react";
import { Users, Mails, MailPlus, Ticket, HardDrive, CalendarClock } from "lucide-react";
import api from "../../../api";
import StatCard from "./StatCard";
import { formatBytes } from "./shared";

const OverviewTab = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get("/api/admin/stats");
        if (!cancelled) setStats(res.data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const num = (v) => (v ?? 0).toLocaleString();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      <StatCard
        label="Users"
        value={num(stats?.totalUsers)}
        sub={stats?.disabledUsers ? `${stats.disabledUsers} disabled` : undefined}
        icon={Users}
        loading={loading}
      />
      <StatCard label="Total Emails" value={num(stats?.totalEmails)} icon={Mails} loading={loading} />
      <StatCard label="Emails Today" value={num(stats?.emailsToday)} icon={MailPlus} loading={loading} />
      <StatCard
        label="Active Invites"
        value={num(stats?.activeInvites)}
        sub={stats?.usedInvites ? `${stats.usedInvites} used` : undefined}
        icon={Ticket}
        loading={loading}
      />
      <StatCard label="Attachment Storage" value={formatBytes(stats?.attachmentStorageBytes)} icon={HardDrive} loading={loading} />
      <StatCard label="Email Retention" value={stats ? `${stats.emailRetentionDays}d` : "—"} icon={CalendarClock} loading={loading} />
    </div>
  );
};

export default OverviewTab;
