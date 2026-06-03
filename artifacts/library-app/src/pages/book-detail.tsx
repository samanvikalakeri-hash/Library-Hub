import { useParams } from "wouter";
import { useGetBook, getGetBookQueryKey, useListLoans, useListReservations } from "@workspace/api-client-react";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Book as BookIcon, Hash, Library, Calendar } from "lucide-react";

export default function BookDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0", 10);
  
  const { data: book, isLoading: loadingBook } = useGetBook(id, { query: { enabled: !!id, queryKey: getGetBookQueryKey(id) } });
  
  // We can't filter by bookId natively with the given API, so we fetch all and filter client side
  // In a real scenario we'd want API support, but we'll work with what's provided
  const { data: allLoans, isLoading: loadingLoans } = useListLoans();
  const { data: allReservations, isLoading: loadingReservations } = useListReservations();
  
  const bookLoans = allLoans?.filter(l => l.bookId === id) || [];
  const activeLoans = bookLoans.filter(l => l.status === "active" || l.status === "overdue");
  const pastLoans = bookLoans.filter(l => l.status === "returned");
  const bookReservations = allReservations?.filter(r => r.bookId === id && r.status === "pending") || [];

  if (loadingBook) {
    return (
      <div className="p-8 max-w-5xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64 mb-2" />
        <Skeleton className="h-6 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <div className="col-span-2 space-y-4">
            <Skeleton className="h-40 w-full" />
            <Skeleton className="h-60 w-full" />
          </div>
          <Skeleton className="h-80 w-full" />
        </div>
      </div>
    );
  }

  if (!book) return <div className="p-8">Book not found.</div>;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">{book.title}</h1>
          {book.availableCopies > 0 ? (
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 text-sm">
              {book.availableCopies} Available
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400 text-sm">
              Checked Out
            </Badge>
          )}
        </div>
        <p className="text-xl text-muted-foreground mt-2">by {book.author}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="col-span-1 md:col-span-2 space-y-8">
          <section>
            <h2 className="text-xl font-semibold mb-4">About this book</h2>
            <p className="text-muted-foreground leading-relaxed">
              {book.description || "No description provided for this book."}
            </p>
            
            <div className="grid grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>ISBN: <span className="font-medium text-foreground">{book.isbn}</span></span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <BookIcon className="h-4 w-4" />
                <span>Genre: <span className="font-medium text-foreground">{book.genre}</span></span>
              </div>
              {book.publisher && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Library className="h-4 w-4" />
                  <span>Publisher: <span className="font-medium text-foreground">{book.publisher}</span></span>
                </div>
              )}
              {book.publishedYear && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>Published: <span className="font-medium text-foreground">{book.publishedYear}</span></span>
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-4 border-b pb-2">Active Loans</h2>
            <div className="border rounded-md bg-card">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Checked Out</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingLoans ? (
                    <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                  ) : activeLoans.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No active loans.</TableCell></TableRow>
                  ) : (
                    activeLoans.map(loan => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{loan.studentName}</TableCell>
                        <TableCell>{format(new Date(loan.checkedOutAt), 'MMM d, yyyy')}</TableCell>
                        <TableCell>{format(new Date(loan.dueDate), 'MMM d, yyyy')}</TableCell>
                        <TableCell>
                          <Badge variant={loan.status === 'overdue' ? 'destructive' : 'default'}>
                            {loan.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>

        <div className="col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Total Copies</span>
                <span className="font-medium text-lg">{book.totalCopies}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b">
                <span className="text-muted-foreground">Available</span>
                <span className="font-medium text-lg">{book.availableCopies}</span>
              </div>
              <div className="flex justify-between items-center py-2">
                <span className="text-muted-foreground">Checked Out</span>
                <span className="font-medium text-lg">{book.totalCopies - book.availableCopies}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Pending Reservations</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingReservations ? (
                <Skeleton className="h-10 w-full" />
              ) : bookReservations.length === 0 ? (
                <p className="text-muted-foreground text-sm">No pending reservations.</p>
              ) : (
                <ul className="space-y-3">
                  {bookReservations.map(res => (
                    <li key={res.id} className="flex justify-between items-center text-sm">
                      <span className="font-medium">{res.studentName}</span>
                      <span className="text-muted-foreground">{format(new Date(res.createdAt), 'MMM d')}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
