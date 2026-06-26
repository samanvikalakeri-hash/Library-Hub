import { useListFines, useClearFine, useListStudents, getListFinesQueryKey, getGetDashboardSummaryQueryKey } from "@workspace/api-client-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { CheckCircle2, Info, Plus, ChevronsUpDown, Check, Calculator, IndianRupee } from "lucide-react";
import { cn } from "@/lib/utils";

type PendingPayment = { id: number; studentName: string; bookTitle: string; amount: number };

export default function Fines() {
  const [status, setStatus] = useState<string>("unpaid");
  const [pendingPayment, setPendingPayment] = useState<PendingPayment | null>(null);
  const [collectOpen, setCollectOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const isPaid = status === "all" ? undefined : status === "paid";
  const { data: fines, isLoading } = useListFines({ paid: isPaid });
  const clearFine = useClearFine();

  const confirmPayment = () => {
    if (!pendingPayment) return;
    clearFine.mutate({ id: pendingPayment.id }, {
      onSuccess: () => {
        toast({ title: "Fine marked as paid", description: `₹${pendingPayment.amount.toFixed(2)} collected from ${pendingPayment.studentName}.` });
        queryClient.invalidateQueries({ queryKey: getListFinesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        setPendingPayment(null);
      },
      onError: () => {
        toast({ title: "Failed to mark fine as paid", variant: "destructive" });
        setPendingPayment(null);
      },
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
          <Button onClick={() => setCollectOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Collect Fine
          </Button>
        </div>
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <Info className="h-4 w-4 mt-0.5 shrink-0 text-blue-500" />
        <div>
          <span className="font-semibold">How the Actions column works: </span>
          Unpaid fines show a green <span className="font-semibold">Mark Paid</span> button. Click it after collecting the fine — a confirmation dialog will appear.
          Use <span className="font-semibold">Collect Fine</span> to record an on-spot payment with either a fixed amount or a per-day rate.
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
                    {fine.loanId ? (
                      <Link href={`/books/${fine.loanId}`} className="hover:underline truncate max-w-[200px] block" title={fine.bookTitle || ''}>
                        {fine.bookTitle}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground text-sm italic">On-spot</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{fine.reason}</TableCell>
                  <TableCell>{format(new Date(fine.createdAt), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="text-right font-bold">₹{fine.amount.toFixed(2)}</TableCell>
                  <TableCell className="text-center">
                    {fine.paid ? (
                      <Badge variant="outline" className="bg-muted text-muted-foreground">Paid</Badge>
                    ) : (
                      <Badge variant="destructive">Unpaid</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {fine.paid ? (
                      <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Collected
                      </span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 border-emerald-200 text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
                        disabled={clearFine.isPending}
                        onClick={() => setPendingPayment({
                          id: fine.id,
                          studentName: fine.studentName ?? 'Student',
                          bookTitle: fine.bookTitle ?? 'Book',
                          amount: fine.amount,
                        })}
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

      {/* Mark-paid confirmation */}
      <AlertDialog open={!!pendingPayment} onOpenChange={(v) => { if (!v) setPendingPayment(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Fine Collection</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3">
                <p>
                  Confirm that you have physically collected the fine from{" "}
                  <span className="font-semibold text-foreground">{pendingPayment?.studentName}</span>?
                </p>
                <div className="rounded-md border bg-muted/40 px-4 py-3 space-y-1 text-foreground">
                  <p className="text-sm font-medium">{pendingPayment?.bookTitle}</p>
                  <p className="text-lg font-bold text-emerald-700">₹{pendingPayment?.amount.toFixed(2)}</p>
                </div>
                <p className="text-xs text-muted-foreground">
                  This action cannot be undone. The fine will be moved to "Paid" status.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmPayment}
              disabled={clearFine.isPending}
              className="bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {clearFine.isPending ? "Processing…" : "Yes, Mark as Paid"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* On-spot fine collection dialog */}
      <CollectFineDialog
        open={collectOpen}
        onOpenChange={setCollectOpen}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: getListFinesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
        }}
      />
    </div>
  );
}

// ─── Collect Fine Dialog ───────────────────────────────────────────────────────

type FineMode = "direct" | "perday";

function CollectFineDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: () => void;
}) {
  const { data: students } = useListStudents();
  const { toast } = useToast();

  const [fineMode, setFineMode] = useState<FineMode>("direct");

  // Student picker
  const [studentPopoverOpen, setStudentPopoverOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentSearch, setStudentSearch] = useState("");

  // Direct amount mode
  const [amount, setAmount] = useState("");

  // Per-day mode
  const [ratePerDay, setRatePerDay] = useState("");
  const [numDays, setNumDays] = useState("");

  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const selectedStudent = students?.find((s) => s.id === selectedStudentId);

  // Computed final amount — days must be a whole number
  const parsedDays = Math.floor(parseFloat(numDays || "0"));
  const computedAmount: number = fineMode === "perday"
    ? parseFloat(ratePerDay || "0") * parsedDays
    : parseFloat(amount || "0");
  const daysWarning = fineMode === "perday" && numDays !== "" && parsedDays !== parseFloat(numDays);

  const filteredStudents = useMemo(() => {
    const q = studentSearch.toLowerCase();
    return (students ?? []).filter(
      (s) => s.name.toLowerCase().includes(q) || s.studentId.toLowerCase().includes(q)
    );
  }, [students, studentSearch]);

  const reset = () => {
    setFineMode("direct");
    setSelectedStudentId(null);
    setStudentSearch("");
    setStudentPopoverOpen(false);
    setAmount("");
    setRatePerDay("");
    setNumDays("");
    setReason("");
    setSubmitting(false);
  };

  const handleClose = () => { onOpenChange(false); reset(); };

  const handleSubmit = async () => {
    if (!selectedStudentId) {
      toast({ title: "Select a student", variant: "destructive" });
      return;
    }
    if (!computedAmount || computedAmount <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (!reason.trim()) {
      toast({ title: "Enter a reason", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fines", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudentId,
          amount: computedAmount,
          reason: reason.trim(),
          collectNow: true,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to record fine");
      }
      toast({
        title: "Fine collected",
        description: `₹${computedAmount.toFixed(2)} collected from ${selectedStudent?.name} and recorded.`,
      });
      onSuccess();
      handleClose();
    } catch (err: any) {
      toast({ title: err.message ?? "Something went wrong", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = !!selectedStudentId && computedAmount > 0 && !!reason && !submitting;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Fine On-Spot</DialogTitle>
          <DialogDescription>
            Record a cash payment collected directly from a student. The fine will be marked as paid immediately.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Student picker */}
          <div className="space-y-1.5">
            <Label>Student</Label>
            <Popover open={studentPopoverOpen} onOpenChange={setStudentPopoverOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={studentPopoverOpen}
                  className="w-full justify-between font-normal"
                >
                  {selectedStudent
                    ? `${selectedStudent.name} (${selectedStudent.studentId})`
                    : "Search student by name or ID…"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-full p-0" align="start">
                <Command shouldFilter={false}>
                  <CommandInput
                    placeholder="Type name or student ID…"
                    value={studentSearch}
                    onValueChange={setStudentSearch}
                  />
                  <CommandList>
                    <CommandEmpty>No students found.</CommandEmpty>
                    <CommandGroup>
                      {filteredStudents.map((s) => (
                        <CommandItem
                          key={s.id}
                          value={String(s.id)}
                          onSelect={() => {
                            setSelectedStudentId(s.id);
                            setStudentSearch("");
                            setStudentPopoverOpen(false);
                          }}
                        >
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

          {/* Fine mode toggle */}
          <div className="space-y-1.5">
            <Label>Fine Type</Label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={fineMode === "direct" ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => setFineMode("direct")}
              >
                <IndianRupee className="h-3.5 w-3.5 mr-1.5" /> Direct Amount
              </Button>
              <Button
                type="button"
                variant={fineMode === "perday" ? "default" : "outline"}
                size="sm"
                className="w-full"
                onClick={() => setFineMode("perday")}
              >
                <Calculator className="h-3.5 w-3.5 mr-1.5" /> Per-Day Rate
              </Button>
            </div>
          </div>

          {/* Amount fields */}
          {fineMode === "direct" ? (
            <div className="space-y-1.5">
              <Label htmlFor="fine-amount">Amount (₹)</Label>
              <Input
                id="fine-amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="e.g. 50.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rate-per-day">Rate per day (₹)</Label>
                <Input
                  id="rate-per-day"
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="e.g. 5.00"
                  value={ratePerDay}
                  onChange={(e) => setRatePerDay(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="num-days">Number of days</Label>
                <Input
                  id="num-days"
                  type="number"
                  min="1"
                  step="1"
                  placeholder="e.g. 7"
                  value={numDays}
                  onChange={(e) => setNumDays(e.target.value)}
                />
              </div>
              {computedAmount > 0 && (
                <div className="col-span-2 text-sm text-muted-foreground">
                  Calculated total:{" "}
                  <span className="font-bold text-foreground">₹{computedAmount.toFixed(2)}</span>
                  <span className="ml-1 text-xs">
                    ({ratePerDay}/day × {numDays} days)
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Reason */}
          <div className="space-y-1.5">
            <Label htmlFor="fine-reason">Reason</Label>
            <Input
              id="fine-reason"
              placeholder="e.g. Lost book, Damage fee, Overdue…"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Summary */}
          {selectedStudent && computedAmount > 0 && (
            <div className="rounded-md border bg-emerald-50 border-emerald-200 px-4 py-3 space-y-1 text-sm">
              <p className="font-semibold text-emerald-800">Collection summary</p>
              <p className="text-emerald-700">
                <span className="font-medium">{selectedStudent.name}</span>{" "}
                <span className="text-xs text-emerald-600">({selectedStudent.studentId})</span>
              </p>
              <p className="text-lg font-bold text-emerald-700">₹{computedAmount.toFixed(2)}</p>
              {fineMode === "perday" && ratePerDay && numDays && (
                <p className="text-xs text-emerald-600">₹{ratePerDay}/day × {numDays} days</p>
              )}
              {reason && <p className="text-xs text-emerald-600">{reason}</p>}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={handleClose} disabled={submitting}>
              Cancel
            </Button>
            <Button
              className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
              onClick={handleSubmit}
              disabled={!canSubmit}
            >
              {submitting ? "Recording…" : "Collect & Record"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
