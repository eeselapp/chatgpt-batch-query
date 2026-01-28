import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { processDigest } from "@/lib/digest-processor";

export async function POST(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const digest = await prisma.digest.findFirst({
      where: { userId: session.user.id },
    });

    if (!digest) {
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    if (digest.twitterUsernames.length === 0) {
      return NextResponse.json(
        { error: "No Twitter usernames configured" },
        { status: 400 }
      );
    }

    // Get user's Google access token
    const account = await prisma.account.findFirst({
      where: {
        userId: session.user.id,
        provider: "google",
      },
    });

    if (!account?.access_token) {
      return NextResponse.json(
        { error: "Google account not connected" },
        { status: 400 }
      );
    }

    // Process digest asynchronously
    processDigest(digest.id, account.access_token, account.refresh_token).catch(console.error);

    return NextResponse.json({ 
      success: true,
      message: "Digest is being processed"
    });
  } catch (error) {
    console.error("Error running digest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

