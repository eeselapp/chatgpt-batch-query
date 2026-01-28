import OpenAI from "openai";
import { traceable } from "langsmith/traceable";
import { wrapOpenAI } from "langsmith/wrappers";

let openai: ReturnType<typeof wrapOpenAI> | null = null;

function getOpenAI() {
  if (!openai) {
    openai = wrapOpenAI(new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    }));
  }
  return openai;
}

interface TweetData {
  author_name: string;
  text: string;
  url: string;
}

export const filterNoiseWithAI = traceable(
  async (
    tweets: TweetData[],
    metadata?: { digestId?: string; userId?: string; accounts?: string[] }
  ): Promise<TweetData[]> => {
  const prompt = `You are an expert AI news analyst.
Your job is to carefully read a batch of recent tweets from various AI accounts and **filter out the noise** — keeping only the posts that truly matter for a high-quality daily AI digest.

The data you'll receive is in JSON format, each item representing a tweet object.

---

🎯 Your goal
Return **only the valuable tweets** — the ones that would be worth including in an AI industry digest.
Be **exhaustive**: if a tweet plausibly fits the valuable criteria below, **keep it**. Do not impose any hard cap. If uncertain, **err on the side of inclusion**.

---

🧩 What counts as valuable (KEEP criteria)
Keep tweets that satisfy **at least one** of the following categories:

1) 🚀 Major Launches & News
   - **Tier 1 Launches:** Major AI model releases, significant startup launches
   - **Trending Features:** New capabilities in major tools
   - **Industry Shifts:** Pricing changes, major partnerships, or credible rumors/leaks

2) 🛠 Replicable Demos & Tools
   - **Hands-on Demos:** Someone showing *how* they built something cool or a new feature in action
   - **New Skills/Features:** Updates we can immediately try ourselves

3) 🎨 UX, Workflow & Product Patterns
   - **UX Inspiration:** Tweets showcasing interesting UI/UX interactions
   - **Workflow Insights:** Novel ways people are chaining agents or structuring AI workflows

4) 📈 Marketing Mechanics & Viral Insights
   - **Viral Formats:** Tweets that represent a unique *format* or *angle* that is getting high engagement
   - **Simplification Opportunities:** Complex topics that are important but need simplifying for a general audience

---

💤 What to ignore (NOISE criteria)
Filter out tweets that are:
- **Empty Hype:** Generic statements without specific examples or news
- **Pure "Engagement Bait":** Without substantial content
- **Personal/Life Updates:** Casual personal updates
- **Recruiting/Ads:** Job postings, webinar signups, or pure discount codes
- **Replies:** Random replies that add no context

**Deduping rule:** If multiple tweets cover the **same event** but each adds **distinct, substantive info**, **keep both**. If truly redundant, keep the most informative one.

---

🧱 Output format  
Read every single tweet object in the provided JSON array carefully.  
Evaluate *each one individually* against the filtering criteria.

Return a JSON array that contains all selected tweets in this format:
[
  {
    "author_name": "<author name>",
    "text": "<tweet text>",
    "url": "<tweet link>"
  },
  ...
]

No markdown, no comments — only the JSON array.

---

Input tweets:
${JSON.stringify(tweets, null, 2)}`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content || "[]";
    
    // Extract JSON from markdown code blocks if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }
    
    const filtered = JSON.parse(jsonContent);
    return Array.isArray(filtered) ? filtered : [];
  } catch (error) {
    console.error("Error filtering tweets with AI:", error);
    return tweets; // Return original if filtering fails
  }
  },
  {
    name: "filterNoiseWithAI",
    tags: ["llm", "filtering", "stage-1"],
    metadata: (
      tweets: TweetData[], 
      metadata?: { digestId?: string; userId?: string; accounts?: string[] }
    ) => ({
      input_tweets_count: tweets.length,
      digest_id: metadata?.digestId,
      user_id: metadata?.userId,
      twitter_accounts: metadata?.accounts?.join(", "),
    }),
  }
);

