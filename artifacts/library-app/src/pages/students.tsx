import {
  useListStudents, useCreateStudent, useUpdateStudent, useDeleteStudent,
  useListLoans, useReturnLoan,
  getListStudentsQueryKey, getListLoansQueryKey,
} from "@workspace/api-client-react";
import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, Edit, Trash2, MoreHorizontal, GraduationCap, ChevronDown, BookOpen, HandCoins } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  studentId: z.string().min(1, "Student ID is required"),
  phone: z.string().optional(),
  grade: z.string().optional(),
  section: z.string().optional(),
  rollNumber: z.string().optional(),
  graduationYear: z.coerce.number().min(2000, "Valid year required"),
  borrowLimit: z.coerce.number().min(1).max(20).default(5),
});

export default function Students() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: students, isLoading } = useListStudents({ search: debouncedSearch });
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [expandedStudentId, setExpandedStudentId] = useState<number | null>(null);

  const toggleExpand = (id: number) => {
    setExpandedStudentId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Student Details</h1>
          <p className="text-muted-foreground mt-1">Manage library patrons. Click any row to expand book details.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-8 w-64 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="mr-2 h-4 w-4" /> Add Student</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>Add New Student</DialogTitle>
              </DialogHeader>
              <StudentForm onSuccess={() => setIsAddOpen(false)} />
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
              <TableHead>Student ID</TableHead>
              <TableHead>Class / Section</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Graduation</TableHead>
              <TableHead className="text-right">Active Loans</TableHead>
              <TableHead className="text-right">Fines</TableHead>
              <TableHead className="w-[80px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : students?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              students?.map((student) => (
                <>
                  <TableRow
                    key={student.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleExpand(student.id)}
                  >
                    <TableCell>
                      <ChevronDown
                        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                          expandedStudentId === student.id ? "rotate-180" : ""
                        }`}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{student.name}</TableCell>
                    <TableCell className="font-mono text-muted-foreground text-xs">{student.studentId}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {student.grade && student.section
                        ? `${student.grade} – ${student.section}${student.rollNumber ? ` (${student.rollNumber})` : ""}`
                        : student.grade ?? student.section ?? "—"}
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <GraduationCap className="h-4 w-4" />
                        {student.graduationYear}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {student.activeLoansCount} / {student.borrowLimit}
                    </TableCell>
                    <TableCell
                      className={`text-right font-medium ${
                        student.totalFinesOwed && student.totalFinesOwed > 0 ? "text-destructive" : ""
                      }`}
                    >
                      ₹{student.totalFinesOwed?.toFixed(2) || "0.00"}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <StudentActions student={student} />
                    </TableCell>
                  </TableRow>

                  {expandedStudentId === student.id && (
                    <TableRow key={`${student.id}-expanded`}>
                      <TableCell colSpan={9} className="p-0 border-t-0">
                        <StudentLoanDetails studentId={student.id} studentName={student.name} />
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

function StudentLoanDetails({ studentId, studentName }: { studentId: number; studentName: string }) {
  const { data: loans, isLoading } = useListLoans({ studentId });
  const returnLoan = useReturnLoan();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const activeLoans = loans?.filter((l) => l.status === "active" || l.status === "overdue") ?? [];
  const history = loans?.filter((l) => l.status === "returned") ?? [];

  const handleCollect = (loanId: number, bookTitle: string) => {
    returnLoan.mutate(
      { id: loanId },
      {
        onSuccess: () => {
          toast({
            title: `Book collected from ${studentName}`,
            description: `"${bookTitle}" marked as returned.`,
          });
          queryClient.invalidateQueries({ queryKey: getListLoansQueryKey() });
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        },
        onError: () =>
          toast({ title: "Failed to collect book", variant: "destructive" }),
      }
    );
  };

  return (
    <div className="bg-muted/20 border-t px-6 py-4 space-y-5">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <BookOpen className="h-4 w-4 text-teal-600" />
        Book Details for {studentName}
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[...Array(2)].map((_, i) => <Skeleton key={i} className="h-8 w-full" />)}
        </div>
      ) : (
        <>
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Currently Borrowed ({activeLoans.length})
            </p>
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
                        <TableCell className="text-sm">
                          {format(new Date(loan.checkedOutAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          <span className={loan.status === "overdue" ? "text-red-600 font-semibold" : ""}>
                            {format(new Date(loan.dueDate), "MMM d, yyyy")}
                          </span>
                          {loan.status === "overdue" && (
                            <span className="ml-1 text-xs text-red-500">(Overdue)</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={loan.status === "overdue" ? "destructive" : "secondary"}
                            className="capitalize"
                          >
                            {loan.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs border-teal-200 text-teal-700 hover:bg-teal-50 hover:text-teal-800"
                            disabled={returnLoan.isPending}
                            onClick={() => handleCollect(loan.id, loan.bookTitle ?? "Book")}
                          >
                            <HandCoins className="h-3 w-3 mr-1" />
                            Collect Book
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Borrowing History ({history.length})
              </p>
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
                        <TableCell className="text-sm">
                          {format(new Date(loan.checkedOutAt), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {loan.returnedAt
                            ? format(new Date(loan.returnedAt), "MMM d, yyyy")
                            : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}

          {activeLoans.length === 0 && history.length === 0 && (
            <p className="text-sm text-muted-foreground italic pl-2">This student has no loan records.</p>
          )}
        </>
      )}
    </div>
  );
}

function StudentActions({ student }: { student: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const deleteStudent = useDeleteStudent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    deleteStudent.mutate({ id: student.id }, {
      onSuccess: () => {
        toast({ title: "Student deleted" });
        queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        setIsDeleteOpen(false);
      },
      onError: (err: any) => {
        const msg = err?.data?.error ?? "This student has active loans or records.";
        toast({ title: "Cannot delete student", description: msg, variant: "destructive" });
        setIsDeleteOpen(false);
      },
    });
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <StudentForm student={student} onSuccess={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {student.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the student and all their records from the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteStudent.isPending}
            >
              {deleteStudent.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function StudentForm({ student, onSuccess }: { student?: any; onSuccess: () => void }) {
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof studentSchema>>({
    resolver: zodResolver(studentSchema),
    defaultValues: student ? {
      name: student.name,
      email: student.email,
      studentId: student.studentId,
      phone: student.phone || "",
      grade: student.grade || "",
      section: student.section || "",
      rollNumber: student.rollNumber || "",
      graduationYear: student.graduationYear,
      borrowLimit: student.borrowLimit,
    } : {
      name: "",
      email: "",
      studentId: "",
      phone: "",
      grade: "",
      section: "",
      rollNumber: "",
      graduationYear: new Date().getFullYear() + 4,
      borrowLimit: 5,
    }
  });

  const onSubmit = (values: z.infer<typeof studentSchema>) => {
    if (student) {
      updateStudent.mutate({ id: student.id, data: values }, {
        onSuccess: () => {
          toast({ title: "Student updated" });
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          onSuccess();
        },
        onError: (err: any) => {
          toast({ title: "Failed to update student", description: err?.response?.data?.error ?? "An error occurred", variant: "destructive" });
        }
      });
    } else {
      createStudent.mutate({ data: values }, {
        onSuccess: () => {
          toast({ title: "Student added" });
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
          onSuccess();
        },
        onError: (err: any) => {
          toast({ title: "Failed to add student", description: err?.response?.data?.error ?? "An error occurred", variant: "destructive" });
        }
      });
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Full Name</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="studentId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Student ID</FormLabel>
                <FormControl><Input {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl><Input type="email" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <FormField
            control={form.control}
            name="grade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Class</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. 10" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="section"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Section</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. A" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="rollNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Roll No.</FormLabel>
                <FormControl><Input {...field} placeholder="e.g. 12" /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="graduationYear"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Graduation Year</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="borrowLimit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Borrow Limit</FormLabel>
                <FormControl><Input type="number" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone (optional)</FormLabel>
              <FormControl><Input {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={createStudent.isPending || updateStudent.isPending}>
          {student ? "Update Student" : "Add Student"}
        </Button>
      </form>
    </Form>
  );
}
