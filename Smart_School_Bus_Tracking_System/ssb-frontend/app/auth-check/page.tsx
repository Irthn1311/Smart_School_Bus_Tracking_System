"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { socketService } from "@/lib/socket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";

type AuthCheckResult = {
  test: string;
  status: "pass" | "fail" | "loading";
  message?: string;
  data?: any;
};

export default function AuthCheckPage() {
  const { user, loading: authLoading } = useAuth();
  const [results, setResults] = useState<AuthCheckResult[]>([]);
  const [socketConnected, setSocketConnected] = useState(false);
  const [socketHello, setSocketHello] = useState<any>(null);
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      // Auto connect socket if not connected
      const token = typeof window !== "undefined" ? localStorage.getItem("ssb_token") : null;
      if (token && !socketService.isConnected()) {
        socketService.connect(token).catch((e) => {
          console.warn("Socket connect failed:", e);
        });
      }
    }
  }, [user, authLoading]);

  useEffect(() => {
    if (!socketService.getSocket()) return;

    const socket = socketService.getSocket()!;

    const handleConnect = () => {
      setSocketConnected(true);
      addResult({
        test: "Socket Connection",
        status: "pass",
        message: "Socket.IO connected successfully",
      });
    };

    const handleDisconnect = () => {
      setSocketConnected(false);
      addResult({
        test: "Socket Connection",
        status: "fail",
        message: "Socket.IO disconnected",
      });
    };

    const handleHello = (data: any) => {
      setSocketHello(data);
      addResult({
        test: "Socket auth/hello Event",
        status: "pass",
        message: "Received auth/hello event from server",
        data,
      });
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.on("auth/hello", handleHello);

    // Check initial connection state
    if (socket.connected) {
      setSocketConnected(true);
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.off("auth/hello", handleHello);
    };
  }, [user]);

  const addResult = (result: AuthCheckResult) => {
    setResults((prev) => {
      const existing = prev.findIndex((r) => r.test === result.test);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = result;
        return updated;
      }
      return [...prev, result];
    });
  };

  const testProfile = async () => {
    addResult({
      test: "GET /auth/profile",
      status: "loading",
    });

    try {
      const response = await api.get("/auth/profile");
      if (response.success && response.data) {
        addResult({
          test: "GET /auth/profile",
          status: "pass",
          message: "Profile retrieved successfully",
          data: response.data,
        });
      } else {
        addResult({
          test: "GET /auth/profile",
          status: "fail",
          message: response.message || "Failed to get profile",
        });
      }
    } catch (error: any) {
      addResult({
        test: "GET /auth/profile",
        status: "fail",
        message: error.message || "Request failed",
      });
    }
  };

  const testSocketHello = () => {
    if (!socketService.isConnected()) {
      addResult({
        test: "Socket auth/hello Event",
        status: "fail",
        message: "Socket not connected",
      });
      return;
    }

    addResult({
      test: "Socket auth/hello Event",
      status: "loading",
      message: "Sending auth/hello...",
    });

    const socket = socketService.getSocket();
    if (socket) {
      socket.emit("auth/hello");
      // Response will be handled by useEffect listener
    }
  };

  const runAllTests = async () => {
    setTesting(true);
    setResults([]);

    // Test 1: Profile API
    await testProfile();

    // Test 2: Socket connection
    if (socketService.isConnected()) {
      addResult({
        test: "Socket Connection",
        status: "pass",
        message: "Socket.IO is connected",
      });
    } else {
      addResult({
        test: "Socket Connection",
        status: "fail",
        message: "Socket.IO is not connected",
      });
    }

    // Test 3: Socket hello
    testSocketHello();

    setTesting(false);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Not Authenticated</CardTitle>
            <CardDescription>Please login first</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => (window.location.href = "/login")} className="w-full">
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>M0 Auth & Guard Test Page</CardTitle>
            <CardDescription>
              Test authentication, API calls, and Socket.IO connection
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* User Info */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-semibold mb-2">Current User</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <strong>Name:</strong> {user.name || "N/A"}
                </p>
                <p>
                  <strong>Email:</strong> {user.email || "N/A"}
                </p>
                <p>
                  <strong>Role:</strong>{" "}
                  <Badge variant="outline">{user.role || "N/A"}</Badge>
                </p>
              </div>
            </div>

            {/* Socket Status */}
            <div className="p-4 bg-green-50 rounded-lg">
              <h3 className="font-semibold mb-2">Socket.IO Status</h3>
              <div className="flex items-center gap-2">
                {socketConnected ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="text-sm">Connected</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="text-sm">Disconnected</span>
                  </>
                )}
              </div>
              {socketHello && (
                <div className="mt-2 p-2 bg-white rounded text-xs">
                  <strong>Last auth/hello:</strong>
                  <pre className="mt-1 overflow-auto">
                    {JSON.stringify(socketHello, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            {/* Test Buttons */}
            <div className="flex gap-2">
              <Button onClick={testProfile} disabled={testing}>
                Test Profile API
              </Button>
              <Button onClick={testSocketHello} disabled={testing || !socketConnected}>
                Test Socket Hello
              </Button>
              <Button onClick={runAllTests} disabled={testing} variant="default">
                Run All Tests
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Test Results */}
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-muted-foreground text-sm">No tests run yet</p>
            ) : (
              <div className="space-y-2">
                {results.map((result, idx) => (
                  <div
                    key={idx}
                    className="p-3 border rounded-lg flex items-start gap-3"
                  >
                    {result.status === "pass" && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    )}
                    {result.status === "fail" && (
                      <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    )}
                    {result.status === "loading" && (
                      <Loader2 className="w-5 h-5 text-blue-600 animate-spin flex-shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p className="font-medium">{result.test}</p>
                      {result.message && (
                        <p className="text-sm text-muted-foreground">{result.message}</p>
                      )}
                      {result.data && (
                        <details className="mt-2">
                          <summary className="text-xs text-muted-foreground cursor-pointer">
                            View data
                          </summary>
                          <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-auto">
                            {JSON.stringify(result.data, null, 2)}
                          </pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

