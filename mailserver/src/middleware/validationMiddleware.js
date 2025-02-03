const e = require("express");
const { isEmail, isMongoId } = require("validator");

const validateEmailId = (req, res, next) => {
  const { emailId } = req.param;
  if (emailId) {
    if (!isEmail(emailId)) {
      return res.status(400).json({ message: "Invalid email ID format" });
    }
    req.params.emailId = emailId.toLowerCase();
  }
  next();
};

const validateMongoId = (req, res, next) => {
  const { email_id } = req.params;
  if (email_id) {
    if (!isMongoId(email_id)) {
      return res.status(400).json({ message: "Invalid email ID format" });
    }
  }
  next();
};

module.exports = { validateEmailId, validateMongoId };
