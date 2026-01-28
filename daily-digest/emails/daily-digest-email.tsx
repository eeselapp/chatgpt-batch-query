import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
  Hr,
} from "@react-email/components";
import * as React from "react";

interface DigestUpdate {
  text: string;
  url: string;
}

interface Launch {
  keyword: string;
  url: string;
}

interface ToolPrototype {
  summary: string;
  url: string;
}

interface ProductInspiration {
  insight: string;
  url: string;
}

interface MarketingIdea {
  idea: string;
  url: string;
}

interface DailyDigestEmailProps {
  totalScanned: number;
  totalSelected: number;
  generalUpdates: DigestUpdate[];
  launches: Launch[];
  tools: ToolPrototype[];
  productInspirations: ProductInspiration[];
  marketingIdeas: MarketingIdea[];
  date?: string;
}

export const DailyDigestEmail = ({
  totalScanned = 34,
  totalSelected = 18,
  generalUpdates = [],
  launches = [],
  tools = [],
  productInspirations = [],
  marketingIdeas = [],
  date = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  }),
}: DailyDigestEmailProps) => {
  return (
    <Html>
      <Head />
      <Preview>Your Daily AI Digest - {date}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Daily AI Digest</Heading>
            <Text style={dateText}>{date}</Text>
          </Section>

          {/* Transparency Line */}
          <Section style={transparencySection}>
            <Text style={transparencyText}>
              (Scanned {totalScanned} total posts → Selected {totalSelected} key
              updates)
            </Text>
          </Section>

          {/* General AI Industry Updates */}
          {generalUpdates.length > 0 && (
            <Section style={section}>
              <Heading style={h2}>General AI Industry Updates:</Heading>
              {generalUpdates.map((update, index) => (
                <div key={index} style={bulletItem}>
                  <Text style={bulletText}>
                    • {update.text}{" "}
                    <Link href={update.url} style={link}>
                      🔗 Link
                    </Link>
                  </Text>
                </div>
              ))}
            </Section>
          )}

          {/* Major Launches & Features */}
          {launches.length > 0 && (
            <Section style={section}>
              <Heading style={h2}>Major Launches &amp; Features:</Heading>
              <Text style={noteText}>
                Please note these major launches for potential blog content:
              </Text>
              {launches.map((launch, index) => (
                <div key={index} style={launchItem}>
                  <Text style={launchKeyword}>{launch.keyword}</Text>
                  <Link href={launch.url} style={link}>
                    🔗 Link
                  </Link>
                </div>
              ))}
            </Section>
          )}

          {/* Product & Marketing Insights */}
          {(tools.length > 0 ||
            productInspirations.length > 0 ||
            marketingIdeas.length > 0) && (
            <Section style={section}>
              <Heading style={h2}>Product &amp; Marketing Insights:</Heading>

              {/* Cool tools & prototype ideas */}
              {tools.length > 0 && (
                <>
                  <Heading style={h3}>Cool tools &amp; prototype ideas:</Heading>
                  {tools.map((tool, index) => (
                    <div key={index} style={bulletItem}>
                      <Text style={bulletText}>
                        • {tool.summary}{" "}
                        <Link href={tool.url} style={link}>
                          🔗 Link
                        </Link>
                      </Text>
                    </div>
                  ))}
                </>
              )}

              {/* Product inspiration */}
              {productInspirations.length > 0 && (
                <>
                  <Heading style={h3}>Product inspiration:</Heading>
                  {productInspirations.map((inspiration, index) => (
                    <div key={index} style={bulletItem}>
                      <Text style={bulletText}>
                        • {inspiration.insight}{" "}
                        <Link href={inspiration.url} style={link}>
                          🔗 Link
                        </Link>
                      </Text>
                    </div>
                  ))}
                </>
              )}

              {/* Marketing ideas */}
              {marketingIdeas.length > 0 && (
                <>
                  <Heading style={h3}>Marketing ideas:</Heading>
                  {marketingIdeas.map((idea, index) => (
                    <div key={index} style={bulletItem}>
                      <Text style={bulletText}>
                        • {idea.idea}{" "}
                        <Link href={idea.url} style={link}>
                          🔗 Link
                        </Link>
                      </Text>
                    </div>
                  ))}
                </>
              )}
            </Section>
          )}

          {/* Footer */}
          <Hr style={hr} />
          <Section style={footer}>
            <Text style={footerText}>
              This digest was automatically generated from your curated AI
              sources.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
};

export default DailyDigestEmail;

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Ubuntu, sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0",
  marginBottom: "64px",
  maxWidth: "600px",
};

const header = {
  padding: "32px 40px",
  backgroundColor: "#000000",
  textAlign: "center" as const,
};

const h1 = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "700",
  margin: "0 0 8px",
  lineHeight: "1.3",
};

const dateText = {
  color: "#999999",
  fontSize: "14px",
  margin: "0",
};

const transparencySection = {
  padding: "16px 40px",
  backgroundColor: "#f8f9fa",
  borderBottom: "1px solid #e5e7eb",
};

const transparencyText = {
  color: "#6b7280",
  fontSize: "13px",
  margin: "0",
  fontStyle: "italic" as const,
};

const section = {
  padding: "32px 40px",
};

const h2 = {
  color: "#111827",
  fontSize: "22px",
  fontWeight: "700",
  margin: "0 0 20px",
  lineHeight: "1.3",
};

const h3 = {
  color: "#374151",
  fontSize: "18px",
  fontWeight: "600",
  margin: "24px 0 12px",
  lineHeight: "1.3",
};

const bulletItem = {
  marginBottom: "16px",
};

const bulletText = {
  color: "#374151",
  fontSize: "15px",
  lineHeight: "1.6",
  margin: "0",
};

const launchItem = {
  marginBottom: "16px",
  paddingLeft: "0",
};

const launchKeyword = {
  color: "#111827",
  fontSize: "15px",
  fontWeight: "600",
  margin: "0 0 4px",
  lineHeight: "1.5",
};

const noteText = {
  color: "#6b7280",
  fontSize: "14px",
  margin: "0 0 20px",
  fontStyle: "italic" as const,
};

const link = {
  color: "#2563eb",
  textDecoration: "none",
  fontSize: "14px",
  fontWeight: "500",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  padding: "0 40px 32px",
  textAlign: "center" as const,
};

const footerText = {
  color: "#9ca3af",
  fontSize: "13px",
  lineHeight: "1.5",
  margin: "0",
};


