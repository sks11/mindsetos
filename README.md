# MindsetOS AI - Intelligent Journaling App

An AI-powered journaling application that provides personalized insights and analysis of your daily thoughts and experiences.

## Features

- 🔐 **Secure Authentication**: Google OAuth integration
- 🤖 **AI-Powered Analysis**: OpenAI integration for journal insights
- 📱 **Modern UI**: Built with Next.js and shadcn/ui components
- 🐍 **Python Backend**: FastAPI backend for AI processing
- 🔒 **Privacy First**: Secure handling of personal data

## Tech Stack

### Frontend
- **Next.js 14** - React framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **shadcn/ui** - UI components
- **NextAuth.js** - Authentication

### Backend
- **FastAPI** - Python web framework
- **OpenAI API** - AI analysis
- **Python 3.8+** - Backend runtime

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm
- Python 3.8+
- OpenAI API key
- Google OAuth credentials

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/sks11/mindsetos.git
   cd mindsetos
   ```

2. **Install dependencies**
   ```bash
   # Frontend dependencies
   pnpm install
   
   # Backend dependencies
   cd scripts
   pip install -r requirements.txt
   cd ..
   ```

3. **Environment Variables**
   
   Copy `.env.example` to `.env.local` (for Next.js) and `.env` (for Python):
   ```bash
   cp .env.example .env.local
   cp .env.example .env
   ```
   
   Fill in your actual values:
   ```env
   # NextAuth Configuration
   NEXTAUTH_SECRET=your_nextauth_secret_here
   NEXTAUTH_URL=http://localhost:3000
   
   # Google OAuth Configuration
   GOOGLE_CLIENT_ID=your_google_client_id_here
   GOOGLE_CLIENT_SECRET=your_google_client_secret_here
   
   # OpenAI Configuration
   OPENAI_API_KEY=your_openai_api_key_here
   ```

### Getting API Keys

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an account or sign in
3. Navigate to API Keys section
4. Create a new API key

#### Google OAuth Setup
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google+ API
4. Go to Credentials → Create Credentials → OAuth 2.0 Client ID
5. Set authorized redirect URI: `http://localhost:3000/api/auth/callback/google`

#### NextAuth Secret
Generate a secure secret:
```bash
openssl rand -base64 32
```

### Running the Application

1. **Start the Next.js frontend**
   ```bash
   pnpm dev
   ```

2. **Start the Python backend** (in a separate terminal)
   ```bash
   cd scripts
   python run_backend.py
   ```

3. **Access the application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:8000

## Project Structure

```
mindsetos-ai/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── auth/              # Authentication pages
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── providers/        # Context providers
├── scripts/              # Python backend
│   ├── fastapi_backend.py # FastAPI server
│   ├── run_backend.py    # Backend runner
│   └── requirements.txt  # Python dependencies
├── lib/                  # Utility functions
├── hooks/                # Custom React hooks
└── public/               # Static assets
```

## Security Features

- 🔒 Environment variables are properly secured
- 🚫 Sensitive files excluded from version control
- 🔐 OAuth-based authentication
- 🛡️ API key protection

## Development

### Adding New Features
1. Create feature branch: `git checkout -b feature/your-feature`
2. Make your changes
3. Test thoroughly
4. Submit pull request

### Code Style
- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting

## Deployment

### Vercel (Recommended for Frontend)
1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main

### Backend Deployment
- Consider using Railway, Render, or AWS for Python backend
- Ensure environment variables are properly configured

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is private and proprietary.

## Support

For questions or issues, please create an issue in the GitHub repository. 