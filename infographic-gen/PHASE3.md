# Phase 3 - Server Actions with Placeholder API 🚀

## ✅ **Phase 3 Complete!**

Implemented full backend workflow using Next.js 15 Server Actions with placeholder functions that simulate the Gemini API.

---

## 🏗️ **Architecture**

### **File Structure:**
```
app/
├── actions/
│   ├── gemini-placeholder.ts      # Mock Gemini API calls
│   └── infographic-generator.ts   # Main orchestration logic
└── page.tsx                        # Client component with state
```

---

## 📦 **Server Actions**

### **1. `gemini-placeholder.ts`** (146 lines)

#### **generateImagePlaceholder()**
- Simulates `gemini-3-pro-image-preview` API call
- Returns placeholder SVG as base64
- Delay: 2-4 seconds (realistic API timing)
- Creates colored squares with version numbers

```typescript
generateImagePlaceholder(prompt, version)
  → Returns: base64 string
  → Time: ~2-4s
```

#### **critiqueImagePlaceholder()**
- Simulates `gemini-3-pro-preview` vision critique
- Analyzes image and generates improvement suggestions
- Returns refined prompt for next iteration
- Delay: 3-5 seconds (vision processing)

```typescript
critiqueImagePlaceholder(imageBase64, prompt, version)
  → Returns: {
      critiques: CritiquePoint[],
      refinedPrompt: string
    }
  → Time: ~3-5s
```

#### **generateInitialPrompt()**
- Creates structured prompt for infographic
- Includes design requirements and constraints
- Optimized for educational infographics

---

### **2. `infographic-generator.ts`** (115 lines)

#### **Main: generateInfographic()**
The core orchestration logic implementing the Draft → Critique → Refine loop:

```typescript
async function generateInfographic(
  topic: string,
  maxIterations: number
): Promise<InfographicVersion[]>
```

**Workflow:**
```
For each iteration (1 to maxIterations):
  1. Generate Image V{i}
     ├─ Call generateImagePlaceholder()
     └─ ~2-4 seconds
  
  2. Critique Image V{i} (if not last iteration)
     ├─ Call critiqueImagePlaceholder()
     ├─ Get improvement suggestions
     ├─ Generate refined prompt
     └─ ~3-5 seconds
  
  3. Store version with critiques
  
  4. Move to next iteration with refined prompt

Return all versions
```

**Example Timeline (3 iterations):**
```
00:00 - Start V1 generation
00:03 - V1 image complete
00:03 - Start V1 critique
00:07 - V1 critique complete
00:07 - Start V2 generation
00:10 - V2 image complete
00:10 - Start V2 critique
00:14 - V2 critique complete
00:14 - Start V3 generation (final)
00:17 - V3 image complete (no critique)
00:17 - All done! ✅

Total: ~17 seconds for 3 iterations
```

---

## 🎯 **Client Integration (`app/page.tsx`)**

### **State Management:**
```typescript
const [state, setState] = useState<GenerationState>({
  status: "idle",
  currentVersion: 0,
  versions: [],
  currentStep: "Ready to generate your infographic",
});
```

### **Generate Handler:**
```typescript
const handleGenerate = async (topic, maxIterations) => {
  // 1. Reset state
  setState({ status: "drafting", ... });
  
  // 2. Call Server Action
  const versions = await generateInfographic(topic, maxIterations);
  
  // 3. Update with results
  setState({ status: "done", versions, ... });
  
  // 4. Show success toast
  toast.success(`Generated ${versions.length} versions!`);
};
```

---

## 🧪 **Testing**

### **Test Steps:**
1. Open http://localhost:3000
2. Enter topic: "How Solar Panels Work"
3. Set loops: 5
4. Click "Generate Infographic"
5. Watch the process:
   - Form disables
   - Process View shows "Drafting"
   - Wait ~25-30 seconds (5 iterations × ~5s each)
   - Timeline appears with all 5 versions
   - Each version has its placeholder image
   - Critiques show for V1-V4

### **Expected Results:**
- ✅ 5 versions displayed in timeline
- ✅ V1: Blue badge, 3 critique points
- ✅ V2-V4: Purple badges, 1-2 critique points each
- ✅ V5: Green badge, no critique (final)
- ✅ All images downloadable
- ✅ Timestamps accurate
- ✅ No errors in console

### **Performance:**
| Iterations | Expected Time | Versions Generated |
|-----------|---------------|-------------------|
| 1 | ~2-4s | 1 (no critique) |
| 3 | ~15-20s | 3 with critiques |
| 5 | ~25-35s | 5 with critiques |
| 10 | ~50-70s | 10 with critiques |

---

## 🔄 **Workflow Example: 3 Iterations**

