import { Switch, Route, Router as WouterRouter, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/lib/auth-context";
import NotFound from "@/pages/not-found";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import Books from "@/pages/books";
import BookDetail from "@/pages/book-detail";
import Students from "@/pages/students";
import StudentDetail from "@/pages/student-detail";
import Loans from "@/pages/loans";
import Reservations from "@/pages/reservations";
import Fines from "@/pages/fines";
import Catalog from "@/pages/catalog";
import MyAccount from "@/pages/my-account";
import { Loader2 } from "lucide-react";

const queryClient = new QueryClient();

function LoadingScreen() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 via-white to-teal-50">
      <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
    </div>
  );
}

function Router() {
  const { user, loading } = useAuth();
  const [location] = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route>
          <Redirect to="/login" />
        </Route>
      </Switch>
    );
  }

  const isLibrarian = user.role === "librarian";

  return (
    <Switch>
      <Route path="/login">
        <Redirect to={isLibrarian ? "/" : "/my-account"} />
      </Route>
      <Route>
        <SidebarLayout>
          <Switch>
            {isLibrarian && <Route path="/" component={Dashboard} />}
            {isLibrarian && <Route path="/books" component={Books} />}
            {isLibrarian && <Route path="/books/:id" component={BookDetail} />}
            {isLibrarian && <Route path="/students" component={Students} />}
            {isLibrarian && <Route path="/students/:id" component={StudentDetail} />}
            {isLibrarian && <Route path="/loans" component={Loans} />}
            {isLibrarian && <Route path="/fines" component={Fines} />}
            <Route path="/reservations" component={Reservations} />
            <Route path="/catalog" component={Catalog} />
            <Route path="/my-account" component={MyAccount} />
            <Route>
              {isLibrarian ? <NotFound /> : <Redirect to="/my-account" />}
            </Route>
          </Switch>
        </SidebarLayout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
