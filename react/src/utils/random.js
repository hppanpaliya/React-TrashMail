const CHARSET = "abcdefghijklmnopqrstuvwxyz0123456789";

// Cryptographically-random lowercase alphanumeric username of fixed length.
export const randomUsername = (length = 10) => {
  const values = new Uint32Array(length);
  window.crypto.getRandomValues(values);
  let result = "";
  for (let i = 0; i < length; i++) {
    result += CHARSET[values[i] % CHARSET.length];
  }
  return result;
};
