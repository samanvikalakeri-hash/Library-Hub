import { useListReservations, useUpdateReservation, getListReservationsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

type PendingAction = {
  id: number;
  action: "fulfilled" | "cancelled";
  bookTitle: string;
  studentName: string;
};

export default function Reservations() {
  const [status, setStatus] = useState<string>("pending");
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const apiStatus = status === "all" ? undefined : (status as any);
  const { data: reservations, isLoading } = useListReservations({ status: apiStatus });
  const updateReservation = useUpdateReservation();

  const confirmAction = () => {
    if (!pendingAction) return;
    updateReservation.mutate(
      { id: pendingAction.id, data: { status: pendingAction.action } },
      {
        onSuccess: () => {
          const label = pendingAction.action === "fulfilled" ? "Fulfilled" : "Denied";
          toast({ title: `Reservation ${label}` });
          queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
          setPendingAction(null);
        },
        onError: () => {
          toast({ title: "Action failed", variant: "destructive" });
          setPendingAction(null);
        },
      }
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Reservations</h1>
          <p className="text-muted-foreground mt-1">Manage book requests and waitlists.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Book</TableHead>
              <TableHead>Student</TableHead>
              <TableHead>Date Requested</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-32 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : reservations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  No reservations found.
                </TableCell>
              </TableRow>
            ) : (
              reservations?.map((res) => (
                <TableRow key={res.id}>
                  <TableCell className="font-medium">
                    <Link href={`/books/${res.bookId}`} className="hover:underline">{res.bookTitle}</Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/students/${res.studentId}`} className="hover:underline">{res.studentName}</Link>
                  </TableCell>
                  <TableCell>{format(new Date(res.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        res.status === 'pending' ? 'secondary'
                          : res.status === 'fulfilled' ? 'default'
                          : 'outline'
                      }
                    >
                      {res.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {res.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                          disabled={updateReservation.isPending}
                          onClick={() => setPendingAction({
                            id: res.id,
                            action: 'fulfilled',
                            bookTitle: res.bookTitle ?? 'Book',
                            studentName: res.studentName ?? 'Student',
                          })}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Fulfill
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-red-200 text-red-600 hover:bg-red-50"
                          disabled={updateReservation.isPending}
                          onClick={() => setPendingAction({
                            id: res.id,
                            action: 'cancelled',
                            bookTitle: res.bookTitle ?? 'Book',
                            studentName: res.studentName ?? 'Student',
                          })}
                        >
                          <X className="h-3.5 w-3.5 mr-1" /> Deny
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!pendingAction} onOpenChange={(v) => { if (!v) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingAction?.action === 'fulfilled' ? 'Fulfill Reservation?' : 'Deny Reservation?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAction?.action === 'fulfilled' ? (
                <>
                  Mark the reservation for <span className="font-semibold">"{pendingAction?.bookTitle}"</span> by{" "}
                  <span className="font-semibold">{pendingAction?.studentName}</span> as fulfilled? This means the book has been handed to the student.
                </>
              ) : (
                <>
                  Deny <span className="font-semibold">{pendingAction?.studentName}</span>'s reservation for{" "}
                  <span className="font-semibold">"{pendingAction?.bookTitle}"</span>? The request will be cancelled.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmAction}
              disabled={updateReservation.isPending}
              className={
                pendingAction?.action === 'cancelled'
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  : ""
              }
            >
              {updateReservation.isPending
                ? "Processing…"
                : pendingAction?.action === 'fulfilled'
                  ? "Yes, Fulfill"
                  : "Yes, Deny"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
