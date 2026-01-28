import axios from "axios";
import fs from "fs";
import path from "path";
import prisma from "./prisma";

const TWITTER_API_KEY = process.env.TWITTER_API_KEY!;
const TWITTER_API_BASE_URL = process.env.TWITTER_API_BASE_URL!;

// Debug mode - will save responses to files
const DEBUG_MODE = false;
const DEBUG_DIR = path.join(process.cwd(), "debug-logs");

// Rate limiting removed - using paid tier
const RATE_LIMIT_DELAY = 0; // No delay for paid tier
let lastRequestTime = 0;

interface Tweet {
  text: string;
  createdAt: string;
  url: string;
  author: {
    name: string;
    username: string;
  };
  retweeted_tweet: any;
}

interface UserInfo {
  id: string;
  name: string;
  userName: string;
}

// Helper function to add delay between requests
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Helper function to ensure rate limit compliance
async function enforceRateLimit(): Promise<void> {
  // No rate limiting for paid tier
  lastRequestTime = Date.now();
}

// Helper function to save debug data to file
function saveDebugLog(filename: string, data: any): void {
  if (!DEBUG_MODE) return;
  
  try {
    // Create debug directory if it doesn't exist
    if (!fs.existsSync(DEBUG_DIR)) {
      fs.mkdirSync(DEBUG_DIR, { recursive: true });
    }
    
    const filepath = path.join(DEBUG_DIR, filename);
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    fs.writeFileSync(filepath, content);
    console.log(`   💾 Debug data saved to: ${filepath}`);
  } catch (error) {
    console.error(`   ❌ Failed to save debug log:`, error);
  }
}

/**
 * Convert Twitter username to userId with database caching
 * Uses the /twitter/user/info endpoint
 * 
 * OPTIMIZATION: Checks database cache first to avoid redundant API calls
 */
