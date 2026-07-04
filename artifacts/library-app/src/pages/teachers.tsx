import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, Edit, Trash2, MoreHorizontal, BookOpen, ChevronDown, HandCoins } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import type { Teacher } from "@workspace/api-client-react";
import { useListLoans, useReturnLoan, getListLoansQueryKey } from "@workspace/api-client-react";

const teacherSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  teacherId: z.string().min(1, "Teacher ID is required"),
  subject: z.string().optional(),
  phone: z.string().optional(),
  borrowLimit: z.coerce.number().min(1).max(20).default(5),
});

function useTeacherAPI() {
  const queryClient = useQueryClient();

  const listTeachers = async (search?: string): Promise<Teacher[]> => {
    const url = search ? `/api/teachers?search=${encodeURIComponent(search)}` : "/api/teachers";
    const res = await fetch(url, { credentials: "include" });
    if (!res.ok) throw new Error("Failed to fetch teachers");
    return res.json();
  };

  const createTeacher = async (data: z.infer<typeof teacherSchema>): Promise<Teacher> => {
    const res = await fetch("/api/teachers", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Failed to create teacher");
    }
    return res.json();
  };

  const updateTeacher = async (id: number, data: Partial<z.infer<typeof teacherSchema>>): Promise<Teacher> => {
    const res = await fetch(`/api/teachers/${id}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Failed to update teacher");
    }
    return res.json();
  };

  const deleteTeacher = async (id: number): Promise<void> => {
    const res = await fetch(`/api/teachers/${id}`, { method: "DELETE", credentials: "include" });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error ?? "Failed to delete teacher");
    }
  };

  return { listTeachers, createTeacher, updateTeacher, deleteTeacher, queryClient };
}

export default function Teachers() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedTeacherId, setExpandedTeacherId] = useState<number | null>(null);
  const { listTeachers } = useTeacherAPI();
  const { toast } = useToast();

  const loadTeachers = async (s: string) => {
    setIsLoading(true);
    try {
      const data = await listTeachers(s || undefined);
      setTeachers(data);
    } catch {
      toast({ title: "Failed to load teachers", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useState(() => { loadTeachers(""); });
  
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const [prevSearch, setPrevSearch] = useState(debouncedSearch);
  if (prevSearch !== debouncedSearch) {
    setPrevSearch(debouncedSearch);
    loadTeachers(debouncedSearch);
  }

  const toggleExpand = (id: number) => {
    setExpandedTeacherId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Teachers</h1>
          <p className="text-muted-foreground mt-1">Manage teacher library accounts. Teachers log in with their Teacher ID.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teachers..."
              className="pl-8 w-64 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Teacher</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Teacher</DialogTitle>
              </DialogHeader>
              <TeacherForm onSuccess={() => { setIsAddOpen(false); loadTeachers(debouncedSearch); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Teacher ID</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="text-right">Active Loans</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : teachers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No teachers found.
                </TableCell>
              </TableRow>
            ) : (
              teachers.map((teacher) => (
                <>
                  <TableRow
                    key={teacher.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(teacher.id)}
                  >
                    <TableCell>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedTeacherId === teacher.id ? "rotate-180" : ""}`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{teacher.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">{teacher.teacherId}</TableCell>
                    <TableCell className="text-muted-foreground">{teacher.subject ?? "—"}</TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell className="text-right font-medium">
                      {teacher.activeLoansCount} / {teacher.borrowLimit}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <TeacherActions teacher={teacher} onRefresh={() => loadTeachers(debouncedSearch)} />
                    </TableCell>
                  </TableRow>
                  {expandedTeacherId === teacher.id && (
                    <TableRow key={`${teacher.id}-expanded`}>
                      <TableCell colSpan={7} className="p-0 border-t-0">
                        <TeacherLoanDetails teacherId={teacher.id} teacherName={teacher.name} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function TeacherLoanDetails({ teacherId, teacherName }: { teacherId: number; teacherName: string }) {
  const { data: loans, isLoading } = useListLoans({ teacherId });
  const returnLoan = useReturnLoan();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const activeLoans = loans?.filter((l) => l.status === "active" || l.status === "overdue") ?? [];
  const history = loans?.filter((l) => l.status === "returned") ?? [];

  const handleCollect = (loanId: number, bookTitle: string) => {
    returnLoan.mutate({ id: loanId }, {
      onSuccess: () => {
        toast({ title: `Book collected from ${teacherName}`, description: `"${bookTitle}" marked as returned.` });
        queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
      },
      onError: () => toast({ title: "Failed to collect book", variant: "destructive" }),
    });
  };

  return (
    <div className="bg-muted/20 border-t px-6 py-4 space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <BookOpen className="h-4 w-4 text-teal-600" />
        Book Details for {teacherName}
      </div>
      {isLoading ? (
        <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}</div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Currently Borrowed ({activeLoans.length})</p>
            {activeLoans.length === 0 ? (
              <p className="text-sm text-muted-foreground italic pl-2">No active loans.</p>
            ) : (
              <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Book Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Checked Out</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">On-Spot Collect</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeLoans.map((loan) => (
                      <TableRow key={loan.id}>
                        <TableCell className="font-medium">{loan.bookTitle ?? "—"}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">{loan.bookAuthor ?? "—"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(loan.checkedOutAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-sm">
                          <span className={loan.status === "overdue" ? "text-red-600 font-semibold" : ""}>
                            {format(new Date(loan.dueDate), "MMM d, yyyy")}
                          </span>
                          {loan.status === "overdue" && <span className="ml-1 text-xs text-red-500">(Overdue)</span>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={loan.status === "overdue" ? "destructive" : "secondary"} className="capitalize">{loan.status}</Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button size="sm" variant="outline"
                            className="h-7 text-xs border-teal-200 text-teal-700 hover:bg-teal-50"
                            disabled={returnLoan.isPending}
                            onClick={() => handleCollect(loan.id, loan.bookTitle ?? "Book")}>
                            <HandCoins className="h-3 w-3 mr-1" /> Collect Book
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
          {history.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Borrowing History ({history.length})</p>
              <div className="rounded-md border bg-card overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40">
                      <TableHead>Book Title</TableHead>
                      <TableHead>Author</TableHead>
                      <TableHead>Checked Out</TableHead>
                      <TableHead>Returned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((loan) => (
                      <TableRow key={loan.id} className="text-muted-foreground">
                        <TableCell className="font-medium text-foreground">{loan.bookTitle ?? "—"}</TableCell>
                        <TableCell className="text-sm">{loan.bookAuthor ?? "—"}</TableCell>
                        <TableCell className="text-sm">{format(new Date(loan.checkedOutAt), "MMM d, yyyy")}</TableCell>
                        <TableCell className="text-sm">{loan.returnedAt ? format(new Date(loan.returnedAt), "MMM d, yyyy") : "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
          {activeLoans.length === 0 && history.length === 0 && (
            <p className="text-sm text-muted-foreground italic pl-2">This teacher has no loan records.</p>
          )}
        </>
      )}
    </div>
  );
}

function TeacherActions({ teacher, onRefresh }: { teacher: Teacher; onRefresh: () => void }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const { deleteTeacher } = useTeacherAPI();
  const { toast } = useToast();

  const handleDelete = async () => {
    try {
      await deleteTeacher(teacher.id);
      toast({ title: "Teacher deleted" });
      onRefresh();
    } catch (err: any) {
      toast({ title: "Cannot delete teacher", description: err?.message ?? "An error occurred", variant: "destructive" });
    }
    setIsDeleteOpen(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setIsDeleteOpen(true)} className="text-destructive">
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Teacher</DialogTitle></DialogHeader>
          <TeacherForm teacher={teacher} onSuccess={() => { setIsEditOpen(false); onRefresh(); }} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {teacher.name}?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently remove the teacher from the system.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function TeacherForm({ teacher, onSuccess }: { teacher?: Teacher; onSuccess: () => void }) {
  const { createTeacher, updateTeacher } = useTeacherAPI();
  const { toast } = useToast();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<z.infer<typeof teacherSchema>>({
    resolver: zodResolver(teacherSchema),
    defaultValues: teacher ? {
      name: teacher.name,
      email: teacher.email,
      teacherId: teacher.teacherId,
      subject: teacher.subject ?? "",
      phone: teacher.phone ?? "",
      borrowLimit: teacher.borrowLimit,
    } : {
      name: "",
      email: "",
      teacherId: "",
      subject: "",
      phone: "",
      borrowLimit: 5,
    }
  });

  const onSubmit = async (values: z.infer<typeof teacherSchema>) => {
    setIsPending(true);
    try {
      if (teacher) {
        await updateTeacher(teacher.id, values);
        toast({ title: "Teacher updated" });
      } else {
        await createTeacher(values);
        toast({ title: "Teacher added" });
      }
      onSuccess();
    } catch (err: any) {
      toast({ title: teacher ? "Failed to update teacher" : "Failed to add teacher", description: err?.message ?? "An error occurred", variant: "destructive" });
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField control={form.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="teacherId" render={({ field }) => (
            <FormItem><FormLabel>Teacher ID</FormLabel><FormControl><Input {...field} placeholder="e.g. TCH001" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField control={form.control} name="subject" render={({ field }) => (
            <FormItem><FormLabel>Subject</FormLabel><FormControl><Input {...field} placeholder="e.g. Mathematics" /></FormControl><FormMessage /></FormItem>
          )} />
          <FormField control={form.control} name="phone" render={({ field }) => (
            <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
          )} />
        </div>
        <FormField control={form.control} name="borrowLimit" render={({ field }) => (
          <FormItem><FormLabel>Borrow Limit</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <Button type="submit" className="w-full" disabled={isPending}>
          {teacher ? "Update Teacher" : "Add Teacher"}
        </Button>
      </form>
    </Form>
  );
}
