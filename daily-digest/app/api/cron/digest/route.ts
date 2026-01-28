import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { processDigest } from "@/lib/digest-processor";

export async function GET(req: Request) {
  try {
    // Verify cron secret for security
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const currentHour = new Date().getHours();

    // Find all active digests that should run at this hour
    const digests = await prisma.digest.findMany({
      where: {
        isActive: true,
        scheduleHour: currentHour,
      },
      include: {
        user: {
          include: {
            accounts: {
              where: {
                provider: "google",
              },
            },
          },
        },
      },
    });

    console.log(
      `Found ${digests.length} digests scheduled for hour ${currentHour}`
    );

    const results = [];

    for (const digest of digests) {
      const googleAccount = digest.user.accounts[0];

      if (!googleAccount?.access_token) {
        console.error(`No Google access token for digest ${digest.id}`);
        results.push({
          digestId: digest.id,
          status: "failed",
          error: "No Google access token",
        });
        continue;
      }

      // Process digest asynchronously
      processDigest(
        digest.id, 
        googleAccount.access_token, 
        googleAccount.refresh_token
      ).catch((error) => {
        console.error(`Error processing digest ${digest.id}:`, error);
      });

      results.push({
        digestId: digest.id,
        status: "processing",
      });
    }

    return NextResponse.json({
      success: true,
      processedCount: digests.length,
      results,
    });
  } catch (error: any) {
    console.error("Error in cron job:", error);
    return NextResponse.json(
      { error: "Internal server error", message: error.message },
      { status: 500 }
    );
  }
}

