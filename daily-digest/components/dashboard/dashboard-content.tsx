"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, Mail, Clock, User, Save, Play } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface DigestLog {
  id: string;
  status: string;
  totalScanned: number;
  totalSelected: number;
  executedAt: Date;
}

interface Digest {
  id: string;
  name: string;
  twitterUsernames: string[];
  scheduleHour: number;
  scheduleTimezone: string;
  timeWindowHours: number;
  recipientEmail: string;
  isActive: boolean;
  logs: DigestLog[];
}

interface User {
  name?: string | null;
  email?: string | null;
  image?: string | null;
}

export function DashboardContent({ digest, user }: { digest: Digest; user: User }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testLoading, setTestLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: digest.name,
    twitterUsernames: digest.twitterUsernames.join(", "),
    scheduleHour: digest.scheduleHour,
    timeWindowHours: digest.timeWindowHours,
    recipientEmail: digest.recipientEmail,
    isActive: digest.isActive,
  });

  const handleSave = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/digest", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          twitterUsernames: formData.twitterUsernames
            .split(",")
            .map((u) => u.trim())
            .filter((u) => u.length > 0),
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      toast({
        title: "Success",
        description: "Digest settings saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTestRun = async () => {
    setTestLoading(true);
    try {
      const response = await fetch("/api/digest/run", {
        method: "POST",
      });

      if (!response.ok) throw new Error("Failed to run");

      toast({
        title: "Success",
        description: "Test digest is being generated. Check your email in a few minutes.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run test digest",
        variant: "destructive",
      });
    } finally {
      setTestLoading(false);
    }
  };

  const handleSignOut = () => {
    window.location.href = "/api/auth/signout";
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">Daily Digest</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {user.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.image} alt="" className="w-8 h-8 rounded-full" />
              )}
              <span className="text-sm text-gray-700">{user.email}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Card */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Digest Configuration</CardTitle>
                <CardDescription>
                  Configure your daily Twitter digest settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">Digest Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder="My Daily Digest"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="usernames">Twitter Usernames</Label>
                  <Input
                    id="usernames"
                    value={formData.twitterUsernames}
                    onChange={(e) =>
                      setFormData({ ...formData, twitterUsernames: e.target.value })
                    }
                    placeholder="elonmusk, sama, karpathy (comma separated)"
                  />
                  <p className="text-sm text-gray-500">
                    Enter Twitter usernames (without @) separated by commas
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hour">Schedule Time (Hour)</Label>
                    <Input
                      id="hour"
                      type="number"
                      min="0"
                      max="23"
                      value={formData.scheduleHour}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          scheduleHour: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-sm text-gray-500">0-23 (24-hour format)</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="window">Time Window (Hours)</Label>
                    <Input
                      id="window"
                      type="number"
                      min="1"
                      max="168"
                      value={formData.timeWindowHours}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          timeWindowHours: parseInt(e.target.value),
                        })
                      }
                    />
                    <p className="text-sm text-gray-500">How far back to fetch tweets</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Recipient Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.recipientEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, recipientEmail: e.target.value })
                    }
                    placeholder="your@email.com"
                  />
                </div>

                <div className="flex items-center gap-4 pt-4">
                  <Button onClick={handleSave} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? "Saving..." : "Save Settings"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleTestRun}
                    disabled={testLoading || formData.twitterUsernames.trim() === ""}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    {testLoading ? "Running..." : "Test Run Now"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Logs Card */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Digests</CardTitle>
                <CardDescription>History of your digest executions</CardDescription>
              </CardHeader>
              <CardContent>
                {digest.logs.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-8">
                    No digests sent yet. Click &quot;Test Run Now&quot; to send your first
                    digest.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {digest.logs.map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              log.status === "success"
                                ? "bg-green-500"
                                : log.status === "failed"
                                ? "bg-red-500"
                                : "bg-yellow-500"
                            }`}
                          />
                          <div>
                            <p className="text-sm font-medium">
                              {new Date(log.executedAt).toLocaleString("en-US", {
                                timeZone: "Asia/Jakarta",
                                year: "numeric",
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                            <p className="text-xs text-gray-500">
                              Scanned: {log.totalScanned} • Selected: {log.totalSelected}
                            </p>
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            log.status === "success"
                              ? "bg-green-100 text-green-700"
                              : log.status === "failed"
                              ? "bg-red-100 text-red-700"
                              : "bg-yellow-100 text-yellow-700"
                          }`}
                        >
                          {log.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Info Card */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Quick Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-3">
                  <Mail className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Email Delivery</p>
                    <p className="text-xs text-gray-500">
                      Digests are sent via Gmail OAuth
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Daily Schedule</p>
                    <p className="text-xs text-gray-500">
                      Runs at {formData.scheduleHour}:00 (Asia/Jakarta)
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <User className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">Twitter Accounts</p>
                    <p className="text-xs text-gray-500">
                      {formData.twitterUsernames.split(",").filter((u) => u.trim()).length}{" "}
                      accounts tracked
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-blue-900">How it works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-blue-800">
                <p>1. We fetch tweets from your specified accounts daily</p>
                <p>2. AI filters out noise and selects valuable updates</p>
                <p>3. AI formats a clean, readable digest</p>
                <p>4. The digest is sent to your email via Gmail</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}


