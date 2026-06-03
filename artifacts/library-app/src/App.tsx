import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { SidebarLayout } from "@/components/layout/sidebar-layout";

import Dashboard from "@/pages/dashboard";
import Books from "@/pages/books";
import BookDetail from "@/pages/book-detail";
import Students from "@/pages/students";
import StudentDetail from "@/pages/student-detail";
import Loans from "@/pages/loans";
import Reservations from "@/pages/reservations";
import Fines from "@/pages/fines";
import Catalog from "@/pages/catalog";

const queryClient = new QueryClient();

function Router() {
  return (
    <Switch>
      <Route path="/catalog">
        <Catalog />
      </Route>
      <Route>
        <SidebarLayout>
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/books" component={Books} />
            <Route path="/books/:id" component={BookDetail} />
            <Route path="/students" component={Students} />
            <Route path="/students/:id" component={StudentDetail} />
            <Route path="/loans" component={Loans} />
            <Route path="/reservations" component={Reservations} />
            <Route path="/fines" component={Fines} />
            <Route component={NotFound} />
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
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
