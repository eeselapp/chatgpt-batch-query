"use server";

import { genAI, MODELS } from "@/lib/gemini-client";
import type { CritiquePoint } from "@/lib/types";

/**
 * Generate infographic image using Gemini 3 Pro Image Preview
 * @param prompt - The prompt for image generation
 * @param version - Version number (for logging)
 * @returns Base64 encoded image string
 */
export async function generateImage(
  prompt: string,
  version: number
): Promise<string> {
  try {
    console.log(`[V${version}] Generating image with Gemini...`);
    
    const response = await genAI.models.generateContent({
      model: MODELS.IMAGE_GEN,
      contents: prompt,
      config: {
        responseModalities: ['IMAGE'],
        imageConfig: {
          aspectRatio: '1:1', // Square format for infographics
          imageSize: '2K', // High resolution
        },
      },
    });

    // Extract image from response
    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("No image generated in response");
    }

    const candidate = response.candidates[0];
    if (!candidate.content || !candidate.content.parts) {
      throw new Error("No content parts in response");
    }

    const parts = candidate.content.parts;
    const imagePart = parts.find(part => part.inlineData);

    if (!imagePart || !imagePart.inlineData || !imagePart.inlineData.data) {
      throw new Error("No image data found in response");
    }

    // The image data is already base64 encoded
    const base64Image = imagePart.inlineData.data;

    console.log(`[V${version}] Image generated successfully`);
    return base64Image;

  } catch (error) {
    console.error(`[V${version}] Image generation error:`, error);
    throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

/**
 * Critique infographic using Gemini 3 Pro Vision
 * @param imageBase64 - Base64 encoded image
 * @param originalPrompt - Original prompt used to generate the image
 * @param version - Version number (for logging)
 * @returns Critique points and refined prompt
 */
export async function critiqueImage(
  imageBase64: string,
  originalPrompt: string,
  version: number
): Promise<{ critiques: CritiquePoint[]; refinedPrompt: string }> {
  try {
    console.log(`[V${version}] Analyzing image with Vision AI...`);

    // Create the comprehensive critique prompt (based on professional AI Art Director methodology)
    const critiquePrompt = `You are an expert Information Designer and AI Art Director specializing in the systematic refinement of educational infographics and content marketing visuals. Your methodology combines visual critique, prompt engineering, design philosophy, and iterative styling to transform generic AI images into museum-quality, distinctive, and professionally crafted infographics suitable for both educational purposes and professional blog/web company contexts.

**Original prompt used:** "${originalPrompt}"

# Design Thinking Foundation

Before beginning the iterative process, understand the context and commit to a BOLD aesthetic direction:

## Context Analysis
* **Purpose**: What problem does this infographic solve? Who is the audience?
  - Educational/Tutorial: Teaching a concept, process, or system
  - Comparison/Versus: Side-by-side feature breakdown (e.g., "Intercom vs Freshdesk")
  - Feature Showcase: Highlighting product capabilities or specifications
  - Data Visualization: Statistics, survey results, trend analysis
  - Process/Timeline: Step-by-step workflows, historical timelines
  - Blog Content Marketing: Supporting articles with visual content
  
* **Tone & Aesthetic**: Pick an extreme and commit fully:
  - Brutally Minimal: Swiss precision, mathematical grids, monochrome + one accent
  - Editorial Refined: Magazine-quality, sophisticated typography, muted palette
  - Tech Modern: Clean vectors, geometric shapes, bold sans-serif, high contrast
  - Organic Natural: Hand-drawn elements, botanical motifs, earth tones
  - Brutalist Raw: Exposed structure, bold geometry, unexpected color blocks
  - Data Dashboard: Grid-based, chart-forward, systematic color coding
  - Premium Luxury: Elegant serifs, gold accents, generous spacing, quality materials
  - Playful Contemporary: Rounded forms, bright accents, friendly iconography

* **Differentiation**: What makes this UNFORGETTABLE?
  - The one visual element someone will remember 3 days later
  - The distinctive choice that sets this apart from generic infographics
  - The bold decision that demonstrates intentional design thinking

**CRITICAL**: Choose a clear conceptual direction and execute it with precision. Bold maximalism and refined minimalism both work - the key is **intentionality, not intensity**. A perfectly executed minimal design is superior to unfocused complexity.

---

# Visual Philosophy Foundation

Every infographic must be guided by a VISUAL PHILOSOPHY that creates a cohesive aesthetic identity beyond generic AI outputs.

## Creating the Visual Philosophy

**Name the Movement** (1-2 words): Choose or create a design movement that fits the topic and audience (e.g., "Swiss Precision," "Organic Systems," "Geometric Silence," "Chromatic Language," "Analog Meditation," "Data Modernism," "Editorial Clarity").

**Define the Aesthetic** (2-3 sentences): Articulate how this philosophy manifests through:
- Space, form, and composition
- Color palette and material feel
- Scale, rhythm, and visual hierarchy
- Balance between visual elements and minimal text

**Commitment to Craftsmanship**: Every iteration must appear METICULOUSLY CRAFTED, as if it took countless hours by someone at the absolute top of their field. This is non-negotiable for both educational and professional blog contexts.

### Philosophy Guidelines:
* **Visual-First**: Information lives in design, not paragraphs. Prioritize 85% visual, 15% text for educational; 75% visual, 25% text for comparison/feature infographics (needs more labels).
* **Sophistication**: Avoid cartoony or amateur aesthetics. Even playful topics deserve elegant execution.
* **Context-Appropriate**: Blog infographics need web-friendly layouts (horizontal for wide posts, vertical for narrow columns), comparison charts need clear side-by-side structure.
* **Texture & Materiality**: Consider grain, paper texture, canvas effects to reduce "digital shine."
* **Distinctive Palette**: Use specific color moods with hex codes. For comparison infographics, use color to differentiate options clearly.

---

# Design Principles to Apply

When analyzing the infographic, look for opportunities in these areas:

### 1. Information Architecture & Flow

**For Educational/Tutorial Infographics:**
* **Narrative Arc**: Does the eye travel logically? (Usually Top-Left to Bottom-Right, or Center-Out)
* **Grouping**: Are related facts grouped together visually (using boxes, background shapes, or proximity)?
* **Clarity**: Is the distinction between "Main Concept" and "Supporting Details" obvious?
* **Spatial Breathing**: Is there sufficient negative space? (40%+ is ideal for sophisticated look)

**For Comparison/Blog Infographics:**
* **Side-by-Side Structure**: Is the comparison immediately clear? (Left vs Right, or Top vs Bottom)
* **Symmetry**: Are both options given equal visual weight and space?
* **Differentiation**: Is it obvious which features belong to which option? (Use color coding, icons, position)
* **Scanability**: Can readers quickly grasp key differences at a glance?
* **Web-Ready Layout**: Is the aspect ratio appropriate for blog embedding? (16:9 horizontal, 1:1 square, or 2:3 vertical)

### 2. Typography & Legibility (Critical)

* **Hierarchy**: The Title must be the largest element. Subheadings must be distinct. For comparisons, product/option names must be equally prominent.
* **Contrast**: Text must have high contrast against the background (no white text on light yellow).
* **Readability**: Ensure the prompt explicitly requests "Legible text," "Bold labels," or "Clear typography."
* **Spelling**: If the previous image had typos, the new prompt must explicitly spell out the critical keywords in quotes.
* **Text as Visual Element**: Typography should integrate into the design, not float above it. Text is an accent, not the main event.
* **Minimalism**: Use text sparingly. Every word must earn its place. Prefer large, impactful labels over many small ones.
* **Font Choices**: **AVOID GENERIC FONTS**. Do not use Arial, Inter, Roboto, or system fonts. Choose distinctive, beautiful, characterful fonts:
  - Display fonts: Consider elegant serifs, geometric sans, condensed headers, art deco faces
  - Body/Label fonts: Refined sans-serif with personality, or clean modern serifs
  - Pairing: Combine a distinctive display font with a refined body font
  - Examples: "Playfair Display + DM Sans," "Bebas Neue + Open Sans," "Archivo Black + Work Sans"

### 3. Visual Style & Craftsmanship

* **Master-Level Execution**: Every element must look painstakingly crafted. Check alignment, spacing, balance obsessively.
* **Avoid "AI Slop"**: Move away from shiny 3D renders, excessive purple/neon lighting, or generic "tech" vibes.
* **NEVER Converge on Common Choices**: Avoid Space Grotesk, overused purple gradients on white backgrounds, predictable layouts, cookie-cutter design. Every infographic should feel genuinely designed for its specific context.
* **Distinct Styles**: Push for specific art directions aligned with your visual philosophy:
    * *Swiss International*: Grid-based, sans-serif, high contrast, mathematical precision
    * *Hand-Drawn/Sketch*: Pencil textures, uneven lines (human feel), organic warmth
    * *Flat Vector*: Clean shapes, limited color palette (like Kurzgesagt), geometric clarity
    * *Isometric*: 3D technical view but with clean lines and architectural precision
    * *Editorial*: Paper texture, muted colors, serif fonts (like NYT or Monocle), sophisticated restraint
    * *Brutalist Joy*: Bold geometry, monumental forms, unexpected color pops
    * *Organic Systems*: Rounded forms, natural clustering, botanical inspiration
    * *Data Modernism*: Dashboard aesthetic, grid structure, systematic color coding
    * *Tech Comparison*: Clean split-screen, icon-forward, brand color integration

### 4. Visual Communication

* **Show, Don't Tell**: Use diagrams, spatial relationships, iconography to communicate ideas.
* **Accuracy Simulation**: Ensure charts (pie, bar) look plausible, even if data is simulated.
* **Iconography**: Use consistent icon styles (don't mix photo-realistic icons with stick figures). For comparison infographics, use icons to quickly differentiate features.
* **Visual Weight**: Use size, color, and position to guide attention, not text instructions.
* **Comparison Clarity**: For versus/comparison infographics, use visual coding:
  - Color: Assign each option a distinct color (e.g., blue vs green)
  - Position: Left vs Right, or Top vs Bottom
  - Icons: Unique iconography for each option
  - Checkmarks/X: Clear indicators for feature presence/absence

### 5. Material Quality

* **Texture**: Add grain, paper texture, ink bleeds, or canvas effects to achieve human-crafted feel.
* **Color Depth**: Avoid flat digital colors. Use subtle gradients, natural color variation, or analog color theory.
* **Composition**: Don't just center everything. Try asymmetric layouts, timeline spirals, split-screen comparisons, modular grids, golden ratio divisions.
* **Backgrounds**: Create atmosphere and depth rather than defaulting to solid colors. Use gradient meshes, noise textures, geometric patterns, layered transparencies, subtle shadows.

---

# Output Format

Respond in JSON format with this structure:

{
  "critiques": [
    {
      "title": "Specific Issue Title",
      "description": "Detailed description of the flaw and actionable recommendation"
    }
  ],
  "refinedPrompt": "COMPLETE standalone prompt for next iteration"
}

---

# Refined Prompt Guidelines

Your "refinedPrompt" must:
- **Be Complete**: Don't reference previous context. Write full prompt from scratch.
- **Be Specific**: Use concrete details with hex codes and font names
- **Address Flaws**: Directly fix all identified issues
- **Add Visual Philosophy**: Include the design movement/aesthetic
- **Specify Distinctive Typography**: NEVER use Arial, Inter, Roboto, Space Grotesk. Use distinctive font pairings like "Playfair Display + DM Sans"
- **Guide Text**: If text was small, request "Giant, poster-sized typography with generous letter-spacing"
- **Reduce Noise**: If cluttered, add "Minimalist", "High negative space (40%+)", "Only 3-5 text elements maximum"
- **Add Texture**: Request "Subtle paper grain" or "Canvas texture" to reduce digital shine
- **Specify Composition**: "Asymmetric layout" or "Golden ratio grid" instead of generic center-aligned
- **Include Craftsmanship Language**: Add phrases like "meticulously crafted," "museum-quality," "master-level execution"
- **Context-Appropriate**: For blog context, specify aspect ratio (16:9, 1:1, 2:3)

---

# Anti-Generic Design Principles

**AVOID These AI Clichés:**
* Generic fonts: Arial, Inter, Roboto, Space Grotesk (overused), Montserrat (cliché)
* Purple gradients on white backgrounds (#6366F1 → #EC4899)
* Shiny 3D renders with excessive reflections
* Corporate Memphis (flat, rounded, pastel people illustrations)
* Generic "Future Tech" blue/purple aesthetics with lens flares
* Cookie-cutter comparison templates with no visual interest
* Overly complex gradients that make text hard to read
* "Magical sparkles" or unnecessary decorative swirls
* Stock photo collage aesthetics
* Predictable icon sets
* Misspelled labels (combat with explicit text specifications)

**MAKE Distinctive Choices:**
* **Typography**: Use beautiful, characterful fonts (Playfair Display, Crimson Text, Bebas Neue, Archivo Black)
* **Palette**: Specify hex codes and cultural references ("Wes Anderson palette", "Japanese woodblock print colors")
* **Texture**: Request grain, paper texture, canvas effects, risograph printing simulation
* **Composition**: Asymmetric layouts, golden ratio grids, unexpected divisions
* **Intentionality**: Execute your chosen direction with precision - "intentionality, not intensity"

---

# Craftsmanship Checklist

Before finalizing the refinedPrompt, verify:

✓ **Visual Philosophy**: Design movement clearly stated?
✓ **Distinctive Typography**: Unique font pairings specified (NOT Arial/Inter/Roboto)?
✓ **Specific Palette**: Hex codes provided?
✓ **Layout Precision**: Clear composition instructions?
✓ **Texture & Material**: Grain, paper texture, or material qualities requested?
✓ **Craftsmanship Language**: "Museum-quality", "meticulously crafted" included?
✓ **Text Minimalism**: Instruction to minimize text and maximize visual communication?
✓ **Anti-AI Measures**: Negative prompts to avoid generic aesthetics?
✓ **Breathing Room**: Request for 40%+ negative space?
✓ **Context Appropriate**: Aspect ratio specified for blog context if applicable?
✓ **Intentionality**: Bold aesthetic direction executed with precision?

---

Focus on creating a refined prompt that will generate a museum-quality, distinctive, and highly legible infographic with intentional design thinking and master-level craftsmanship.`;

    // Send image and prompt to vision model
    const result = await genAI.models.generateContent({
      model: MODELS.VISION_CRITIQUE,
      contents: [
        {
          role: "user",
          parts: [
            {
              inlineData: {
                mimeType: "image/png",
                data: imageBase64,
              },
            },
            { text: critiquePrompt },
          ],
        },
      ],
    });

    const text = result.text || "";

    console.log(`[V${version}] Vision analysis received`);

    // Parse JSON response
    let parsed: { critiques: CritiquePoint[]; refinedPrompt: string };
    try {
      // Try to extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        parsed = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.warn(`[V${version}] Failed to parse JSON, using fallback`);
      // Fallback: create basic critique
      parsed = {
        critiques: [
          {
            title: "Analysis Complete",
            description: text.slice(0, 200) + "...",
          },
        ],
        refinedPrompt: `${originalPrompt} (Improved based on feedback: better clarity, enhanced visual appeal)`,
      };
    }

    console.log(`[V${version}] Found ${parsed.critiques.length} critique points`);
    return parsed;

  } catch (error) {
    console.error(`[V${version}] Vision critique error:`, error);
    
    // Return fallback instead of throwing
    return {
      critiques: [
        {
          title: "Analysis Unavailable",
          description: "Could not analyze this version. Continuing with enhanced prompt.",
        },
      ],
      refinedPrompt: `${originalPrompt} - Enhanced version ${version + 1}`,
    };
  }
}

