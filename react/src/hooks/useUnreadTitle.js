import { useEffect } from "react";

const BASE_TITLE = "TrashMail";

// Reflect an unread count in the document title while mounted,
// restoring the base title on unmount.
const useUnreadTitle = (unreadCount) => {
  useEffect(() => {
    document.title = unreadCount > 0 ? `(${unreadCount}) ${BASE_TITLE}` : BASE_TITLE;
    return () => {
      document.title = BASE_TITLE;
    };
  }, [unreadCount]);
};

export default useUnreadTitle;
