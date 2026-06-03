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
import { useToast } from "@/hooks/use-toast";
import { Check, X } from "lucide-react";

export default function Reservations() {
  const [status, setStatus] = useState<string>("pending");
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  const apiStatus = status === "all" ? undefined : (status as any);
  const { data: reservations, isLoading } = useListReservations({ status: apiStatus });
  const updateReservation = useUpdateReservation();

  const handleUpdate = (id: number, newStatus: 'fulfilled' | 'cancelled') => {
    updateReservation.mutate({ id, data: { status: newStatus } }, {
      onSuccess: () => {
        toast({ title: `Reservation ${newStatus}` });
        queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
      }
    });
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
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
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
                    <Badge variant={res.status === 'pending' ? 'secondary' : res.status === 'fulfilled' ? 'default' : 'outline'}>
                      {res.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    {res.status === 'pending' && (
                      <div className="flex justify-end gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="h-8"
                          disabled={updateReservation.isPending}
                          onClick={() => handleUpdate(res.id, 'fulfilled')}
                        >
                          <Check className="h-3.5 w-3.5 mr-1" /> Fulfill
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-muted-foreground hover:text-destructive"
                          disabled={updateReservation.isPending}
                          onClick={() => handleUpdate(res.id, 'cancelled')}
                        >
                          <X className="h-3.5 w-3.5" />
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
    </div>
  );
}
