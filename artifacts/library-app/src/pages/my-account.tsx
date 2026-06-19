import { useAuth } from "@/lib/auth-context";
import { useListLoans, useListFines, useListReservations, useReturnLoan, useDeleteReservation, getListLoansQueryKey, getListReservationsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { BookOpen, Clock, AlertTriangle, User, CheckCircle2, XCircle } from "lucide-react";

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    overdue: "bg-red-100 text-red-800",
    returned: "bg-gray-100 text-gray-700",
    pending: "bg-amber-100 text-amber-800",
    fulfilled: "bg-teal-100 text-teal-800",
    cancelled: "bg-gray-100 text-gray-500",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[status] ?? "bg-gray-100 text-gray-700"}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function MyAccount() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const studentRecordId = user?.studentRecordId ?? undefined;

  const { data: loans, isLoading: loansLoading } = useListLoans({ studentId: studentRecordId });
  const { data: fines, isLoading: finesLoading } = useListFines({ studentId: studentRecordId });
  const { data: reservations, isLoading: reservationsLoading } = useListReservations({ studentId: studentRecordId });
  const cancelReservation = useDeleteReservation();

  const activeLoans = loans?.filter((l) => l.status === "active" || l.status === "overdue") ?? [];
  const pastLoans = loans?.filter((l) => l.status === "returned") ?? [];
  const unpaidFines = fines?.filter((f) => !f.paid) ?? [];
  const totalOwed = unpaidFines.reduce((sum, f) => sum + Number(f.amount), 0);
  const activeReservations = reservations?.filter((r) => r.status === "pending") ?? [];

  const handleCancelReservation = (id: number) => {
    cancelReservation.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Reservation cancelled" });
        queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
      },
      onError: () => toast({ title: "Could not cancel", variant: "destructive" }),
    });
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-14 w-14 rounded-full bg-teal-100 flex items-center justify-center">
          <User className="h-7 w-7 text-teal-700" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{user?.name}</h1>
          <p className="text-muted-foreground text-sm">Student Account</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <BookOpen className="h-6 w-6 text-teal-600 mx-auto mb-1" />
            <p className="text-2xl font-bold">{activeLoans.length}</p>
            <p className="text-xs text-muted-foreground">Books Borrowed</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <Clock className="h-6 w-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold">{activeReservations.length}</p>
            <p className="text-xs text-muted-foreground">Reservations</p>
          </CardContent>
        </Card>
        <Card className="text-center">
          <CardContent className="pt-6 pb-4">
            <AlertTriangle className="h-6 w-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-red-600">₹{totalOwed.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground">Fines Owed</p>
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
          <TabsTrigger value="reservations">Reservations</TabsTrigger>
          <TabsTrigger value="fines">Fines</TabsTrigger>
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
                        <TableCell><StatusBadge status={loan.status} /></TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reservations">
          <Card>
            <CardHeader><CardTitle className="text-base">My Reservations</CardTitle></CardHeader>
            <CardContent>
              {reservationsLoading ? (
                <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : activeReservations.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No pending reservations</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Reserved On</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeReservations.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <p className="font-medium">{r.bookTitle ?? "—"}</p>
                          <p className="text-xs text-muted-foreground">{r.bookAuthor}</p>
                        </TableCell>
                        <TableCell className="text-sm">{format(new Date(r.createdAt), "MMM d, yyyy")}</TableCell>
                        <TableCell><StatusBadge status={r.status} /></TableCell>
                        <TableCell>
                          <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-700"
                            onClick={() => handleCancelReservation(r.id)}>
                            Cancel
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="fines">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex justify-between items-center">
                <span>My Fines</span>
                {totalOwed > 0 && (
                  <span className="text-red-600 font-bold">Total: ₹{totalOwed.toFixed(2)}</span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {finesLoading ? (
                <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (fines ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No fines — keep it up!</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(fines ?? []).map((fine) => (
                      <TableRow key={fine.id}>
                        <TableCell className="font-medium">{fine.bookTitle ?? "—"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{fine.reason}</TableCell>
                        <TableCell className="font-medium text-red-600">₹{Number(fine.amount).toFixed(2)}</TableCell>
                        <TableCell>
                          {fine.paid ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                              <CheckCircle2 className="h-3 w-3" /> Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-xs text-red-600 font-medium">
                              <XCircle className="h-3 w-3" /> Unpaid
                            </span>
                          )}
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
