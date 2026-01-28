import { google } from "googleapis";
import { render } from "@react-email/components";
import { DailyDigestEmail } from "../emails/daily-digest-email";

interface DigestData {
  generalUpdates: Array<{ text: string; url: string }>;
  launches: Array<{ keyword: string; url: string }>;
  tools: Array<{ summary: string; url: string }>;
  productInspirations: Array<{ insight: string; url: string }>;
  marketingIdeas: Array<{ idea: string; url: string }>;
}

export async function sendEmailViaGmail(
  accessToken: string,
  refreshToken: string | null,
  to: string,
  subject: string,
  digestData: DigestData,
  totalScanned: number,
  totalSelected: number
) {
  try {
    console.log(`\n📧 Sending email to ${to}...`);
    console.log(`   Subject: ${subject}`);
    console.log(`   Has access token: ${!!accessToken}`);
    console.log(`   Has refresh token: ${!!refreshToken}`);
    
    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
    );

    // Set credentials with both access and refresh tokens
    oauth2Client.setCredentials({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    // Use Gmail API directly instead of nodemailer
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

    // Render React Email to HTML
    const htmlContent = await render(
      DailyDigestEmail({
        totalScanned,
        totalSelected,
        generalUpdates: digestData.generalUpdates,
        launches: digestData.launches,
        tools: digestData.tools,
        productInspirations: digestData.productInspirations,
        marketingIdeas: digestData.marketingIdeas,
        date: new Date().toLocaleDateString("en-US", {
          weekday: "long",
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      })
    );

    // Create email in RFC 2822 format
    const email = [
      `From: ${to}`,
      `To: ${to}`,
      `Subject: ${subject}`,
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      htmlContent
    ].join('\n');

    // Encode email to base64url
    const encodedEmail = Buffer.from(email)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // Send email using Gmail API
    const result = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedEmail,
      },
    });

    console.log(`   ✅ Email sent successfully! Message ID: ${result.data.id}`);
    return { success: true, messageId: result.data.id };
  } catch (error: any) {
    console.error(`\n❌ Error sending email:`);
    console.error(`   Error: ${error.message}`);
    console.error(`   Code: ${error.code}`);
    
    if (error.code === 401 || error.code === 'EAUTH') {
      console.error(`   ⚠️  OAuth token issue:`);
      console.error(`      - Access token may be expired`);
      console.error(`      - Refresh token may be missing or invalid`);
      console.error(`      - User may need to re-authorize the app`);
      console.error(`   💡 Solution: Sign out and sign in again to re-authorize`);
    }
    
    throw error;
  }
}

