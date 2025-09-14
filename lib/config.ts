// Configuration for API endpoints
export const config = {
  // Backend API URL - uses environment variable in production, localhost in development
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000',
  
  // Frontend URL for CORS and redirects
  frontendUrl: process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000',
}

// Helper function to construct API endpoints
export const apiEndpoints = {
  analyzeJournal: `${config.apiUrl}/analyze-journal`,
  userHistory: (email: string) => `${config.apiUrl}/user-history/${encodeURIComponent(email)}`,
  deleteHistoryEntry: (email: string, id: string) => 
    `${config.apiUrl}/user-history/${encodeURIComponent(email)}/${id}`,
} 