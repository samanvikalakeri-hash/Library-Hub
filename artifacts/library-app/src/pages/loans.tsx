import {
  useListLoans, useReturnLoan, useCreateLoan, useListStudents, useListBooks,
  getListLoansQueryKey, getGetDashboardSummaryQueryKey, getGetStudentQueryKey, getGetBookQueryKey, getListBooksQueryKey,
} from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format, addDays, addWeeks, addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useToast } from "@/hooks/use-toast";
import { Undo2, BookPlus, ChevronsUpDown, Check, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

type PendingReturn = { id: number; studentId: number; bookId: number; bookTitle: string; studentName: string };

const DUE_DATE_OPTIONS = [
  { label: "1 Week", getValue: () => addWeeks(new Date(), 1) },
  { label: "2 Weeks", getValue: () => addWeeks(new Date(), 2) },
  { label: "1 Month", getValue: () => addMonths(new Date(), 1) },
];

export default function Loans() {
  const [status, setStatus] = useState<string>("all");
  const [pendingReturn, setPendingReturn] = useState<PendingReturn | null>(null);
  const [lendOpen, setLendOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const apiStatus = status === "all" ? undefined : (status as any);
  const { data: loans, isLoading } = useListLoans({ status: apiStatus });
  const returnLoan = useReturnLoan();

  const confirmReturn = () => {
    if (!pendingReturn) return;
    const { id, studentId, bookId, bookTitle } = pendingReturn;
    returnLoan.mutate({ id }, {
      onSuccess: () => {
        toast({ title: `"${bookTitle}" marked as returned` });
        queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStudentQueryKey(studentId) });
        queryClient.invalidateQueries({ queryKey: getGetBookQueryKey(bookId) });
        setPendingReturn(null);
      },
      onError: () => {
        toast({ title: "Failed to return book", variant: "destructive" });
        setPendingReturn(null);
      },
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
          <Button onClick={() => setLendOpen(true)}>
            <BookPlus className="mr-2 h-4 w-4" /> Lend Book
          </Button>
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
              <TableHead>Returned</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : loans?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
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
                  <TableCell className="text-sm">{format(new Date(loan.checkedOutAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-sm">
                    <span className={loan.status === 'overdue' ? 'text-red-600 font-semibold' : ''}>
                      {format(new Date(loan.dueDate), 'MMM d, yyyy')}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {loan.returnedAt
                      ? format(new Date(loan.returnedAt), 'MMM d, yyyy')
                      : <span className="text-muted-foreground/50">—</span>}
                  </TableCell>
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
                        onClick={() => setPendingReturn({
                          id: loan.id,
                          studentId: loan.studentId,
                          bookId: loan.bookId,
                          bookTitle: loan.bookTitle ?? 'Book',
                          studentName: loan.studentName ?? 'Student',
                        })}
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

      {/* Return confirmation */}
      <AlertDialog open={!!pendingReturn} onOpenChange={(v) => { if (!v) setPendingReturn(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Book Return</AlertDialogTitle>
            <AlertDialogDescription>
              Mark <span className="font-semibold">"{pendingReturn?.bookTitle}"</span> as returned by{" "}
              <span className="font-semibold">{pendingReturn?.studentName}</span>? This will free up a copy for other students.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmReturn} disabled={returnLoan.isPending}>
              {returnLoan.isPending ? "Processing…" : "Confirm Return"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Lend Book dialog */}
      <LendBookDialog
        open={lendOpen}
        onOpenChange={setLendOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
        }}
      />
    </div>
  );
}

function LendBookDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const { data: students } = useListStudents();
  const { data: books } = useListBooks({ available: true });
  const createLoan = useCreateLoan();
  const { toast } = useToast();

  // Student picker
  const [studentPopOpen, setStudentPopOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  // Book picker
  const [bookPopOpen, setBookPopOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  // Due date
  const [dueDateOption, setDueDateOption] = useState<string>("");

  const selectedStudent = students?.find((s) => s.id === selectedStudentId);
  const selectedBook = books?.find((b) => b.id === selectedBookId);
  const dueDateValue = DUE_DATE_OPTIONS.find((o) => o.label === dueDateOption)?.getValue();

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return (students ?? []).filter(
      (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const filteredBooks = useMemo(() => {
    const q = bookSearch.toLowerCase();
    return (books ?? []).filter(
      (b) => b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q)
    );
  }, [books, bookSearch]);

  const reset = () => {
    setStudentPopOpen(false);
    setStudentSearch("");
    setSelectedStudentId(null);
    setBookPopOpen(false);
    setBookSearch("");
    setSelectedBookId(null);
    setDueDateOption("");
  };

  const handleClose = () => { onOpenChange(false); reset(); };

  const handleSubmit = () => {
    if (!selectedStudentId || !selectedBookId || !dueDateValue) return;
    createLoan.mutate(
      { data: { studentId: selectedStudentId, bookId: selectedBookId, dueDate: dueDateValue.toISOString() } },
      {
        onSuccess: () => {
          toast({
            title: "Book lent successfully",
            description: `"${selectedBook?.title}" checked out to ${selectedStudent?.name}. Due ${format(dueDateValue, "MMM d, yyyy")}.`,
          });
          onSuccess();
          handleClose();
        },
        onError: (err: any) => {
          const msg = err?.data?.error ?? "Could not lend book. Check borrow limits or availability.";
          toast({ title: "Lending failed", description: msg, variant: "destructive" });
        },
      }
    );
  };

  const canSubmit = !!selectedStudentId && !!selectedBookId && !!dueDateOption && !createLoan.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookPlus className="h-5 w-5 text-teal-600" /> Lend a Book
          </DialogTitle>
          <DialogDescription>
            Check out a book to a student. Choose the student, the book, and the return deadline.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Student picker */}
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Popover open={studentPopOpen} onOpenChange={setStudentPopOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedStudent
                    ? `${selectedStudent.name} (${selectedStudent.studentId})`
                    : "Search by name or student ID…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Name or ID…" value={studentSearch} onValueChange={setStudentSearch} />
                  <CommandList>
                    <CommandEmpty>No students found.</CommandEmpty>
                    <CommandGroup>
                      {filteredStudents.map((s) => (
                        <CommandItem key={s.id} value={String(s.id)} onSelect={() => {
                          setSelectedStudentId(s.id);
                          setStudentSearch("");
                          setStudentPopOpen(false);
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedStudentId === s.id ? "opacity-100" : "opacity-0")} />
                          <span className="font-medium">{s.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{s.studentId}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Book picker */}
          <div className="space-y-1.5">
            <Label>Book <span className="text-xs text-muted-foreground">(only available copies shown)</span></Label>
            <Popover open={bookPopOpen} onOpenChange={setBookPopOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  {selectedBook ? selectedBook.title : "Search by title or author…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput placeholder="Title or author…" value={bookSearch} onValueChange={setBookSearch} />
                  <CommandList>
                    <CommandEmpty>No available books found.</CommandEmpty>
                    <CommandGroup>
                      {filteredBooks.map((b) => (
                        <CommandItem key={b.id} value={String(b.id)} onSelect={() => {
                          setSelectedBookId(b.id);
                          setBookSearch("");
                          setBookPopOpen(false);
                        }}>
                          <Check className={cn("mr-2 h-4 w-4", selectedBookId === b.id ? "opacity-100" : "opacity-0")} />
                          <span className="font-medium">{b.title}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{b.author}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* Due date */}
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Return Deadline
            </Label>
            <Select value={dueDateOption} onValueChange={setDueDateOption}>
              <SelectTrigger className="w-full bg-card">
                <SelectValue placeholder="Select return period…" />
              </SelectTrigger>
              <SelectContent>
                {DUE_DATE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.label} value={opt.label}>
                    {opt.label}
                    <span className="ml-2 text-muted-foreground text-xs">
                      (due {format(opt.getValue(), "MMM d, yyyy")})
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Summary */}
          {selectedStudent && selectedBook && dueDateValue && (
            <div className="rounded-md border bg-teal-50 border-teal-200 px-4 py-3 space-y-1 text-sm">
              <p className="font-semibold text-teal-800">Loan summary</p>
              <p className="text-teal-700">
                <span className="font-medium">{selectedStudent.name}</span>{" "}
                <span className="text-xs text-teal-600">({selectedStudent.studentId})</span>
              </p>
              <p className="font-medium text-teal-900">{selectedBook.title}</p>
              <p className="text-xs text-teal-600">
                Due: <span className="font-semibold">{format(dueDateValue, "MMMM d, yyyy")}</span>
              </p>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={createLoan.isPending}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-teal-600 hover:bg-teal-700 text-white"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {createLoan.isPending ? "Processing…" : "Confirm Lending"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
