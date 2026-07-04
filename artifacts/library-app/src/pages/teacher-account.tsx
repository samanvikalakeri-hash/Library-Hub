import { useAuth } from "@/lib/auth-context";
import { useListLoans, getListLoansQueryKey, useReturnLoan } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, CheckCircle2, User } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    overdue: "bg-red-100 text-red-800",
    returned: "bg-gray-100 text-gray-700",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function TeacherAccount() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const teacherRecordId = user?.teacherRecordId ?? undefined;

  const { data: loans, isLoading: loansLoading } = useListLoans({ teacherId: teacherRecordId });
  const returnLoan = useReturnLoan();

  const activeLoans = loans?.filter((l) => l.status === "active" || l.status === "overdue") ?? [];
  const pastLoans = loans?.filter((l) => l.status === "returned") ?? [];

  const handleReturn = (loanId: number, bookTitle: string) => {
    returnLoan.mutate({ id: loanId }, {
      onSuccess: () => {
        toast({ title: "Book returned", description: `"${bookTitle}" marked as returned.` });
        queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
      },
      onError: () => toast({ title: "Failed to return book", variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center">
          <User className="h-7 w-7 text-blue-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{user?.name}</h1>
          <p className="text-muted-foreground text-sm">Teacher Account</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <BookOpen className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{activeLoans.length}</p>
            <p className="text-xs text-muted-foreground">Books Borrowed</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{pastLoans.length}</p>
            <p className="text-xs text-muted-foreground">Books Returned</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="borrowed">
        <TabsList>
          <TabsTrigger value="borrowed">Currently Borrowed</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="borrowed">
          <Card>
            <CardHeader><CardTitle className="text-base">Active Loans</CardTitle></CardHeader>
            <CardContent>
              {loansLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : activeLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No active loans</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Checked Out</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <p className="font-medium">{loan.bookTitle ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{loan.bookAuthor}</p>
                        </TableCell>
                        <TableCell className="text-sm">{format(new Date(loan.checkedOutAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-sm font-medium">
                          <span className={loan.status === "overdue" ? "text-red-600" : ""}>
                            {format(new Date(loan.dueDate), "MMM d, yyyy")}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <StatusBadge status={loan.status} />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader><CardTitle className="text-base">Borrowing History</CardTitle></CardHeader>
            <CardContent>
              {loansLoading ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : pastLoans.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No borrowing history yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Checked Out</TableHead>
                      <TableHead>Returned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pastLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell>
                          <p className="font-medium">{loan.bookTitle ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{loan.bookAuthor}</p>
                        </TableCell>
                        <TableCell className="text-sm">{format(new Date(loan.checkedOutAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {loan.returnedAt ? format(new Date(loan.returnedAt), "MMM d, yyyy") : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
