import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Library, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { login } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();

  const [librarianUsername, setLibrarianUsername] = useState("librarian");
  const [librarianPassword, setLibrarianPassword] = useState("");
  const [studentId, setStudentId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLibrarianLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login({ role: "librarian", username: librarianUsername, password: librarianPassword });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentId.trim()) {
      toast({ title: "Enter your Student ID", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await login({ role: "student", studentId: studentId.trim() });
      navigate("/my-account");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center">
            <div className="h-14 w-14 rounded-2xl bg-teal-600 flex items-center justify-center shadow-lg">
              <Library className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Alexandria</h1>
          <p className="text-gray-500 text-sm">School Library Management System</p>
        </div>

        <Card className="shadow-xl border-0">
          <CardHeader className="pb-2">
            <CardTitle className="text-xl text-center">Welcome back</CardTitle>
            <CardDescription className="text-center">Select your account type to sign in</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="librarian">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="librarian">Librarian</TabsTrigger>
                <TabsTrigger value="student">Student</TabsTrigger>
              </TabsList>

              <TabsContent value="librarian">
                <form onSubmit={handleLibrarianLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="lib-username">Username</Label>
                    <Input
                      id="lib-username"
                      value={librarianUsername}
                      onChange={(e) => setLibrarianUsername(e.target.value)}
                      placeholder="librarian"
                      autoComplete="username"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="lib-password">Password</Label>
                    <Input
                      id="lib-password"
                      type="password"
                      value={librarianPassword}
                      onChange={(e) => setLibrarianPassword(e.target.value)}
                      placeholder="Enter password"
                      autoComplete="current-password"
                    />
                  </div>
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in as Librarian
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">Default: librarian / library123</p>
                </form>
              </TabsContent>

              <TabsContent value="student">
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="student-id">Student ID</Label>
                    <Input
                      id="student-id"
                      value={studentId}
                      onChange={(e) => setStudentId(e.target.value)}
                      placeholder="e.g. STU-2024-001"
                      autoComplete="username"
                    />
                    <p className="text-xs text-muted-foreground">Use your assigned student ID to sign in</p>
                  </div>
                  <Button type="submit" className="w-full bg-teal-600 hover:bg-teal-700" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Sign in as Student
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
