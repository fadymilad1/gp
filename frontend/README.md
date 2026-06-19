# Medify - Medical Website Builder Frontend

A modern frontend for building medical websites for Hospitals and Pharmacies. Built with Next.js 16, TypeScript, and Tailwind CSS.

## Features

- 🏥 **Hospital Website Builder** - Form-based website creation
- 💊 **Pharmacy Website Builder** - Purchase-aware template marketplace and website publishing workflow
- 🤖 **AI Assistant** - Intelligent content generation and website management
- 📊 **Dashboard** - Comprehensive dashboard with setup progress and operational modules
- 🎨 **Modern UI** - Clean, professional design with Tailwind CSS
- 📱 **Responsive** - Desktop-first design that works on all devices

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript 5.5+
- **Styling**: Tailwind CSS
- **Icons**: React Icons
- **Architecture**: Component-based, reusable UI components
- **Bundler**: Turbopack (default in Next.js 16)

## Getting Started

### Prerequisites

- Node.js 20.9.0 or later
- npm or yarn
- TypeScript 5.1.0 or later

### Installation

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000) in your browser

## Project Structure

```
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   ├── login/             # Login page
│   ├── signup/            # Signup page
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Landing page
│   └── globals.css        # Global styles
├── components/            # Reusable components
│   ├── ui/               # UI components (Button, Input, Card, etc.)
│   └── layout/           # Layout components (Sidebar, Topbar)
├── tailwind.config.ts    # Tailwind configuration
├── tsconfig.json         # TypeScript configuration
└── package.json          # Dependencies
```

## Pages

### Public Pages
- **Landing Page** (`/`) - Hero, features, pricing, testimonials
- **Login** (`/login`) - User authentication
- **Signup** (`/signup`) - User registration
- **Forgot Password** (`/forgot-password`) - Request password reset link
- **Reset Password** (`/reset-password`) - Set new password from secure token

### Dashboard Pages
- **Dashboard** (`/dashboard`) - Main dashboard with widgets and stats
- **Hospital Setup** (`/dashboard/hospital/setup`) - Hospital website builder
- **Pharmacy Overview** (`/dashboard/pharmacy`) - Pharmacy launch and inventory overview
- **Pharmacy Setup** (`/dashboard/pharmacy/setup`) - Initial website setup flow
- **Pharmacy Products** (`/dashboard/pharmacy/products`) - CSV import and catalog management
- **Pharmacy Templates** (`/dashboard/pharmacy/templates`) - Purchase, activate, and cancel templates
- **Business Info** (`/dashboard/business-info`) - Business information form
- **AI Assistant** (`/dashboard/ai-assistant`) - AI chat interface
- **Settings** (`/dashboard/settings`) - Account and website settings

## Components

### UI Components
- `Button` - Primary, Secondary, Ghost variants
- `Input` - Text input with label and error handling
- `Textarea` - Multi-line text input
- `Select` - Dropdown select
- `FileUpload` - File upload with drag & drop
- `Toggle` - Switch toggle
- `Card` - Container card component
- `Modal` - Modal dialog
- `ProgressBar` - Step progress indicator

### Layout Components
- `Sidebar` - Dashboard navigation sidebar
- `Topbar` - Top navigation bar with search and user menu

## Color Palette

- **Primary**: #1B76FF (Blue)
- **Primary Dark**: #0C4EB7
- **Primary Light**: #E7F2FF
- **Neutrals**: #FFFFFF, #F7F9FC, #DCE3EC, #6C7A8A, #1A1A1A
- **Success**: #28C76F (Green)
- **Warning**: #FFB020 (Orange)
- **Error**: #FF4C4C (Red)
- **AI Accent**: #7C3AED (Purple)

## Development

### Build for Production

```bash
npm run build
npm start
```

### Linting

```bash
npx tsc --noEmit
```

## Notes

- Frontend integrates with the Django API using `NEXT_PUBLIC_API_URL`.
- Pharmacy template pages also mirror selected data in scoped/public local storage for instant owner and visitor previews.
- For release validation, prefer `npm run build` and `npx tsc --noEmit`.

## License

This project is part of a frontend development task.

