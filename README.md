# Lottery Frontend

A React + Vite frontend application for a Telegram Mini App lottery game.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run development server:
```bash
npm run dev
```

3. Build for production:
```bash
npm run build
```

## Project Structure

- `src/components/` - React components (Header, Footer)
- `src/screens/` - Screen components (MainScreen/Roulette)
- `src/assets/` - Images, icons, and other static assets
- `src/styles/` - CSS stylesheets from the original project

## Deployment

The project is configured for Railway deployment using Docker:

1. The `Dockerfile` builds the React app and serves it with nginx
2. The `nginx.conf` handles SPA routing
3. The `Procfile` is used by Railway for process management

## Features

- Header with balance display, language selector, and settings menu
- Footer navigation with 5 main sections
- Roulette game screen with demo mode
- Modal dialogs for game rules, errors, and account details
- Telegram WebApp integration


