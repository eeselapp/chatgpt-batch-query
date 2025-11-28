# Contributing to ChatGPT Batch Scraper

Thank you for your interest in contributing to this project! This document provides guidelines and instructions for contributing.

## Code of Conduct

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on constructive feedback
- Respect different viewpoints and experiences

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm or yarn
- Git
- A code editor (VS Code recommended)

### Development Setup

1. **Fork the repository**
   - Click the "Fork" button on GitHub
   - Clone your fork:
     ```bash
     git clone https://github.com/your-username/chatgpt-scrapper.git
     cd chatgpt-scrapper
     ```

2. **Set up the backend**
   ```bash
   cd backend
   npm install
   cp .env.example .env
   # Edit .env if needed
   npm run dev
   ```

3. **Set up the frontend** (in a new terminal)
   ```bash
   cd frontend
   npm install
   cp .env.local.example .env.local
   npm run dev
   ```

4. **Verify the setup**
   - Backend should be running at `http://localhost:3001`
   - Frontend should be running at `http://localhost:3000`
   - Open `http://localhost:3000` in your browser

## Making Changes

### Branch Naming

Create a new branch for your changes:
```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
# or
git checkout -b docs/your-documentation-update
```

### Commit Messages

Write clear and descriptive commit messages:
- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally

Examples:
```
feat: Add support for batch processing
fix: Resolve memory leak in browser instance
docs: Update installation instructions
refactor: Simplify error handling logic
```

### Code Style

- Follow existing code style and formatting
- Use meaningful variable and function names
- Add comments for complex logic
- Keep functions focused and single-purpose
- Write self-documenting code when possible

### Testing

Before submitting a pull request:
- Test your changes locally
- Ensure the backend and frontend work together
- Check for any console errors
- Verify that existing functionality still works

## Pull Request Process

1. **Update your fork**
   ```bash
   git checkout main
   git pull upstream main
   ```

2. **Create your feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make your changes**
   - Write clean, maintainable code
   - Add comments where necessary
   - Update documentation if needed

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: Add your feature description"
   ```

5. **Push to your fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to the original repository on GitHub
   - Click "New Pull Request"
   - Select your branch
   - Fill out the PR template with:
     - Description of changes
     - Related issues (if any)
     - Screenshots (if applicable)
     - Testing notes

## What to Contribute

We welcome contributions in the following areas:

### Features
- New functionality
- Performance improvements
- UI/UX enhancements

### Bug Fixes
- Fixing existing bugs
- Improving error handling
- Resolving edge cases

### Documentation
- Improving README
- Adding code comments
- Writing tutorials or guides
- Translating documentation

### Testing
- Adding unit tests
- Integration tests
- E2E tests

## Reporting Issues

When reporting issues, please include:
- Clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, Node version, etc.)
- Screenshots (if applicable)

## Questions?

If you have questions or need help:
- Open an issue with the "question" label
- Check existing issues and discussions
- Review the documentation

## License

By contributing, you agree that your contributions will be licensed under the ISC License.

Thank you for contributing! 🎉

