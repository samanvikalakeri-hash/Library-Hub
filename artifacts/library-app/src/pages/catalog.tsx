import { useState } from "react";
import { useListBooks, useCreateReservation, getListReservationsQueryKey } from "@workspace/api-client-react";
import { useDebounce } from "@/hooks/use-debounce";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { Search, Library, BookOpen, Hash, User } from "lucide-react";

export default function Catalog() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: books, isLoading } = useListBooks({ search: debouncedSearch });
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-muted/10">
      <header className="bg-primary text-primary-foreground py-12 px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6">
          <Library className="h-12 w-12 mx-auto opacity-80" />
          <h1 className="text-4xl font-bold tracking-tight">Student Catalog</h1>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto text-lg">
            Search our collection of books, check availability, and place reservations.
          </p>
          {user && (
            <div className="flex items-center justify-center gap-2 text-primary-foreground/70 text-sm">
              <User className="h-4 w-4" />
              Browsing as <span className="font-semibold text-primary-foreground">{user.name}</span>
            </div>
          )}
          <div className="max-w-xl mx-auto relative mt-8">
            <Search className="absolute left-4 top-3.5 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search by title, author, or genre..."
              className="pl-12 h-12 text-lg bg-card text-foreground rounded-full shadow-lg border-0 focus-visible:ring-2 focus-visible:ring-primary-foreground/20"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-8 py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <div className="h-48 bg-muted animate-pulse" />
                <CardContent className="p-6 space-y-3">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/4 mt-4" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : books?.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <h3 className="text-xl font-medium text-foreground">No books found</h3>
            <p>Try adjusting your search terms.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {books?.map((book) => (
              <BookCard key={book.id} book={book} studentId={user?.studentRecordId ?? null} studentName={user?.name ?? "You"} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function BookCard({
  book,
  studentId,
  studentName,
}: {
  book: any;
  studentId: number | null | undefined;
  studentName: string;
}) {
  const isAvailable = book.availableCopies > 0;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const createReservation = useCreateReservation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleConfirmReserve = () => {
    if (!studentId) {
      toast({ title: "Cannot reserve", description: "No student account linked.", variant: "destructive" });
      return;
    }
    createReservation.mutate(
      { data: { studentId, bookId: book.id } },
      {
        onSuccess: () => {
          toast({
            title: "Reservation placed!",
            description: `"${book.title}" has been reserved for ${studentName}.`,
          });
          queryClient.invalidateQueries({ queryKey: getListReservationsQueryKey() });
          setConfirmOpen(false);
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "Could not place reservation. You may already have one for this book.";
          toast({ title: "Reservation failed", description: msg, variant: "destructive" });
          setConfirmOpen(false);
        },
      }
    );
  };

  return (
    <>
      <Card className="flex flex-col h-full overflow-hidden hover:shadow-md transition-shadow duration-200">
        <div className="h-32 bg-sidebar-primary/10 flex items-center justify-center p-4 relative">
          <BookOpen className="h-16 w-16 text-sidebar-primary/20" />
          <Badge
            className={`absolute top-4 right-4 ${
              isAvailable
                ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                : "bg-rose-100 text-rose-800 hover:bg-rose-100"
            }`}
            variant="secondary"
          >
            {isAvailable ? "Available" : "Checked Out"}
          </Badge>
        </div>
        <CardContent className="p-6 flex-1 flex flex-col">
          <div className="mb-2">
            <Badge variant="outline" className="text-xs mb-2">{book.genre}</Badge>
            <h3 className="font-bold text-xl leading-tight line-clamp-2">{book.title}</h3>
            <p className="text-muted-foreground mt-1">{book.author}</p>
          </div>
          <div className="mt-auto pt-6 space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5" /> ISBN: {book.isbn}
            </div>
            <div className="flex items-center gap-2">
              <Library className="h-3.5 w-3.5" /> {book.availableCopies} of {book.totalCopies} copies available
            </div>
          </div>
        </CardContent>
        <CardFooter className="p-6 pt-0">
          <Button
            className="w-full"
            variant={isAvailable ? "default" : "secondary"}
            disabled={createReservation.isPending}
            onClick={() => setConfirmOpen(true)}
          >
            {isAvailable ? "Reserve Copy" : "Join Waitlist"}
          </Button>
        </CardFooter>
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Reservation</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  You are about to {isAvailable ? "reserve a copy of" : "join the waitlist for"}:
                </p>
                <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-1">
                  <p className="font-semibold text-foreground">{book.title}</p>
                  <p className="text-sm text-muted-foreground">by {book.author}</p>
                  <p className="text-xs text-muted-foreground">ISBN: {book.isbn}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-foreground">
                  <User className="h-4 w-4 text-muted-foreground" />
                  Reserved for: <span className="font-semibold">{studentName}</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmReserve}
              disabled={createReservation.isPending}
            >
              {createReservation.isPending ? "Placing…" : "Confirm Reservation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
