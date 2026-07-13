import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Dialog from "../ui/Dialog";
import Switch from "../ui/Switch";

// QR code for an email address, scannable on a phone.
// Optionally encodes the /watch/:emailId URL instead — handy for opening
// the ultra-compact watch view on a wearable or another device.
const QrCodeDialog = ({ open, onClose, value, title = "Scan email address" }) => {
  const [watchMode, setWatchMode] = useState(false);

  const isAddress = typeof value === "string" && value.includes("@");
  const encoded = watchMode && isAddress ? `${window.location.origin}/watch/${value}` : value || "";

  return (
    <Dialog open={open} onClose={onClose} title={watchMode ? "Scan to open watch view" : title} maxWidth="max-w-xs">
      <div className="flex flex-col items-center gap-4 pt-1">
        <div className="rounded-2xl bg-white p-3 leading-none shadow-card">
          <QRCodeSVG value={encoded} size={208} bgColor="#ffffff" fgColor="#000000" marginSize={1} />
        </div>
        <p className="max-w-full break-all text-center text-xs text-muted">{encoded}</p>
        {isAddress && (
          <Switch checked={watchMode} onChange={setWatchMode} label={<span className="text-[13px] text-muted">Encode watch view link</span>} />
        )}
      </div>
    </Dialog>
  );
};

export default QrCodeDialog;