interface DigestData {
  generalUpdates: Array<{ text: string; url: string }>;
  launches: Array<{ keyword: string; url: string }>;
  tools: Array<{ summary: string; url: string }>;
  productInspirations: Array<{ insight: string; url: string }>;
  marketingIdeas: Array<{ idea: string; url: string }>;
}

export const formatDigestWithAI = traceable(
  async (
    filteredTweets: TweetData[],
    totalScanned: number,
    metadata?: { digestId?: string; userId?: string; accounts?: string[] }
  ): Promise<DigestData> => {
  const prompt = `You are an expert AI analyst and summarizer.

Your task: create a structured daily AI digest from the past 24 hours of updates.

The input is in JSON, containing posts with fields such as: text, url, author_name.

Your job is to transform this input into structured data that will be used in an email template.

=====================================================================
### FORMAT STRUCTURE

You must return a JSON object with the following structure:

{
  "generalUpdates": [
    {
      "text": "1-2 sentences summarizing the update",
      "url": "https://..."
    }
  ],
  "launches": [
    {
      "keyword": "Search-intent friendly keyword/phrase",
      "url": "https://..."
    }
  ],
  "tools": [
    {
      "summary": "1-2 sentences describing the tool or prototype",
      "url": "https://..."
    }
  ],
  "productInspirations": [
    {
      "insight": "1-2 sentences connecting the idea to product development",
      "url": "https://..."
    }
  ],
  "marketingIdeas": [
    {
      "idea": "1-2 sentences explaining why this is useful for content/positioning",
      "url": "https://..."
    }
  ]
}

=====================================================================
### CONTENT GUIDELINES

**General AI Industry Updates** (5-15 items):
- General interesting AI news, developments, or fun demos
- 1-2 sentences per item
- Must be substantial and newsworthy

**Major Launches & Features** (3-8 items if available):
- Strictly "Tier 1" Major Launches
- Include: Major updates (e.g., GPT-5, Claude 4, etc) or significant industry shifts
- Exclude: Small/niche launches
- Keywords must be search-intent friendly phrases like "GPT-5 pricing", "Claude 4 review"

**Cool Tools & Prototype Ideas** (1-3 items max):
- "Replicable Content" - new AI features or demos that can be immediately tried
- 1-2 sentences describing what it does

**Product Inspiration** (1-3 items max):
- "UX & Workflow Inspiration" - insights or UI patterns that could be adapted
- 1-2 sentences connecting to product development

**Marketing Ideas** (1-3 items max):
- "Traffic Drivers & Simplification" - viral formats, complex topics to simplify
- 1-2 sentences explaining the marketing value

=====================================================================
### GLOBAL RULES (STRICT)
- No emojis in the text
- No mention of "tweet", "post", "JSON", or "X"
- Do not reference the data source
- Tone must be: sharp, clean, confident, no fluff
- Never invent URLs outside the JSON data
- Each text/summary must be 1–2 sentences only
- Return ONLY valid JSON, no markdown code blocks, no explanation

=====================================================================
### DATA INPUT
Use the posts from:
${JSON.stringify(filteredTweets, null, 2)}

=====================================================================

Return only the JSON object, nothing else.`;

  try {
    const response = await getOpenAI().chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
    });

    const content = response.choices[0]?.message?.content || "{}";
    
    // Extract JSON from markdown code blocks if present
    let jsonContent = content.trim();
    if (jsonContent.startsWith("```")) {
      jsonContent = jsonContent.replace(/```json?\n?/g, "").replace(/```\n?$/g, "");
    }
    
    const digestData = JSON.parse(jsonContent);
    return digestData as DigestData;
  } catch (error) {
    console.error("Error formatting digest with AI:", error);
    throw error;
  }
  },
  {
    name: "formatDigestWithAI",
    tags: ["llm", "formatting", "stage-2"],
    metadata: (
      filteredTweets: TweetData[], 
      totalScanned: number, 
      metadata?: { digestId?: string; userId?: string; accounts?: string[] }
    ) => ({
      filtered_tweets_count: filteredTweets.length,
      total_scanned: totalScanned,
      digest_id: metadata?.digestId,
      user_id: metadata?.userId,
      twitter_accounts: metadata?.accounts?.join(", "),
    }),
  }
);


