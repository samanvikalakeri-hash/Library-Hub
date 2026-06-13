import { useListStudents, useCreateStudent, useUpdateStudent, useDeleteStudent, getListStudentsQueryKey } from "@workspace/api-client-react";
import { useState } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Search, Plus, Edit, Trash2, MoreHorizontal, GraduationCap } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

const studentSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  studentId: z.string().min(1, "Student ID is required"),
  phone: z.string().optional(),
  graduationYear: z.coerce.number().min(2000, "Valid year required"),
  borrowLimit: z.coerce.number().min(1).max(20).default(5),
});

export default function Students() {
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const { data: students, isLoading } = useListStudents({ search: debouncedSearch });
  const [isAddOpen, setIsAddOpen] = useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Student Roster</h1>
          <p className="text-muted-foreground mt-1">Manage library patrons and their accounts.</p>
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
            <DialogContent>
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
              <TableHead>Name</TableHead>
              <TableHead>Student ID</TableHead>
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
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-8 ml-auto" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-4 w-12 ml-auto" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : students?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                  No students found.
                </TableCell>
              </TableRow>
            ) : (
              students?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell className="font-medium">
                    <Link href={`/students/${student.id}`} className="hover:underline flex items-center gap-2">
                      {student.name}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-muted-foreground text-xs">{student.studentId}</TableCell>
                  <TableCell>{student.email}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <GraduationCap className="h-4 w-4" />
                      {student.graduationYear}
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-medium">{student.activeLoansCount} / {student.borrowLimit}</TableCell>
                  <TableCell className={`text-right font-medium ${student.totalFinesOwed && student.totalFinesOwed > 0 ? "text-destructive" : ""}`}>
                    ${student.totalFinesOwed?.toFixed(2) || "0.00"}
                  </TableCell>
                  <TableCell>
                    <StudentActions student={student} />
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

function StudentActions({ student }: { student: any }) {
  const [isEditOpen, setIsEditOpen] = useState(false);
  const deleteStudent = useDeleteStudent();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${student.name}?`)) {
      deleteStudent.mutate({ id: student.id }, {
        onSuccess: () => {
          toast({ title: "Student deleted" });
          queryClient.invalidateQueries({ queryKey: getListStudentsQueryKey() });
        }
      });
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => setIsEditOpen(true)}><Edit className="mr-2 h-4 w-4" /> Edit</DropdownMenuItem>
          <DropdownMenuItem onSelect={handleDelete} className="text-destructive"><Trash2 className="mr-2 h-4 w-4" /> Delete</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <StudentForm student={student} onSuccess={() => setIsEditOpen(false)} />
        </DialogContent>
      </Dialog>
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
      graduationYear: student.graduationYear,
      borrowLimit: student.borrowLimit,
    } : {
      name: "",
      email: "",
      studentId: "",
      phone: "",
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
        <Button type="submit" className="w-full" disabled={createStudent.isPending || updateStudent.isPending}>
          {student ? "Update Student" : "Add Student"}
        </Button>
      </form>
    </Form>
  );
}
