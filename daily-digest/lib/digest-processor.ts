import prisma from "./prisma";
import { fetchTweetsByUsername, filterRecentTweets } from "./twitter-service";
import { filterNoiseWithAI, formatDigestWithAI } from "./llm-service";
import { sendEmailViaGmail } from "./gmail-service";

export async function processDigest(
  digestId: string, 
  accessToken: string, 
  refreshToken: string | null
) {
  const log = await prisma.digestLog.create({
    data: {
      digestId,
      status: "processing",
      totalScanned: 0,
      totalSelected: 0,
    },
  });

  try {
    const digest = await prisma.digest.findUnique({
      where: { id: digestId },
    });

    if (!digest) {
      throw new Error("Digest not found");
    }

    console.log(`\n📋 Processing digest for ${digest.twitterUsernames.length} accounts`);
    console.log(`   Accounts: ${digest.twitterUsernames.join(', ')}`);
    console.log(`   Time window: ${digest.timeWindowHours} hours`);

    // Step 1: Fetch tweets from all usernames (no rate limiting - paid tier)
    console.log(`\n🚀 Starting to fetch tweets...`);
    
    const allTweets: any[] = [];
    
    // Process all accounts
    for (let i = 0; i < digest.twitterUsernames.length; i++) {
      const username = digest.twitterUsernames[i];
      console.log(`\n   🐦 [${i + 1}/${digest.twitterUsernames.length}] Fetching tweets for @${username}...`);
      
      const tweets = await fetchTweetsByUsername(username);
      allTweets.push(tweets);
      console.log(`      @${username}: ${tweets.length} tweets`);
    }
    
    const allTweetsFlat = allTweets.flat();
    console.log(`\n✅ Fetched ${allTweetsFlat.length} total tweets from ${digest.twitterUsernames.length} accounts`);

    // Step 2: Filter tweets by time window (e.g., last 24 hours)
    const recentTweets = filterRecentTweets(allTweetsFlat, digest.timeWindowHours);
    console.log(`\n✅ Filtered to ${recentTweets.length} recent tweets`);

    if (recentTweets.length === 0) {
      await prisma.digestLog.update({
        where: { id: log.id },
        data: {
          status: "failed",
          errorMessage: "No recent tweets found",
          totalScanned: allTweetsFlat.length,
        },
      });
      return;
    }

    // Step 3: Transform to simplified format for LLM
    const tweetsForLLM = recentTweets.map((tweet) => ({
      author_name: tweet.author?.name || tweet.author?.username || "Unknown",
      text: tweet.text,
      url: tweet.url,
    }));

    // Step 4: Filter noise with AI (first LLM call)
    console.log("Filtering noise with AI...");
    const filteredTweets = await filterNoiseWithAI(tweetsForLLM, {
      digestId,
      userId: digest.userId,
      accounts: digest.twitterUsernames,
    });
    console.log(`AI filtered to ${filteredTweets.length} valuable tweets`);

    if (filteredTweets.length === 0) {
      await prisma.digestLog.update({
        where: { id: log.id },
        data: {
          status: "failed",
          errorMessage: "No valuable tweets after filtering",
          totalScanned: recentTweets.length,
          totalSelected: 0,
        },
      });
      return;
    }

    // Step 5: Format digest with AI (second LLM call)
    console.log("Formatting digest with AI...");
    const digestContent = await formatDigestWithAI(
      filteredTweets,
      recentTweets.length,
      {
        digestId,
        userId: digest.userId,
        accounts: digest.twitterUsernames,
      }
    );

    // Step 6: Send email via Gmail
    console.log("Sending email...");
    const emailSubject = `Daily AI Digest - ${new Date().toLocaleDateString()}`;
    await sendEmailViaGmail(
      accessToken,
      refreshToken,
      digest.recipientEmail,
      emailSubject,
      digestContent,
      recentTweets.length,
      filteredTweets.length
    );

    // Step 7: Update log with success
    await prisma.digestLog.update({
      where: { id: log.id },
      data: {
        status: "success",
        totalScanned: recentTweets.length,
        totalSelected: filteredTweets.length,
        digestContent: JSON.stringify(digestContent),
      },
    });

    console.log("Digest processed successfully!");
  } catch (error: any) {
    console.error("Error processing digest:", error);
    await prisma.digestLog.update({
      where: { id: log.id },
      data: {
        status: "failed",
        errorMessage: error.message,
      },
    });
  }
}

