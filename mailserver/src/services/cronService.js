const cron = require("node-cron");
const { getOldEmails, deleteEmailAndAttachments } = require("../controllers/emailController");
const config = require("../config");

function setupCronJobs() {
  cron.schedule("0 2 * * *", async () => {
    console.log("Running a daily check for old emails and attachments...");
    const oldEmails = await getOldEmails(config.emailRetentionDays); // Get emails older than 30 days
    for (const email of oldEmails) {
      await deleteEmailAndAttachments(email.emailID, email.emailId.toHexString()); // Delete each old email
    }
  });
}

module.exports = { setupCronJobs };
