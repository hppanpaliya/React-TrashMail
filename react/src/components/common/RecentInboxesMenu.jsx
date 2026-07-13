import { History, Inbox } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Menu from "../ui/Menu";
import IconButton from "../ui/IconButton";
import { getRecentInboxes } from "../../utils/recentInboxes";

// Quick-switch menu between recently visited inbox addresses.
const RecentInboxesMenu = ({ current }) => {
  const navigate = useNavigate();

  const recents = getRecentInboxes().filter((address) => address !== current);
  if (recents.length === 0) return null;

  return (
    <Menu
      trigger={
        <IconButton label="Switch inbox" size="sm">
          <History />
        </IconButton>
      }
      items={recents.map((address) => ({
        key: address,
        label: address,
        icon: Inbox,
        onSelect: () => navigate(`/inbox/${address}`),
      }))}
    />
  );
};

export default RecentInboxesMenu;
