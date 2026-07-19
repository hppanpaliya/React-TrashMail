import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { QrCode, Copy, Shuffle, Inbox, History } from "lucide-react";
import { env } from "../../../env";
import QrCodeDialog from "../../common/QrCodeDialog";
import Input from "../../ui/Input";
import Select from "../../ui/Select";
import Button from "../../ui/Button";
import IconButton from "../../ui/IconButton";
import Chip from "../../ui/Chip";
import { useSnackbar } from "../../../context/SnackbarContext";
import { useConfig } from "../../../context/ConfigContext";
import { parseDomains } from "../../../utils/domains";
import { randomUsername } from "../../../utils/random";
import { copyText } from "../../../utils/clipboard";
import { getRecentInboxes } from "../../../utils/recentInboxes";

const Generate = () => {
  const navigate = useNavigate();
  const showSnackbar = useSnackbar();
  const reduceMotion = useReducedMotion();
  const { domains: configDomains } = useConfig();
  const [openQrDialog, setOpenQrDialog] = useState(false);
  const [recentInboxes] = useState(getRecentInboxes);

  // Server config is the source of truth for domains; env is the fallback.
  const domains = useMemo(() => configDomains || parseDomains(env.REACT_APP_DOMAINS) || [], [configDomains]);
  const hasDomains = domains.length > 0;

  const getInitialState = () => {
    const lastEmail = window.localStorage.getItem("lastEmailId");
    if (lastEmail && lastEmail.includes("@")) {
      const parts = lastEmail.split("@");
      const domain = parts.pop();
      const user = parts.join("@");
      if (domains.includes(domain)) {
        return { user, domain };
      }
    }
    return { user: "", domain: domains[0] ?? "" };
  };

  const [emailDetails, setEmailDetails] = useState(getInitialState);

  // Reconcile the selected domain when the config list arrives after mount, so
  // state (not just the rendered value) stays valid. Never overwrites a valid
  // manual selection.
  useEffect(() => {
    setEmailDetails((prev) => (prev.domain && domains.includes(prev.domain) ? prev : { ...prev, domain: domains[0] ?? "" }));
  }, [domains]);

  // If the config arrives after mount and the chosen domain isn't valid, snap to the first one.
  const domain = domains.includes(emailDetails.domain) ? emailDetails.domain : (domains[0] ?? "");
  const fullEmail = hasDomains ? `${emailDetails.user}@${domain}` : "";

  const requireReady = () => {
    if (!hasDomains) {
      showSnackbar("No mail domains are configured", "error");
      return false;
    }
    if (!emailDetails.user) {
      showSnackbar("Please enter a username", "warning");
      return false;
    }
    return true;
  };

  const copyToClipboard = async () => {
    if (!requireReady()) return;
    const ok = await copyText(fullEmail);
    showSnackbar(ok ? "Copied!" : "Could not copy address", ok ? "success" : "error");
  };

  const handleUserChange = (event) => {
    // Prevent entering '@' in the username field
    const sanitizedUser = event.target.value.replace(/@/g, "");
    setEmailDetails((prev) => ({ ...prev, user: sanitizedUser }));
  };

  const generateRandomEmail = () => {
    if (!hasDomains) {
      showSnackbar("No mail domains are configured", "error");
      return;
    }
    const user = randomUsername(10);
    const chosenDomain = domains[Math.floor(Math.random() * domains.length)];
    setEmailDetails({ user, domain: chosenDomain });
  };

  const handleInboxRedirect = () => {
    if (!requireReady()) return;
    navigate("/inbox/" + fullEmail);
  };

  const handleShowQr = () => {
    if (!requireReady()) return;
    setOpenQrDialog(true);
  };

  const rise = (delay = 0) => ({
    initial: reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.3, ease: "easeOut", delay: reduceMotion ? 0 : delay },
  });

  return (
    <div className="pt-4 sm:pt-10">
      <motion.div {...rise(0)}>
        <h1 className="font-display text-3xl font-bold text-ink sm:text-4xl">Create an address</h1>
        <p className="mt-2 text-sm text-muted">Pick a username — or roll a random one — and start receiving mail instantly.</p>
      </motion.div>

      <motion.div {...rise(0.08)} className="glass mt-6 rounded-3xl p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Input
            aria-label="Username"
            placeholder="username"
            value={emailDetails.user}
            onChange={handleUserChange}
            onKeyDown={(event) => {
              if (event.key === "Enter") handleInboxRedirect();
            }}
            className="flex-1"
            inputClassName="h-12 text-base"
          />
          <span aria-hidden="true" className="hidden text-lg font-semibold text-faint sm:block">
            @
          </span>
          <Select
            aria-label="Domain"
            value={domain}
            onChange={(event) => setEmailDetails((prev) => ({ ...prev, domain: event.target.value }))}
            options={domains.map((d) => ({ value: d, label: `@${d}` }))}
            className="sm:w-56"
            selectClassName="h-12 text-base"
          />
          <IconButton label="Show QR code" onClick={handleShowQr} className="hidden border border-hairline sm:inline-flex h-12 w-12">
            <QrCode />
          </IconButton>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button variant="primary" size="lg" onClick={handleInboxRedirect} className="flex-1">
            <Inbox aria-hidden="true" className="h-4.5 w-4.5" />
            Open inbox
          </Button>
          <div className="flex flex-1 gap-2">
            <Button variant="outline" size="lg" onClick={generateRandomEmail} className="flex-1">
              <Shuffle aria-hidden="true" className="h-4.5 w-4.5" />
              Random
            </Button>
            <Button variant="outline" size="lg" onClick={copyToClipboard} className="flex-1">
              <Copy aria-hidden="true" className="h-4.5 w-4.5" />
              Copy
            </Button>
          </div>
          <Button variant="outline" size="lg" onClick={handleShowQr} className="sm:hidden">
            <QrCode aria-hidden="true" className="h-4.5 w-4.5" />
            QR code
          </Button>
        </div>
      </motion.div>

      {recentInboxes.length > 0 && (
        <motion.div {...rise(0.16)} className="mt-8">
          <h2 className="flex items-center gap-1.5 text-[13px] font-medium text-muted">
            <History aria-hidden="true" className="h-4 w-4" />
            Recent inboxes
          </h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {recentInboxes.map((address) => (
              <Chip key={address} onClick={() => navigate(`/inbox/${address}`)} title={`Open ${address}`}>
                {address}
              </Chip>
            ))}
          </div>
        </motion.div>
      )}

      <QrCodeDialog open={openQrDialog} onClose={() => setOpenQrDialog(false)} value={fullEmail} />
    </div>
  );
};

export default Generate;