export async function getUserIdFromUsername(username: string): Promise<string | null> {
  try {
    // Normalize username (remove @ if present, convert to lowercase)
    const normalizedUsername = username.replace('@', '').toLowerCase();
    
    // Step 1: Check cache first
    console.log(`\n🔍 Looking up @${normalizedUsername}...`);
    const cached = await prisma.twitterUserCache.findUnique({
      where: { username: normalizedUsername }
    });
    
    if (cached) {
      console.log(`   ✅ Found in cache: @${normalizedUsername} → userId: ${cached.userId}`);
      console.log(`   📅 Cached since: ${cached.cachedAt.toISOString()}`);
      return cached.userId;
    }
    
    // Step 2: Not in cache, fetch from API (with rate limiting)
    console.log(`   ⚠️  Not in cache, fetching from Twitter API...`);
    
    // Enforce rate limit before making request
    await enforceRateLimit();
    
    const response = await axios.get(
      `${TWITTER_API_BASE_URL}/twitter/user/info`,
      {
        params: { userName: normalizedUsername },
        headers: {
          "x-api-key": TWITTER_API_KEY,
        },
      }
    );

    // Save debug data
    saveDebugLog(`user-info-${normalizedUsername}-${Date.now()}.json`, {
      username: normalizedUsername,
      request: {
        url: `${TWITTER_API_BASE_URL}/twitter/user/info`,
        params: { userName: normalizedUsername }
      },
      response: response.data,
      timestamp: new Date().toISOString()
    });

    if (response.data?.data?.id) {
      const userId = response.data.data.id;
      const displayName = response.data.data.name || normalizedUsername;
      
      console.log(`   ✅ @${normalizedUsername} → userId: ${userId}`);
      
      // Step 3: Save to cache for future use
      await prisma.twitterUserCache.upsert({
        where: { username: normalizedUsername },
        create: {
          username: normalizedUsername,
          userId: userId,
          displayName: displayName,
        },
        update: {
          userId: userId,
          displayName: displayName,
        }
      });
      
      console.log(`   💾 Saved to cache for future lookups`);
      
      return userId;
    }

    console.error(`   ⚠️  No userId found for @${normalizedUsername}`);
    return null;
  } catch (error: any) {
    console.error(`\n❌ Error getting userId for @${username}:`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Status Code: ${error.response?.status}`);
    
    // Save error to debug file
    const normalizedUsername = username.replace('@', '').toLowerCase();
    saveDebugLog(`user-info-ERROR-${normalizedUsername}-${Date.now()}.json`, {
      username: normalizedUsername,
      error: error.message,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      timestamp: new Date().toISOString()
    });
    
    return null;
  }
}

/**
 * Fetch tweets by userId (more reliable than username)
 */
export async function fetchTweetsByUserId(userId: string, username: string): Promise<Tweet[]> {
  try {
    console.log(`\n🔍 Fetching tweets for userId: ${userId} (@${username})...`);
    
    // Enforce rate limit before making request
    await enforceRateLimit();
    
    const response = await axios.get(
      `${TWITTER_API_BASE_URL}/twitter/user/last_tweets`,
      {
        params: { 
          userId,
          includeReplies: true // Include replies (default is false)
        },
        headers: {
          "x-api-key": TWITTER_API_KEY,
        },
      }
    );

    console.log(`   ✅ Response Status: ${response.status}`);
    
    // Save full response to debug file
    const debugData = {
      username,
      userId,
      request: {
        url: `${TWITTER_API_BASE_URL}/twitter/user/last_tweets`,
        params: { userId, includeReplies: true }
      },
      response: {
        status: response.status,
        data: response.data
      },
      analysis: {
        responseStatus: response.data?.status,
        hasDataField: !!response.data?.data,
        hasTweets: !!response.data?.data?.tweets,
        tweetsIsArray: Array.isArray(response.data?.data?.tweets),
        tweetsCount: response.data?.data?.tweets?.length || 0,
        hasNextPage: response.data?.data?.has_next_page,
        nextCursor: response.data?.data?.next_cursor,
        topLevelKeys: Object.keys(response.data || {}),
        dataLevelKeys: response.data?.data ? Object.keys(response.data.data) : [],
        firstTweet: response.data?.data?.tweets?.[0] ? {
          text: response.data.data.tweets[0].text?.substring(0, 200),
          createdAt: response.data.data.tweets[0].createdAt,
          author: response.data.data.tweets[0].author?.name,
          url: response.data.data.tweets[0].url,
          allKeys: Object.keys(response.data.data.tweets[0])
        } : null
      },
      timestamp: new Date().toISOString()
    };
    
    saveDebugLog(`tweets-${username}-${Date.now()}.json`, debugData);
    
    // Check response structure (simplified console log)
    console.log(`   📊 Response: ${response.data?.status}, Tweets: ${response.data?.data?.tweets?.length || 0}`);
    
    // Check if request was successful
    if (response.data?.status !== 'success') {
      console.error(`   ⚠️  API ERROR: ${response.data?.message || 'Unknown error'}`);
      return [];
    }
    
    // FIXED: Correct path is response.data.data.tweets (not response.data.tweets)
    const tweets = response.data?.data?.tweets || [];
    console.log(`   🐦 Retrieved ${tweets.length} tweets for @${username}`);
    
    if (tweets.length > 0) {
      console.log(`   📝 First tweet: "${tweets[0].text?.substring(0, 60)}..." (${tweets[0].createdAt})`);
    } else {
      console.log(`   ⚠️  No tweets returned - check debug file for details`);
    }

    return tweets;
  } catch (error: any) {
    console.error(`\n❌ Error fetching tweets for @${username}:`);
    console.error(`   Error Message: ${error.message}`);
    console.error(`   Status Code: ${error.response?.status}`);
    
    if (error.response?.status === 429) {
      console.error(`   ⚠️  RATE LIMIT ERROR: Too many requests.`);
      console.error(`   📝 Details: ${error.response?.data?.message || 'Too many requests'}`);
    }
    
    // Save error to debug file
    saveDebugLog(`tweets-ERROR-${username}-${Date.now()}.json`, {
      username,
      userId,
      error: error.message,
      statusCode: error.response?.status,
      responseData: error.response?.data,
      timestamp: new Date().toISOString()
    });
    
    return [];
  }
}

/**
 * Fetch tweets with automatic username → userId conversion
 * This is the main function to use
 */
export async function fetchTweetsByUsername(username: string): Promise<Tweet[]> {
  // Step 1: Convert username to userId
  const userId = await getUserIdFromUsername(username);
  
  if (!userId) {
    console.error(`   ❌ Cannot fetch tweets: userId not found for @${username}`);
    return [];
  }

  // Step 2: Fetch tweets by userId
  return await fetchTweetsByUserId(userId, username);
}

export function filterRecentTweets(
  tweets: Tweet[],
  hoursBack: number
): Tweet[] {
  const now = new Date();
  const cutoffTime = new Date(now.getTime() - hoursBack * 60 * 60 * 1000);

  console.log(`\n⏰ Filtering tweets from last ${hoursBack} hours`);
  console.log(`   Current time: ${now.toISOString()}`);
  console.log(`   Cutoff time: ${cutoffTime.toISOString()}`);
  console.log(`   Total tweets to filter: ${tweets.length}`);

  let recentCount = 0;
  let retweetCount = 0;
  let oldTweetCount = 0;

  const filtered = tweets.filter((tweet) => {
    try {
      // Parse Twitter's date format: "Mon Jan 01 12:00:00 +0000 2024"
      const tweetDate = new Date(tweet.createdAt);
      const isRecent = tweetDate >= cutoffTime;
      const isNotRetweet = !tweet.retweeted_tweet;

      if (!isRecent) oldTweetCount++;
      if (tweet.retweeted_tweet) retweetCount++;
      if (isRecent && isNotRetweet) recentCount++;

      return isRecent && isNotRetweet;
    } catch (error) {
      console.error("Error parsing tweet date:", tweet.createdAt);
      return false;
    }
  });

  console.log(`   📊 Filter results:`);
  console.log(`      ✅ Recent & original: ${recentCount}`);
  console.log(`      ⏳ Too old: ${oldTweetCount}`);
  console.log(`      🔄 Retweets: ${retweetCount}`);
  console.log(`      📝 Final count: ${filtered.length}`);

  return filtered;
}

