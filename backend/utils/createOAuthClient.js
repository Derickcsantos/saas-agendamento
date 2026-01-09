import { google } from "googleapis";

export default function createOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET || process.env.GOOGLE_SECRET_KEY,
    process.env.GOOGLE_REDIRECT_URI
  );
}
