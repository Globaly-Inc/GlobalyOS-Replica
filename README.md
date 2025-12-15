# Welcome to GlobalyOS

**GlobalyOS** is a modern Business Operating System (SaaS) that combines HRMS, team communication, knowledge management, and CRM into one unified platform.

## Features

### 🧑‍💼 People Management (HRMS)
- Employee directory with detailed profiles
- Attendance tracking with QR code check-in/out
- Leave management with approval workflows
- Performance reviews and KPIs/OKRs
- Organization chart visualization

### 💬 Team Communication
- Real-time team chat with spaces and direct messages
- Social feed with posts, wins, kudos, and announcements
- @mentions and emoji reactions
- Push notifications

### 📚 Knowledge Base (Wiki)
- Collaborative documentation with rich text editor
- Folder organization with drag-drop support
- File attachments and internal linking
- AI-powered Q&A across your knowledge base

### 📅 Calendar & Events
- Company-wide event management
- Holiday scheduling by office location
- Team calendar integration

### 🤖 AI-Powered Features
- Global AI assistant with organization-wide knowledge
- AI-generated insights for KPIs
- Smart content suggestions

## Tech Stack

- **Frontend**: React, TypeScript, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Edge Functions, Storage)
- **Mobile**: PWA + Capacitor for native iOS/Android apps

## Getting Started

### Prerequisites
- Node.js 18+ & npm
- Git

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>

# Navigate to project directory
cd globalyos

# Install dependencies
npm install

# Start development server
npm run dev
```

### Building for Production

```sh
npm run build
```

### Mobile App Development

GlobalyOS supports native mobile apps via Capacitor:

```sh
# Add native platforms
npx cap add ios
npx cap add android

# Sync web build to native
npm run build && npx cap sync

# Open in IDE
npx cap open ios      # Opens Xcode (Mac only)
npx cap open android  # Opens Android Studio
```

## Deployment

- **Web**: Deploy via Lovable's publish feature or self-host the `dist` folder
- **iOS**: Build in Xcode and submit to App Store Connect
- **Android**: Build in Android Studio and submit to Google Play Console

## License

Proprietary - All rights reserved.
