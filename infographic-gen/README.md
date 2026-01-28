# AI Infographic Generator

A fullstack application that generates high-quality infographics using iterative AI refinement with Google Gemini.

## 🎯 Features

- **Iterative Refinement**: Draft → Critique → Refine loop (1-10 iterations)
- **Real-time Progress**: Live status updates with beautiful animations
- **Side-by-side Comparison**: Compare draft vs final versions
- **Generation History**: View and download all versions
- **AI Design Critique**: See what the AI improved in each iteration

## 🚀 Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Shadcn/UI
- **Animations**: Framer Motion
- **AI**: Google Gemini API
  - Image Generation: `gemini-3-pro-image-preview`
  - Vision Critique: `gemini-3-pro-preview`

## 📦 Installation

```bash
# Install dependencies
npm install

# Create .env.local file
echo "GEMINI_API_KEY=your_api_key_here" > .env.local

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

## 🎨 Project Structure

```
infographic-gen/
├── app/
│   ├── actions/          # Server Actions (Next Phase)
│   ├── layout.tsx        # Root layout
│   ├── page.tsx          # Main page
│   └── globals.css       # Global styles
├── components/
│   ├── ui/               # Shadcn UI components
│   ├── infographic-form.tsx
│   ├── process-view.tsx
│   ├── comparison-view.tsx
│   └── history-view.tsx
├── lib/
│   ├── types.ts          # TypeScript types
│   └── utils.ts          # Utility functions
└── Reference/            # API documentation
```

## 🔄 Development Phases

- ✅ **Phase 1**: Project setup (Next.js, TypeScript, Tailwind, Shadcn)
- ✅ **Phase 2**: Basic UI components with animations
- ⏳ **Phase 3**: Server Actions with placeholder API calls
- ⏳ **Phase 4**: Real-time status tracking & state management
- ⏳ **Phase 5**: Full comparison view & history functionality
- ⏳ **Phase 6**: Connect real Gemini AI APIs

## 📝 Current Status (Phase 2 Complete)

### ✨ Completed Features:
- 📝 **Infographic Form**: Topic input + iteration slider (1-10 loops)
- 🔄 **Process View**: Real-time status with animated progress bar
- 🖼️ **Comparison View**: Side-by-side draft vs final display
- 📚 **History View**: Grid of all generated versions
- 🎭 **Animations**: Smooth transitions using Framer Motion
- 📱 **Responsive Design**: Works on all screen sizes

### 🎨 UI Components:
- Custom styled form with textarea and range slider
- Animated status badges and progress indicators
- Image cards with download functionality
- Interactive history grid with hover effects

### 🎯 Next Steps:
The UI is fully functional and ready for backend integration. Phase 3 will implement the actual AI generation logic.

## 🎨 Design Highlights

- **Modern Gradient Backgrounds**: Smooth slate gradients
- **Status-based Colors**: Blue (drafting), Purple (analyzing), Amber (refining), Green (done)
- **Smooth Animations**: All components fade in with staggered delays
- **Interactive Elements**: Hover effects, loading states, progress animations
- **Accessibility**: Proper labels, ARIA attributes, keyboard navigation

## 📱 Screenshots

### Main Interface
- Input form with topic and iteration controls
- Real-time process status with animated progress
- Side-by-side comparison view
- Thumbnail history grid

## 🔧 Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 📄 License

MIT

---

**Status**: Phase 2 Complete - UI fully functional, ready for AI integration ✨


