const cron = require("node-cron");
const { getOldEmails, deleteEmailAndAttachments } = require("./emailService");

function setupCronJobs() {
  cron.schedule("0 2 * * *", async () => {
    console.log("Running a daily check for old emails and attachments...");
    const oldEmails = await getOldEmails(30); // Get emails older than 30 days
    console.log("oldEmails", oldEmails);
    for (const email of oldEmails) {
      await deleteEmailAndAttachments(email.emailID, email.emailId.toHexString()); // Delete each old email
    }
  });
}

module.exports = { setupCronJobs };
