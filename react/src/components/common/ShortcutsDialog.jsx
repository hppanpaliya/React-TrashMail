import Dialog from "../ui/Dialog";

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || "");

const SHORTCUTS = [
  { keys: [isMac ? "⌘" : "Ctrl", "K"], label: "Open command palette" },
  { keys: ["/"], label: "Focus search" },
  { keys: ["C"], label: "Copy current address" },
  { keys: ["N"], label: "New random address" },
  { keys: ["D"], label: "Toggle dark mode" },
  { keys: ["?"], label: "Show this dialog" },
];

const Key = ({ children }) => (
  <kbd className="inline-flex min-w-6 items-center justify-center rounded-md border border-hairline bg-raised px-1.5 py-0.5 font-mono text-[11px] text-muted">
    {children}
  </kbd>
);

// Reference card for the global keyboard shortcuts (single keys only fire
// outside of text inputs).
const ShortcutsDialog = ({ open, onClose }) => (
  <Dialog open={open} onClose={onClose} title="Keyboard shortcuts" maxWidth="max-w-sm">
    <ul className="flex flex-col gap-1 pt-1">
      {SHORTCUTS.map(({ keys, label }) => (
        <li key={label} className="flex items-center justify-between gap-4 rounded-lg px-1 py-1.5 text-sm text-muted">
          {label}
          <span className="flex items-center gap-1">
            {keys.map((key) => (
              <Key key={key}>{key}</Key>
            ))}
          </span>
        </li>
      ))}
    </ul>
    <p className="mt-3 text-xs text-faint">Single-key shortcuts pause while you are typing in a field.</p>
  </Dialog>
);

export default ShortcutsDialog;
