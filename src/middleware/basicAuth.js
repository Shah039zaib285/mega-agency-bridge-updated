import config from "../config.js";

export default function basicAuth(req, res, next) {
  const pw = config.qrPassword;
  if (!pw) return res.status(403).send("QR access not configured");
  const h = req.headers.authorization;
  if (!h) {
    res.setHeader("WWW-Authenticate", 'Basic realm="QR"');
    return res.status(401).send("Authentication required");
  }
  const parts = h.split(" ");
  if (parts[0] !== "Basic" || !parts[1]) {
    res.setHeader("WWW-Authenticate", 'Basic realm="QR"');
    return res.status(401).send("Invalid auth header");
  }
  const creds = Buffer.from(parts[1], "base64").toString();
  const idx = creds.indexOf(":");
  const pass = idx >= 0 ? creds.slice(idx + 1) : creds;
  if (pass !== pw) {
    res.setHeader("WWW-Authenticate", 'Basic realm="QR"');
    return res.status(401).send("Invalid credentials");
  }
  next();
}
