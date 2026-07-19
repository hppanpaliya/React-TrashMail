const { getDB } = require("../db");
const config = require("../config");

// Global runtime settings stored as a single document. Values set here
// override the env-derived defaults in config (currently just retention).
const SETTINGS_ID = "global";

const getSettingsDoc = async () => {
  const db = getDB();
  return db.collection("settings").findOne({ _id: SETTINGS_ID });
};

// Retention resolved from DB when set, else the env default.
const getEffectiveRetentionDays = async () => {
  try {
    const doc = await getSettingsDoc();
    const days = doc?.emailRetentionDays;
    if (Number.isInteger(days) && days > 0) return days;
  } catch (err) {
    console.error("Failed to read settings, falling back to env retention:", err);
  }
  return config.emailRetentionDays;
};

const getRetentionSetting = async () => {
  const doc = await getSettingsDoc();
  const days = doc?.emailRetentionDays;
  if (Number.isInteger(days) && days > 0) {
    return { emailRetentionDays: days, source: "db" };
  }
  return { emailRetentionDays: config.emailRetentionDays, source: "env-default" };
};

const setRetentionDays = async (days, userId) => {
  const db = getDB();
  await db.collection("settings").updateOne(
    { _id: SETTINGS_ID },
    { $set: { emailRetentionDays: days, updatedAt: new Date(), updatedBy: userId } },
    { upsert: true }
  );
};

module.exports = { getEffectiveRetentionDays, getRetentionSetting, setRetentionDays };
