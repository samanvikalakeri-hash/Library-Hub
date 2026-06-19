import { useGetDashboardSummary, useGetGenreStats, useGetPopularBooks } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Users, Clock, AlertTriangle, Wallet } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useGetDashboardSummary();
  const { data: genreStats, isLoading: loadingGenres } = useGetGenreStats();
  const { data: popularBooks, isLoading: loadingPopular } = useGetPopularBooks();

  const COLORS = ['#1e40af', '#0d9488', '#b45309', '#be123c', '#4338ca'];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Overview</h1>
        <p className="text-muted-foreground mt-1">Daily statistics and alerts for the library system.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Books" 
          value={summary?.totalBooks} 
          loading={loadingSummary} 
          icon={<BookOpen className="h-4 w-4 text-muted-foreground" />} 
          subtitle={`${summary?.booksAvailable || 0} available`}
        />
        <StatCard 
          title="Active Loans" 
          value={summary?.activeLoans} 
          loading={loadingSummary} 
          icon={<Clock className="h-4 w-4 text-muted-foreground" />} 
        />
        <StatCard 
          title="Overdue Loans" 
          value={summary?.overdueLoans} 
          loading={loadingSummary} 
          icon={<AlertTriangle className="h-4 w-4 text-destructive" />} 
          valueClassName={summary?.overdueLoans ? "text-destructive" : ""}
        />
        <StatCard 
          title="Fines Owed" 
          value={summary?.totalFinesOwed ? `₹${summary.totalFinesOwed.toFixed(2)}` : "₹0.00"} 
          loading={loadingSummary} 
          icon={<Wallet className="h-4 w-4 text-muted-foreground" />} 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Popular Books</CardTitle>
            <CardDescription>Most checked out titles this month</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loadingPopular ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={popularBooks} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                  <XAxis type="number" hide />
                  <YAxis dataKey="title" type="category" width={150} tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Bar dataKey="loanCount" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle>Loans by Genre</CardTitle>
            <CardDescription>Distribution of reading interests</CardDescription>
          </CardHeader>
          <CardContent className="h-80">
            {loadingGenres ? (
              <Skeleton className="w-full h-full" />
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={genreStats}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="loanCount"
                    nameKey="genre"
                  >
                    {genreStats?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, loading, icon, subtitle, valueClassName = "" }: { 
  title: string; 
  value?: string | number; 
  loading: boolean; 
  icon: React.ReactNode;
  subtitle?: string;
  valueClassName?: string;
}) {
  return (
    <Card className="shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className={`text-3xl font-bold ${valueClassName}`}>{value || 0}</div>
        )}
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </CardContent>
    </Card>
  );
}
