# ShareSpace - Collaborative Document Editor

A modern, production-ready real-time collaborative document editor built with React, TypeScript, and Fluid Framework.

## Features

- 🎨 **Modern UI/UX** - Clean, professional design with Tailwind CSS
- ✍️ **Rich Text Editing** - Powered by TipTap editor with full formatting support
- 🤝 **Real-time Collaboration** - Built on Microsoft Fluid Framework
- 🤖 **AI Assistant** - Integrated AI-powered writing assistance
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- ♿ **Accessible** - WCAG compliant with keyboard navigation
- 🎯 **Production Ready** - Optimized build with code splitting

## Tech Stack

- **Frontend**: React 19, TypeScript
- **Styling**: Tailwind CSS with custom design system
- **Editor**: TipTap (ProseMirror)
- **Collaboration**: Fluid Framework
- **Build Tool**: Vite
- **Routing**: React Router

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python with `uv` package manager (for local Fluid server)

### Installation

```bash
# Install dependencies
npm install

# Install uv for local Fluid server (if not already installed)
# macOS/Linux
curl -LsSf https://astral.sh/uv/install.sh | sh

# Windows
powershell -c "irm https://astral.sh/uv/install.ps1 | iex"
```

### Development

```bash
# Start local Fluid server (in one terminal)
npx @fluidframework/azure-local-service@latest

# Start development server (in another terminal)
npm run dev
```

The app will open at `http://localhost:3000`

### Building for Production

```bash
# Create optimized production build
npm run build

# Preview production build locally
npm run preview
```

## Project Structure

```
src/
├── app/                    # App configuration and routing
├── components/
│   ├── layout/            # Layout components
│   └── panels/            # Sidebar panels
├── features/
│   ├── editor/            # Editor components
│   └── presence/          # User presence tracking
├── fluid/                 # Fluid Framework configuration
├── services/              # External services
└── index.css             # Global styles and design tokens
```

## Design System

The project uses a custom design system with:

- **CSS Variables** for theming
- **Tailwind Utilities** for rapid development
- **Component Classes** for reusable patterns
- **Responsive Breakpoints** for mobile-first design

### Color Palette

- Primary: Indigo (rgb(99 102 241))
- Background: Slate 950/900/800
- Text: Slate 50/200/400
- Accent: Purple, Green, Cyan

## Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Netlify

```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "run", "preview"]
```

## Environment Variables

Create a `.env` file for production configuration:

```env
VITE_FLUID_TENANT_ID=your_tenant_id
VITE_FLUID_ENDPOINT=your_endpoint
VITE_AI_API_KEY=your_api_key
```

## Performance Optimization

- ✅ Code splitting for vendor libraries
- ✅ Lazy loading for routes
- ✅ Optimized bundle size
- ✅ Tree shaking enabled
- ✅ CSS purging in production
- ✅ Asset compression

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Mobile browsers (iOS Safari, Chrome Mobile)

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/yourusername/sharespace/issues)
- Documentation: [View docs](https://docs.sharespace.app)

---

Built with ❤️ using React and Fluid Framework
