import { Trash2 } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import IconButton from "../ui/IconButton";
import ExpiryChip from "./ExpiryChip";
import { formatRelativeTime, formatAbsoluteTime } from "../../utils/time";
import { cx } from "../../utils/cx";

// One email row in a list. Subtle mount animation with a capped stagger;
// unread emails get a gold left accent and a bolder subject.
const SingleEmailItem = ({
  email,
  handleEmailClick,
  handleOpenModal,
  setEmailToDelete,
  index = 0,
  staggerDuration = 0.04,
  showRecipient = false,
}) => {
  const reduceMotion = useReducedMotion();
  const unread = !email.readStatus;
  const recipient = showRecipient ? email.to?.value?.[0]?.address : null;

  return (
    <motion.article
      initial={reduceMotion ? false : { opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut", delay: reduceMotion ? 0 : Math.min(index, 10) * staggerDuration }}
      className="mb-2.5"
    >
      <div
        role="button"
        tabIndex={0}
        onClick={() => handleEmailClick(email)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleEmailClick(email);
          }
        }}
        className={cx(
          "glass group relative cursor-pointer overflow-hidden rounded-2xl p-4 shadow-card transition-all duration-150 focus-ring",
          "hover:-translate-y-0.5 hover:shadow-lift hover:border-hairline-strong"
        )}
      >
        {unread && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-[3px] bg-accent" />}

        <div className="flex items-start gap-2">
          <h3 className={cx("min-w-0 flex-1 break-words text-[15px] leading-snug text-ink", unread ? "font-semibold" : "font-normal")}>
            {unread && <span aria-label="unread" className="mb-0.5 mr-2 inline-block h-2 w-2 rounded-full bg-accent align-middle" />}
            {email.subject || "(no subject)"}
          </h3>
          <IconButton
            label="Delete email"
            size="sm"
            tone="danger"
            className="opacity-60 group-hover:opacity-100"
            onClick={(event) => {
              event.stopPropagation();
              setEmailToDelete(email);
              handleOpenModal();
            }}
          >
            <Trash2 />
          </IconButton>
        </div>

        <p className="mt-0.5 break-words text-[13px] text-muted">{email.from?.text || "Unknown sender"}</p>
        {recipient && <p className="mt-0.5 break-all text-[13px] text-faint">to {recipient}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <time dateTime={email.date || undefined} title={formatAbsoluteTime(email.date)} className="tabular-nums text-xs text-faint">
            {formatRelativeTime(email.date)}
          </time>
          <ExpiryChip date={email.date} />
        </div>
      </div>
    </motion.article>
  );
};

export default SingleEmailItem;
