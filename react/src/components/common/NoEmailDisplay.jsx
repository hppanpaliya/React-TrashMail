import { MailboxIcon, SearchX } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import EmailListSkeleton from "./EmailListSkeleton";

// Empty / loading state for an email list. Shows skeleton cards while
// loading, and a live "waiting for emails" state (SSE keeps the inbox
// up to date) once the list is confirmed empty.
const NoEmailDisplay = ({ loading, waiting = true }) => {
  const reduceMotion = useReducedMotion();

  if (loading) return <EmailListSkeleton />;

  const Icon = waiting ? MailboxIcon : SearchX;

  return (
    <div className="glass mt-6 rounded-2xl p-10 text-center">
      <motion.div
        animate={reduceMotion || !waiting ? { opacity: 0.7 } : { opacity: [0.35, 0.9, 0.35] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        className="inline-flex"
      >
        <Icon aria-hidden="true" className="h-12 w-12 text-faint" strokeWidth={1.5} />
      </motion.div>
      <h3 className="mt-3 text-base font-semibold text-ink">{waiting ? "Your inbox is empty" : "No emails found"}</h3>
      <p className="mt-1 text-sm text-muted">
        {waiting ? "Waiting for emails… new mail shows up here instantly." : "Try adjusting your search or filters."}
      </p>
    </div>
  );
};

export default NoEmailDisplay;
