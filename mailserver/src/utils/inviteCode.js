const crypto = require("crypto");

function generateInviteCode() {
  const token = crypto.randomBytes(6).toString("hex").toUpperCase();
  return `WELCOME-TRASHMAIL-${token}`;
}

module.exports = {
  generateInviteCode,
};
