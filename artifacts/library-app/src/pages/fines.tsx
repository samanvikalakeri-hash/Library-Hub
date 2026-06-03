import { useListFines, useClearFine, getListFinesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle2 } from "lucide-react";

export default function Fines() {
  const [status, setStatus] = useState<string>("unpaid");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const isPaid = status === "all" ? undefined : status === "paid";
  const { data: fines, isLoading } = useListFines({ paid: isPaid });
  const clearFine = useClearFine();

  const handleClear = (id: number) => {
    clearFine.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Fine marked as paid" });
        queryClient.invalidateQueries({ queryKey: getListFinesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
      }
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Fines Tracker</h1>
          <p className="text-muted-foreground mt-1">Manage and collect overdue payments.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Fines</SelectItem>
              <SelectItem value="unpaid">Unpaid Only</SelectItem>
              <SelectItem value="paid">Paid Only</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Book</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Date Assessed</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="h-6 w-16 mx-auto rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : fines?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No fines found.
                </TableCell>
              </TableRow>
            ) : (
              fines?.map((fine) => (
                <TableRow key={fine.id}>
                  <TableCell className="font-medium">
                    <Link href={`/students/${fine.studentId}`} className="hover:underline">{fine.studentName}</Link>
                  </TableCell>
                  <TableCell>
                    <Link href={`/books/${fine.loanId}`} className="hover:underline truncate max-w-[200px] block" title={fine.bookTitle || ''}>
                      {fine.bookTitle}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fine.reason}</TableCell>
                  <TableCell>{format(new Date(fine.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right font-bold">${fine.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    {fine.paid ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Paid</Badge>
                    ) : (
                      <Badge variant="destructive">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {!fine.paid && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-900/30"
                        disabled={clearFine.isPending}
                        onClick={() => handleClear(fine.id)}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" /> Mark Paid
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
