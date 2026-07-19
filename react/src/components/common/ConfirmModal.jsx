import Dialog from "../ui/Dialog";
import Button from "../ui/Button";

// Generic confirmation dialog.
const ConfirmModal = ({ open, setOpen, title, body, confirmText, cancelText, onConfirm, onCancel }) => {
  const destructive = /delete|clear/i.test(title || "");

  // Every dismissal path (Cancel button, backdrop, Escape, X) means "the user
  // cancelled" and must run the same cleanup.
  const handleCancel = () => {
    onCancel?.();
    setOpen(false);
  };

  return (
    <Dialog open={open} onClose={handleCancel} title={title} maxWidth="max-w-sm">
      <p className="text-sm leading-relaxed text-muted">{body}</p>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={handleCancel}>
          {cancelText}
        </Button>
        <Button variant={destructive ? "danger" : "primary"} onClick={onConfirm}>
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
};

export default ConfirmModal;
