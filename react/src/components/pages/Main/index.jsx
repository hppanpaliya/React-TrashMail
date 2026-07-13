import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { PenLine, Inbox, ShieldCheck, Zap, Clock } from "lucide-react";
import Button from "../../ui/Button";

const FEATURES = [
  { icon: ShieldCheck, title: "Private by default", text: "Keep your real address out of sign-up forms and spam lists." },
  { icon: Zap, title: "Instant delivery", text: "New mail streams in live — no refreshing, no waiting." },
  { icon: Clock, title: "Self-cleaning", text: "Disposable addresses that quietly expire when you're done." },
];

const Main = () => {
  const reduceMotion = useReducedMotion();
  const navigate = useNavigate();

  const rise = (delay = 0) => ({
    initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.35, ease: "easeOut", delay: reduceMotion ? 0 : delay },
  });

  return (
    <div className="pt-6 sm:pt-14">
      <motion.p {...rise(0)} className="text-sm font-medium uppercase tracking-[0.18em] text-accent">
        Disposable email, done right
      </motion.p>

      <motion.h1 {...rise(0.06)} className="mt-3 font-display text-5xl font-bold leading-[1.05] text-ink sm:text-6xl">
        Welcome
      </motion.h1>

      <motion.p {...rise(0.12)} className="mt-4 max-w-lg text-[15px] leading-relaxed text-muted">
        TrashMail is your go-to platform for temporary and disposable email addresses. Protect your privacy, dodge the spam, and keep your real inbox
        clean — hassle-free.
      </motion.p>

      <motion.div {...rise(0.18)} className="mt-8 flex flex-wrap gap-3">
        <Button variant="primary" size="lg" onClick={() => navigate("/generate")}>
          <PenLine aria-hidden="true" className="h-4.5 w-4.5" />
          Create an address
        </Button>
        <Button variant="outline" size="lg" onClick={() => navigate("/inbox")}>
          <Inbox aria-hidden="true" className="h-4.5 w-4.5" />
          Open inbox
        </Button>
      </motion.div>

      <div className="mt-12 grid gap-3 sm:grid-cols-3">
        {FEATURES.map((feature, index) => (
          <motion.div key={feature.title} {...rise(0.24 + index * 0.06)} className="glass rounded-2xl p-5">
            <feature.icon aria-hidden="true" className="h-5 w-5 text-accent" />
            <h2 className="mt-3 text-sm font-semibold text-ink">{feature.title}</h2>
            <p className="mt-1 text-[13px] leading-relaxed text-muted">{feature.text}</p>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Main;
