const cron = require("node-cron");
const { getOldEmails, deleteEmailAndAttachments } = require("../controllers/emailController");
const config = require("../config");
const settingsService = require("./settingsService");

function setupCronJobs() {
  cron.schedule(
    "0 2 * * *",
    async () => {
      console.log("Running a daily check for old emails and attachments...");
      try {
        const oldEmails = (await getOldEmails(await settingsService.getEffectiveRetentionDays())) || [];
        let deleted = 0;
        let failed = 0;
        for (const email of oldEmails) {
          try {
            await deleteEmailAndAttachments(email.emailID, email.emailId.toHexString());
            deleted++;
          } catch (err) {
            // One bad item must not abort the rest of the batch.
            failed++;
            console.error(`Cleanup: failed to delete email ${email?.emailID}:`, err);
          }
        }
        console.log(`Cleanup complete: ${deleted} deleted, ${failed} failed, ${oldEmails.length} total.`);
      } catch (err) {
        console.error("Cleanup cron run failed:", err);
      }
    },
    { timezone: config.cronTimezone }
  );
}

module.exports = { setupCronJobs };