```
User Input: "How Coffee Machines Work", 3 loops

Step 1: Generate V1 (Draft)
├─ Prompt: "Create infographic about: How Coffee Machines Work..."
├─ Generate image (~3s)
└─ Result: V1 with blue badge

Step 2: Critique V1
├─ Analyze V1 image (~4s)
├─ Critiques:
│   • Text too small
│   • Dark colors
│   • Unclear flow
└─ Refined Prompt: "...IMPROVED: Larger typography, lighter bg..."

Step 3: Generate V2 (Refined)
├─ Use refined prompt
├─ Generate image (~3s)
└─ Result: V2 with purple badge

Step 4: Critique V2
├─ Analyze V2 image (~4s)
├─ Critiques:
│   • Typography improved
│   • Still generic style
└─ Refined Prompt: "...distinctive design style..."

Step 5: Generate V3 (Final)
├─ Use final refined prompt
├─ Generate image (~3s)
└─ Result: V3 with green badge (no critique)

✅ Complete: 3 versions in ~17 seconds
```

---

## 📊 **Placeholder vs Real API**

| Feature | Phase 3 (Placeholder) | Phase 6 (Real API) |
|---------|----------------------|-------------------|
| Image Generation | ✅ SVG placeholders | 🔜 Real images from Gemini |
| Critique | ✅ Mock analysis | 🔜 Real vision critique |
| Refinement | ✅ Prompt templates | 🔜 AI-generated prompts |
| Timing | ✅ Realistic delays | 🔜 Actual API latency |
| Content | ⚠️ Generic colors | 🔜 Topic-specific visuals |
| Quality | ⚠️ Static | 🔜 Iteratively improved |

---

## ⚡ **Current Limitations (Will Fix in Phase 4 & 6)**

### **Phase 3 Limitations:**
1. ❌ **No Real-time Updates**: User waits for all versions to complete
2. ❌ **No Progress Feedback**: Can't see which version is being generated
3. ❌ **Blocking UI**: Can't interact during generation
4. ⚠️ **Placeholder Images**: SVG squares instead of real infographics
5. ⚠️ **Mock Critiques**: Pre-written instead of AI-analyzed

### **Phase 4 Will Add:**
- ✅ Real-time progress updates (streaming)
- ✅ Show each version as it's generated
- ✅ Live critique display
- ✅ Cancellation support

### **Phase 6 Will Add:**
- ✅ Real Gemini image generation
- ✅ Actual vision critique
- ✅ AI-powered prompt refinement
- ✅ High-quality infographics

---

## 🧩 **Integration Points**

### **Data Flow:**
```
User Input (topic, loops)
    ↓
Client Component (page.tsx)
    ↓
Server Action (infographic-generator.ts)
    ↓
Loop (maxIterations times):
    ├─ Generate Image (gemini-placeholder.ts)
    ├─ Critique Image (gemini-placeholder.ts)
    └─ Store Version
    ↓
Return All Versions
    ↓
Update Client State
    ↓
Display in Timeline (timeline-view.tsx)
```

### **Type Safety:**
All data flows through strongly-typed interfaces:
- `GenerationState` - Client state
- `InfographicVersion` - Individual version
- `CritiquePoint` - Critique structure
- `GenerationProgress` - Progress updates (Phase 4)

---

## ✅ **Phase 3 Checklist**

- ✅ Server Actions created (`"use server"`)
- ✅ Placeholder functions simulate API calls
- ✅ Realistic timing delays
- ✅ Full Draft → Critique → Refine workflow
- ✅ Proper error handling
- ✅ Toast notifications
- ✅ Client-server integration
- ✅ Type-safe data flow
- ✅ Timeline displays all versions
- ✅ Critiques per version working
- ✅ Download functionality working
- ✅ No linting errors
- ✅ Console logging for debugging

---

## 🚀 **Next Steps**

**Phase 4: Real-time Updates**
- Implement streaming responses
- Show versions as they're generated
- Live progress tracking
- Cancellation support

**Phase 6: Real Gemini API**
- Replace placeholders with actual API calls
- `gemini-3-pro-image-preview` for generation
- `gemini-3-pro-preview` for vision critique
- Handle API rate limits and errors

---

## 🎯 **Status**

| Phase | Status | Description |
|-------|--------|-------------|
| Phase 1 | ✅ Complete | Project setup |
| Phase 2 | ✅ Complete | UI components |
| Phase 3 | ✅ Complete | Server Actions |
| Phase 4 | ⏳ Next | Real-time updates |
| Phase 5 | ✅ Complete | Timeline view |
| Phase 6 | ⏳ Pending | Real AI APIs |

---

**Ready for testing! Please try generating with different loop counts (1, 3, 5, 10) and confirm the workflow is smooth.** 🚀


