'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { exportToCSV, ScrapeResult } from '@/lib/csv-export';
import { Upload, FileText, Download, AlertCircle, Loader2, CheckCircle2, LogIn, X, CheckCircle, RotateCcw } from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

// Helper function to format time in milliseconds to readable format
const formatTime = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours} jam ${minutes % 60} menit`;
  } else if (minutes > 0) {
    return `${minutes} menit ${seconds % 60} detik`;
  } else {
    return `${seconds} detik`;
  }
};

export default function Home() {
  const [questions, setQuestions] = useState<string[]>([]);
  const [manualInput, setManualInput] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [isScraping, setIsScraping] = useState(false);
  const [results, setResults] = useState<ScrapeResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressInfo, setProgressInfo] = useState<{
    current: number;
    total: number;
    currentQuestion: string | null;
    estimatedTimeRemaining: number | null;
    elapsed: number;
  } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string | null>(null); // null = not logged in, 'waiting' = waiting for login, 'saving' = saving session, 'success' = logged in
  const [showTutorial, setShowTutorial] = useState(true); // Show tutorial by default
  const [isCheckingLogin, setIsCheckingLogin] = useState(true);
  const [isResetting, setIsResetting] = useState(false);

  const handleManualInput = () => {
    const lines = manualInput
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    if (lines.length === 0) {
      setError('Please enter at least one question');
      return;
    }

    setQuestions(lines);
    setError(null);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    // Backend will auto-detect header

    try {
      const response = await fetch(`${API_URL}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file');
      }

      const data = await response.json();
      setQuestions(data.questions);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to process file');
      setQuestions([]);
    } finally {
      setIsUploading(false);
    }
  };

  const handleScrape = async () => {
    if (questions.length === 0) {
      setError('Please add questions first (manual input or file upload)');
      return;
    }

    setIsScraping(true);
    setError(null);
    setResults([]);
    setProgress(0);
    setProgressInfo(null);

    // Generate session ID
    const sessionId = `scrape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    let eventSource: EventSource | null = null;

    try {
      // Connect to SSE endpoint for progress updates
      eventSource = new EventSource(`${API_URL}/api/scrape-progress/${sessionId}`);
      
      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'progress') {
            setProgress(data.progressPercent);
            setProgressInfo({
              current: data.current,
              total: data.total,
              currentQuestion: data.currentQuestion,
              estimatedTimeRemaining: data.estimatedTimeRemaining,
              elapsed: data.elapsed
            });
          }
        } catch (e) {
          console.error('Error parsing progress data:', e);
        }
      };

      eventSource.onerror = (error) => {
        console.error('SSE connection error:', error);
        // Don't close connection on error, it might reconnect
      };

      // Create AbortController for timeout handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 900000); // 15 minutes timeout (increased for long responses)

      const response = await fetch(`${API_URL}/api/scrape`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ questions, sessionId }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If response is not JSON, create error from status
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }

        // Check if there are partial results (even in error response)
        if (errorData.completedResults && errorData.completedResults.length > 0) {
          setResults(errorData.completedResults);
          setProgress((errorData.completedResults.length / questions.length) * 100);
          setError(`Partial results (${errorData.completedResults.length}/${questions.length}): ${errorData.message || errorData.error || 'Some questions failed to scrape'}`);
        } else {
          throw new Error(errorData.message || errorData.error || 'Scraping failed');
        }
        return;
      }

      const data = await response.json();
      setResults(data.results);
      setProgress(100);
      
      // Update final progress info
      setProgressInfo(prev => ({
        current: questions.length,
        total: questions.length,
        currentQuestion: null,
        estimatedTimeRemaining: 0,
        elapsed: prev?.elapsed || 0
      }));
    } catch (err: any) {
      // Handle different types of errors
      let errorMessage = 'Failed to scrape questions';
      
      if (err.name === 'AbortError') {
        errorMessage = 'Request timed out. The scraping process is taking longer than expected. Please try again with fewer questions.';
      } else if (err.message.includes('socket hang up') || err.message.includes('ECONNRESET') || err.message.includes('Failed to fetch')) {
        errorMessage = 'Connection lost. The server may be processing your request. Please check if any results were saved and try again.';
      } else if (err.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
      setProgress(0);
      setProgressInfo(null);
    } finally {
      // Close SSE connection
      if (eventSource) {
        eventSource.close();
      }
      setIsScraping(false);
    }
  };

  const handleExport = () => {
    if (results.length === 0) {
      setError('No results to export');
      return;
    }
    exportToCSV(results);
  };

  // Check login status on mount and periodically
  useEffect(() => {
    let isMounted = true;
    let checkInProgress = false;
    
    const checkLoginStatus = async () => {
      // Don't check if already checking
      if (checkInProgress) return;
      
      checkInProgress = true;
      
      try {
        // Use dedicated endpoint to check login status
        const response = await fetch(`${API_URL}/api/check-login`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        const responseText = await response.text();
        let data;
        
        try {
          data = JSON.parse(responseText);
        } catch (e) {
          // Not JSON, probably HTML error page
          console.error('Non-JSON response:', responseText.substring(0, 200));
          if (isMounted) {
            setLoginStatus(null);
            setShowTutorial(true);
            setIsCheckingLogin(false); // Hide loading modal
          }
          return;
        }

        if (!isMounted) return;

        if (response.status === 401 || (data.error === 'LOGIN_REQUIRED' || !data.isLoggedIn)) {
          // If we were saving, might still be in process, keep checking
          if (loginStatus === 'saving') {
            // Don't change status yet, keep checking
            setIsCheckingLogin(false); // Hide loading modal even if still saving
            return;
          }
          setLoginStatus(null);
          setShowTutorial(true); // Keep tutorial visible if not logged in
          setIsCheckingLogin(false); // Hide loading modal
        } else if (data.isLoggedIn) {
          // If we were waiting, transition to saving first (briefly)
          if (loginStatus === 'waiting') {
            setLoginStatus('saving');
            setIsCheckingLogin(false); // Hide loading modal, show tutorial instead
            // Check again after short delay to see if still logged in (session saved)
            setTimeout(async () => {
              try {
                const recheckResponse = await fetch(`${API_URL}/api/check-login`, {
                  method: 'GET',
                  headers: { 'Content-Type': 'application/json' },
                });
                const recheckText = await recheckResponse.text();
                const recheckData = JSON.parse(recheckText);
                if (recheckData.isLoggedIn) {
                  setLoginStatus('success');
                  setShowTutorial(false);
                } else {
                  setLoginStatus('saving'); // Still saving, will check again
                }
              } catch (e) {
                // If error, assume still saving
                setLoginStatus('saving');
              }
            }, 2000); // 2 seconds should be enough for Chrome to save session
          } else if (loginStatus === 'saving') {
            // Already saving, transition to success
            setLoginStatus('success');
            setShowTutorial(false);
            setIsCheckingLogin(false); // Hide loading modal
          } else {
            setLoginStatus('success');
            setShowTutorial(false); // Hide tutorial if logged in
            setIsCheckingLogin(false); // Hide loading modal
          }
        } else {
          // Other error, assume not logged in
          setLoginStatus(null);
          setShowTutorial(true); // Keep tutorial visible if not logged in
          setIsCheckingLogin(false); // Hide loading modal
        }
      } catch (err) {
        // If error, assume not logged in
        if (isMounted) {
          console.error('Error checking login status:', err);
          setLoginStatus(null);
          setShowTutorial(true);
          setIsCheckingLogin(false); // Hide loading modal
        }
      } finally {
        checkInProgress = false;
      }
    };

    // Check immediately on mount
    checkLoginStatus();
    
    // Set up polling interval
    // If waiting for login, check every 2 seconds (more aggressive)
    // Otherwise, check every 10 seconds (less frequent)
    const pollInterval = loginStatus === 'waiting' ? 2000 : 10000;
    
    const interval = setInterval(() => {
      // Always check if waiting for login
      // Also check periodically if not logged in (to catch login after browser close)
      if (loginStatus === 'waiting' || loginStatus === null) {
        checkLoginStatus();
      }
    }, pollInterval);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [loginStatus]);

  const handleLogin = async () => {
    // Prevent multiple login attempts
    if (isLoggingIn || loginStatus === 'waiting' || loginStatus === 'saving') {
      return;
    }
    
    setIsLoggingIn(true);
    setError(null);
    setLoginStatus('waiting');
    setShowTutorial(true); // Keep tutorial open to show status

    try {
      const response = await fetch(`${API_URL}/api/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Failed to open login browser');
      }

      const data = await response.json();
      
      if (data.alreadyLoggedIn) {
        setLoginStatus('success');
        setError(null);
        setShowTutorial(false); // Close tutorial if already logged in
      } else {
        setLoginStatus('waiting');
        setError(null);
        setShowTutorial(true); // Keep tutorial open to show status
        // Start aggressive polling for login status (will be handled by useEffect)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to open login browser');
      setLoginStatus(null);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResetSession = async () => {
    if (!confirm('Are you sure you want to reset your session? This will clear all saved login data and you will need to login again.')) {
      return;
    }

    setIsResetting(true);
    setError(null);

    try {
      const response = await fetch(`${API_URL}/api/reset-session`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      // Get response text first to check if it's JSON
      const responseText = await response.text();
      
      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.error('Non-JSON response:', responseText.substring(0, 200));
        throw new Error(`Server returned non-JSON response (${response.status}). Please check if the server is running at ${API_URL}`);
      }

      // Parse JSON
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Failed to parse JSON:', responseText.substring(0, 200));
        throw new Error('Server returned invalid JSON response');
      }

      if (!response.ok) {
        throw new Error(data.message || data.error || 'Failed to reset session');
      }
      
      // Reset all states immediately
      setLoginStatus(null);
      setShowTutorial(true);
      setError(null);
      setQuestions([]);
      setResults([]);
      setIsCheckingLogin(false); // Set to false so tutorial can show immediately
      
      // Show success message
      alert('Session reset successfully! Please login again.');
    } catch (err: any) {
      console.error('Reset session error:', err);
      setError(err.message || 'Failed to reset session. Please check if the server is running.');
    } finally {
      setIsResetting(false);
    }
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Loading overlay while checking login status */}
      {isCheckingLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-md w-full">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400 mb-4" />
              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                Checking login status...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-500 mt-2 text-center">
                Please wait while we verify if you're already logged in
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tutorial Modal - Show only if not logged in and not checking */}
      {showTutorial && loginStatus !== 'success' && !isCheckingLogin && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-2xl">Getting Started</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowTutorial(false)}
                  disabled={loginStatus !== 'success'}
                  title={loginStatus !== 'success' ? 'Please complete login first' : 'Close tutorial'}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                Follow these steps to start scraping ChatGPT
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Step 1 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                  1
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Login to ChatGPT</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Click the button below to open ChatGPT in a browser window. We recommend:
                  </p>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4 list-disc">
                    <li>Login with <strong>email/password</strong> (Google login may be blocked by automation)</li>
                    <li>Use a <strong>fresh email account</strong> for best results</li>
                  </ul>
                  <Button
                    onClick={handleLogin}
                    disabled={isLoggingIn || loginStatus === 'waiting' || loginStatus === 'saving'}
                    className="mt-3"
                  >
                    {isLoggingIn ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Opening Browser...
                      </>
                    ) : loginStatus === 'waiting' || loginStatus === 'saving' ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Login in progress...
                      </>
                    ) : (
                      <>
                        <LogIn className="mr-2 h-4 w-4" />
                        Open ChatGPT Login
                      </>
                    )}
                  </Button>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                  2
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Complete Login</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Complete the login process in the browser window. The browser will <strong>automatically close</strong> after login is detected, 
                    and your session will be saved. You'll see a loading indicator while we're saving your login data.
                  </p>
                  {loginStatus === 'waiting' && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                        <p className="text-sm text-blue-800 dark:text-blue-200 font-medium">
                          Waiting for login... Please complete login in the browser window.
                        </p>
                      </div>
                    </div>
                  )}
                  {loginStatus === 'saving' && (
                    <div className="mt-2 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                      <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin text-green-600 dark:text-green-400" />
                        <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                          Login detected! Saving your session data... Please wait.
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                  3
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Choose Input Method</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    Once logged in, you can:
                  </p>
                  <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1 ml-4 list-disc">
                    <li>Enter questions <strong>manually</strong> (one per line)</li>
                    <li>Or <strong>upload a CSV/Excel file</strong> with questions</li>
                  </ul>
                </div>
              </div>

              {/* Step 4 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                  4
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Start Scraping</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                    We scrape <strong>directly from the ChatGPT website</strong>! You can check your ChatGPT account to see the actual conversations.
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    This is our advantage - real scraping from the actual web interface!
                  </p>
                </div>
              </div>

              {/* Step 5 */}
              <div className="flex gap-4">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center font-bold text-blue-600 dark:text-blue-400">
                  5
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold mb-2">Download Results</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Download your results as a <strong>CSV file</strong> with all answers and sources. Happy scraping! 🎉
                  </p>
                </div>
              </div>

              {loginStatus === 'success' && (
                <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800 flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-800 dark:text-green-200 font-medium">
                    ✅ You are logged in! You can now start scraping.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50 mb-2">
            ChatGPT Batch Scraper
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Scrape multiple ChatGPT questions and export results with sources
          </p>
        </div>

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loginStatus !== 'success' && !showTutorial && (
          <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              <strong>Important:</strong> Please login to ChatGPT first before scraping. 
              See the Getting Started guide above for instructions.
            </AlertDescription>
          </Alert>
        )}

        {loginStatus === 'success' && (
          <Alert className="mb-6 bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800">
            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
            <AlertDescription className="text-green-800 dark:text-green-200">
              <div className="flex items-center justify-between">
                <div>
                  ✅ You are already logged in to ChatGPT! You can start scraping now.
                </div>
                <Button
                  onClick={handleResetSession}
                  disabled={isResetting}
                  variant="outline"
                  size="sm"
                  className="ml-4"
                >
                  {isResetting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset Session
                    </>
                  )}
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {loginStatus === 'waiting' && (
          <Alert className="mb-6 bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800">
            <Loader2 className="h-4 w-4 text-yellow-600 dark:text-yellow-400 animate-spin" />
            <AlertDescription className="text-yellow-800 dark:text-yellow-200">
              ⏳ Browser window opened. Please login to ChatGPT in the browser window. 
              The browser will automatically close after login is detected.
            </AlertDescription>
          </Alert>
        )}

        {loginStatus === 'saving' && (
          <Alert className="mb-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <Loader2 className="h-4 w-4 text-blue-600 dark:text-blue-400 animate-spin" />
            <AlertDescription className="text-blue-800 dark:text-blue-200">
              💾 Login detected! Saving your session data... Please wait. This may take a few seconds.
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          {/* Input Section */}
          <Card>
            <CardHeader>
              <CardTitle>Input Questions</CardTitle>
              <CardDescription>
                Enter questions manually or upload a CSV/Excel file
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Manual Input */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Manual Input</label>
                <Textarea
                  placeholder={loginStatus === 'success' ? "Enter questions, one per line..." : "Please login first to enter questions"}
                  value={manualInput}
                  onChange={(e) => setManualInput(e.target.value)}
                  rows={6}
                  disabled={isScraping || isUploading || loginStatus !== 'success'}
                />
                <Button
                  onClick={handleManualInput}
                  disabled={isScraping || isUploading || !manualInput.trim()}
                  className="w-full"
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Add Questions
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white dark:bg-slate-950 px-2 text-slate-500">
                    Or
                  </span>
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Upload File (CSV/Excel)</label>
                <div className="flex items-center gap-2">
                  <Input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    disabled={isScraping || isUploading || loginStatus !== 'success'}
                    className="flex-1"
                  />
                  {isUploading && <Loader2 className="h-4 w-4 animate-spin" />}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Format: Questions in the first column and the first row is the header (e.g., "Questions").
                </p>
              </div>

              {/* Questions List */}
              {questions.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium">
                      Questions ({questions.length})
                    </label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setQuestions([])}
                      disabled={isScraping}
                    >
                      Clear All
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 p-2 border rounded-md bg-slate-50 dark:bg-slate-900">
                    {questions.map((q, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-sm p-2 bg-white dark:bg-slate-800 rounded"
                      >
                        <span className="flex-1 truncate">{q}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeQuestion(idx)}
                          disabled={isScraping}
                          className="ml-2 h-6 w-6 p-0"
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrape Button */}
              <Button
                onClick={handleScrape}
                disabled={isScraping || questions.length === 0 || loginStatus !== 'success'}
                className="w-full"
                size="lg"
              >
                {isScraping ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Scraping...
                  </>
                ) : loginStatus !== 'success' ? (
                  <>
                    <LogIn className="mr-2 h-4 w-4" />
                    Please Login First
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Start Scraping
                  </>
                )}
              </Button>

              {isScraping && (
                <div className="space-y-2">
                  <Progress value={progress} />
                  <div className="text-xs text-center text-slate-500 space-y-1">
                    {progressInfo ? (
                      <>
                        <p className="font-medium">
                          Memproses {progressInfo.current} dari {progressInfo.total} pertanyaan
                        </p>
                        {progressInfo.currentQuestion && (
                          <p className="text-slate-400 italic truncate">
                            "{progressInfo.currentQuestion}"
                          </p>
                        )}
                        {progressInfo.estimatedTimeRemaining !== null && progressInfo.estimatedTimeRemaining > 0 && (
                          <p className="text-slate-400">
                            Estimasi waktu tersisa: {formatTime(progressInfo.estimatedTimeRemaining)}
                          </p>
                        )}
                        {progressInfo.elapsed > 0 && (
                          <p className="text-slate-400">
                            Waktu berjalan: {formatTime(progressInfo.elapsed)}
                          </p>
                        )}
                      </>
                    ) : (
                      <p>Memproses pertanyaan...</p>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Results</CardTitle>
                  <CardDescription>
                    {results.length > 0
                      ? `${results.length} question(s) scraped`
                      : 'Results will appear here'}
                  </CardDescription>
                </div>
                {results.length > 0 && (
                  <Button onClick={handleExport} variant="outline" size="sm">
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {results.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No results yet</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                  {results.map((result, idx) => (
                    <Card key={idx} className="bg-slate-50 dark:bg-slate-900">
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <Badge variant="outline" className="mb-2">
                            Question {idx + 1}
                          </Badge>
                          <p className="font-medium text-slate-900 dark:text-slate-50">
                            {result.question}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            Answer:
                          </p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                            {result.answer.substring(0, 200)}
                            {result.answer.length > 200 && '...'}
                          </p>
                        </div>
                        {result.sources && (
                          <div>
                            <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Sources:
                            </p>
                            <p className="text-xs text-slate-500 dark:text-slate-500 break-all">
                              {result.sources || 'No sources found'}
                            </p>
                          </div>
                        )}
                        <div className="flex items-center text-xs text-green-600 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Scraped successfully
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
