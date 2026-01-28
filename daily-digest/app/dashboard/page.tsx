import { auth } from "@/auth";
import { redirect } from "next/navigation";
import prisma from "@/lib/prisma";
import { DashboardContent } from "@/components/dashboard/dashboard-content";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  // Get or create user's digest
  let digest = await prisma.digest.findFirst({
    where: { userId: session.user.id },
    include: {
      logs: {
        orderBy: { executedAt: "desc" },
        take: 10,
      },
    },
  });

  // If no digest exists, create a default one
  if (!digest) {
    digest = await prisma.digest.create({
      data: {
        userId: session.user.id,
        name: "My Daily Digest",
        twitterUsernames: [],
        scheduleHour: 6,
        scheduleTimezone: "Asia/Jakarta",
        timeWindowHours: 24,
        recipientEmail: session.user.email || "",
        isActive: true,
      },
      include: {
        logs: true,
      },
    });
  }

  return <DashboardContent digest={digest} user={session.user} />;
}




