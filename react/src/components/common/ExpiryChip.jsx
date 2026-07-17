import { Hourglass } from "lucide-react";
import Chip from "../ui/Chip";
import { useConfig } from "../../context/ConfigContext";

const DAY_MS = 24 * 60 * 60 * 1000;

// "expires in Xd" chip based on server retention. Hidden when the backend
// doesn't expose /api/config (retentionDays == null) or the date is invalid.
const ExpiryChip = ({ date, className }) => {
  const { retentionDays } = useConfig();

  if (!retentionDays || !date) return null;

  const received = new Date(date).getTime();
  if (Number.isNaN(received)) return null;

  // eslint-disable-next-line react-hooks/purity -- intentional: chip shows time left as of render; a stale value is fine
  const msLeft = received + retentionDays * DAY_MS - Date.now();

  let label;
  let tone = "neutral";
  if (msLeft <= 0) {
    label = "expiring";
    tone = "danger";
  } else {
    const days = Math.floor(msLeft / DAY_MS);
    label = days >= 1 ? `expires in ${days}d` : `expires in ${Math.max(1, Math.floor(msLeft / 3600000))}h`;
    if (msLeft < 3 * DAY_MS) tone = "warning";
  }

  return (
    <Chip tone={tone} icon={Hourglass} className={className} title={`Emails are kept for ${retentionDays} days`}>
      {label}
    </Chip>
  );
};

export default ExpiryChip;
