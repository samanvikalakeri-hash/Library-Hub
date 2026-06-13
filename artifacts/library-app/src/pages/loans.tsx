import { useListLoans, useReturnLoan, getListLoansQueryKey, getGetDashboardSummaryQueryKey, getGetStudentQueryKey, getGetBookQueryKey } from "@workspace/api-client-react";
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
import { Undo2 } from "lucide-react";

export default function Loans() {
  const [status, setStatus] = useState<string>("all");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  // API accepts 'active', 'returned', 'overdue'. We map 'all' to undefined.
  const apiStatus = status === "all" ? undefined : (status as any);
  const { data: loans, isLoading } = useListLoans({ status: apiStatus });
  const returnLoan = useReturnLoan();

  const handleReturn = (id: number, studentId: number, bookId: number) => {
    returnLoan.mutate({ id }, {
      onSuccess: () => {
        toast({ title: "Book marked as returned" });
        queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(studentId) });
        queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
      }
    });
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Transaction Details</h1>
          <p className="text-muted-foreground mt-1">Track checkouts and returns.</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-[180px] bg-card">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Loans</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="returned">Returned</SelectItem>
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
              <TableHead>Checked Out</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : loans?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  No loans found.
                </TableCell>
              </TableRow>
            ) : (
              loans?.map((loan) => (
                <TableRow key={loan.id}>
                  <TableCell className="font-medium">
                    <Link href={`/books/${loan.bookId}`} className="hover:underline">{loan.bookTitle}</Link>
                    <p className="text-xs text-muted-foreground font-normal">{loan.bookAuthor}</p>
                  </TableCell>
                  <TableCell>
                    <Link href={`/students/${loan.studentId}`} className="hover:underline">{loan.studentName}</Link>
                  </TableCell>
                  <TableCell>{format(new Date(loan.checkedOutAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell>{format(new Date(loan.dueDate), 'MMM d, yyyy')}</TableCell>
                  <TableCell>
                    <Badge 
                      variant={loan.status === 'overdue' ? 'destructive' : loan.status === 'active' ? 'default' : 'secondary'}
                      className={loan.status === 'returned' ? "bg-muted text-muted-foreground" : ""}
                    >
                      {loan.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {loan.status !== 'returned' && (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        disabled={returnLoan.isPending}
                        onClick={() => handleReturn(loan.id, loan.studentId, loan.bookId)}
                      >
                        <Undo2 className="h-3.5 w-3.5 mr-1" /> Return
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
