import { auth } from "@/auth";
import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(req: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    const digest = await prisma.digest.findFirst({
      where: { userId: session.user.id },
    });

    if (!digest) {
      return NextResponse.json({ error: "Digest not found" }, { status: 404 });
    }

    // OPTIMIZATION: Detect removed usernames and clean up cache
    const oldUsernames = digest.twitterUsernames.map(u => u.toLowerCase());
    const newUsernames = data.twitterUsernames.map((u: string) => u.toLowerCase());
    const removedUsernames = oldUsernames.filter((u: string) => !newUsernames.includes(u));
    
    if (removedUsernames.length > 0) {
      console.log(`\n🗑️  Cleaning up cache for removed usernames: ${removedUsernames.join(', ')}`);
      
      // Delete cache entries for removed usernames
      await prisma.twitterUserCache.deleteMany({
        where: {
          username: {
            in: removedUsernames
          }
        }
      });
      
      console.log(`   ✅ Cleaned up ${removedUsernames.length} cache entries`);
    }

    await prisma.digest.update({
      where: { id: digest.id },
      data: {
        name: data.name,
        twitterUsernames: data.twitterUsernames,
        scheduleHour: data.scheduleHour,
        timeWindowHours: data.timeWindowHours,
        recipientEmail: data.recipientEmail,
        isActive: data.isActive,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating digest:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

