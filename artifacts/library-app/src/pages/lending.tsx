import {
  useCreateLoan, useListStudents, useListBooks,
  getListLoansQueryKey, getGetDashboardSummaryQueryKey, getListBooksQueryKey,
} from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { format, addWeeks, addMonths } from "date-fns";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { BookPlus, ChevronsUpDown, Check, Calendar, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const DUE_DATE_OPTIONS = [
  { label: "1 Week", getValue: () => addWeeks(new Date(), 1) },
  { label: "2 Weeks", getValue: () => addWeeks(new Date(), 2) },
  { label: "1 Month", getValue: () => addMonths(new Date(), 1) },
];

export default function Lending() {
  const { data: students } = useListStudents();
  const { data: books, refetch: refetchBooks } = useListBooks({ available: true });
  const createLoan = useCreateLoan();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [studentPopOpen, setStudentPopOpen] = useState(false);
  const [studentSearch, setStudentSearch] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);

  const [bookPopOpen, setBookPopOpen] = useState(false);
  const [bookSearch, setBookSearch] = useState("");
  const [selectedBookId, setSelectedBookId] = useState<number | null>(null);

  const [dueDateOption, setDueDateOption] = useState<string>("");
  const [lastSuccess, setLastSuccess] = useState<{ studentName: string; bookTitle: string; dueDate: Date } | null>(null);

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

  const handleSubmit = () => {
    if (!selectedStudentId || !selectedBookId || !dueDateValue) return;
    createLoan.mutate(
      { data: { studentId: selectedStudentId, bookId: selectedBookId, dueDate: dueDateValue.toISOString() } },
      {
        onSuccess: () => {
          setLastSuccess({
            studentName: selectedStudent?.name ?? "Student",
            bookTitle: selectedBook?.title ?? "Book",
            dueDate: dueDateValue,
          });
          toast({
            title: "Book lent successfully",
            description: `"${selectedBook?.title}" checked out to ${selectedStudent?.name}. Due ${format(dueDateValue, "MMM d, yyyy")}.`,
          });
          queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListBooksQueryKey() });
          refetchBooks();
          reset();
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
    <div className="p-8 max-w-2xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <BookPlus className="h-7 w-7 text-teal-600" /> Lend a Book
        </h1>
        <p className="text-muted-foreground mt-1">Check out a book to a student by filling in the form below.</p>
      </div>

      {lastSuccess && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-start gap-3">
          <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
          <div className="text-sm text-emerald-800">
            <p className="font-semibold">Book lent successfully</p>
            <p>
              <span className="font-medium">"{lastSuccess.bookTitle}"</span> checked out to{" "}
              <span className="font-medium">{lastSuccess.studentName}</span>. Due{" "}
              <span className="font-medium">{format(lastSuccess.dueDate, "MMMM d, yyyy")}</span>.
            </p>
          </div>
          <button
            className="ml-auto text-emerald-500 hover:text-emerald-700 text-lg leading-none"
            onClick={() => setLastSuccess(null)}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      <div className="rounded-xl border bg-card p-6 space-y-6 shadow-sm">
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Student</Label>
          <Popover open={studentPopOpen} onOpenChange={setStudentPopOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
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

        <div className="space-y-1.5">
          <Label className="text-sm font-medium">
            Book <span className="text-xs text-muted-foreground font-normal">(only available copies shown)</span>
          </Label>
          <Popover open={bookPopOpen} onOpenChange={setBookPopOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" role="combobox" className="w-full justify-between font-normal h-10">
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

        <div className="space-y-1.5">
          <Label className="text-sm font-medium flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5 text-muted-foreground" /> Return Deadline
          </Label>
          <Select value={dueDateOption} onValueChange={setDueDateOption}>
            <SelectTrigger className="w-full bg-card h-10">
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

        {selectedStudent && selectedBook && dueDateValue && (
          <div className="rounded-lg border bg-teal-50 border-teal-200 px-4 py-3 space-y-1 text-sm">
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

        <div className="flex gap-3 pt-1">
          <Button
            variant="outline"
            className="flex-1"
            onClick={reset}
            disabled={createLoan.isPending || (!selectedStudentId && !selectedBookId && !dueDateOption)}
          >
            Clear
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
    </div>
  );
}
