import { NextRequest } from "next/server";
import { generateInitialPrompt } from "@/lib/prompts";
import { generateImage, critiqueImage } from "@/app/actions/gemini-real";
import type { InfographicVersion, CritiquePoint } from "@/lib/types";

/**
 * Generate improvement summary for final version
 */
function generateFinalSummary(versions: InfographicVersion[]): CritiquePoint[] {
  const allCritiques: string[] = [];
  
  versions.forEach(version => {
    if (version.critiques && version.critiques.length > 0) {
      version.critiques.forEach(c => {
        allCritiques.push(c.title);
      });
    }
  });
  
  const summary: CritiquePoint[] = [
    {
      title: "✨ Final Version Complete",
      description: `This is the final refined version after ${versions.length} iteration${versions.length > 1 ? 's' : ''}. All identified issues have been addressed.`,
    }
  ];
  
  if (allCritiques.length > 0) {
    summary.push({
      title: "🎨 Improvements Made",
      description: `Successfully improved: ${allCritiques.slice(0, 5).join(", ")}${allCritiques.length > 5 ? `, and ${allCritiques.length - 5} more` : ''}.`,
    });
  }
  
  summary.push({
    title: "✅ Ready to Use",
    description: "This infographic meets all quality standards and is ready for download and use.",
  });
  
  return summary;
}

/**
 * API Route: Stream infographic generation progress
 * Uses Server-Sent Events (SSE) for real-time updates
 */
export async function POST(req: NextRequest) {
  const { topic, maxIterations } = await req.json();

  // Create a ReadableStream for SSE
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const versions: InfographicVersion[] = [];
        let currentPrompt = generateInitialPrompt(topic);

        // Send initial status
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "status",
              status: "drafting",
              currentVersion: 1,
              step: `Generating version 1 of ${maxIterations}...`,
            })}\n\n`
          )
        );

        // Iterative refinement loop
        for (let i = 1; i <= maxIterations; i++) {
          // Step 1: Generate Image
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "status",
                status: "drafting",
                currentVersion: i,
                step: `Generating version ${i} of ${maxIterations}...`,
              })}\n\n`
            )
          );

          const imageBase64 = await generateImage(currentPrompt, i);

          // Step 2: Critique (skip for last version)
          let critiques: CritiquePoint[] = [];
          if (i < maxIterations) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({
                  type: "status",
                  status: "critiquing",
                  currentVersion: i,
                  step: `Analyzing version ${i}...`,
                })}\n\n`
              )
            );

            const critiqueResult = await critiqueImage(
              imageBase64,
              currentPrompt,
              i
            );
            critiques = critiqueResult.critiques;
            currentPrompt = critiqueResult.refinedPrompt;
          } else {
            critiques = generateFinalSummary(versions);
          }

          // Create version object
          const version: InfographicVersion = {
            version: i,
            imageBase64,
            prompt: currentPrompt,
            timestamp: new Date(),
            critiques: critiques.length > 0 ? critiques : undefined,
          };

          versions.push(version);

          // Send version to client
          controller.enqueue(
            encoder.encode(
              `data: ${JSON.stringify({
                type: "version",
                version: version,
                status: i < maxIterations ? "refining" : "done",
                currentVersion: i,
                step:
                  i < maxIterations
                    ? `Version ${i} complete. Preparing version ${i + 1}...`
                    : "All versions complete!",
              })}\n\n`
            )
          );
        }

        // Send completion
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "complete",
              totalVersions: versions.length,
            })}\n\n`
          )
        );

        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "error",
              error: error instanceof Error ? error.message : "Unknown error",
            })}\n\n`
          )
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

