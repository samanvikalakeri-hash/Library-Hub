import { useParams, Link } from "wouter";
import { useGetStudent, getGetStudentQueryKey, useListLoans, useListFines, useListReservations } from "@workspace/api-client-react";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, Mail, Hash, Phone, AlertCircle } from "lucide-react";

export default function StudentDetail() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id || "0", 10);
  
  const { data: student, isLoading: loadingStudent } = useGetStudent(id, { query: { enabled: !!id, queryKey: getGetStudentQueryKey(id) } });
  const { data: loans, isLoading: loadingLoans } = useListLoans({ studentId: id });
  const { data: fines, isLoading: loadingFines } = useListFines({ studentId: id });
  const { data: reservations, isLoading: loadingReservations } = useListReservations({ studentId: id });

  const activeLoans = loans?.filter(l => l.status === "active" || l.status === "overdue") || [];
  const pastLoans = loans?.filter(l => l.status === "returned") || [];

  if (loadingStudent) {
    return <div className="p-8 max-w-6xl mx-auto"><Skeleton className="h-96 w-full" /></div>;
  }

  if (!student) return <div className="p-8">Student not found.</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex flex-col md:flex-row gap-6 items-start">
        <div className="w-full md:w-1/3 space-y-6">
          <Card className="overflow-hidden">
            <div className="h-24 bg-sidebar-primary/20"></div>
            <CardContent className="px-6 pb-6 pt-0 relative">
              <div className="h-20 w-20 rounded-full border-4 border-card bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold absolute -top-10">
                {student.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="mt-12 space-y-4">
                <div>
                  <h1 className="text-2xl font-bold">{student.name}</h1>
                  <p className="text-muted-foreground flex items-center gap-1.5 mt-1 text-sm">
                    <GraduationCap className="h-4 w-4" /> Class of {student.graduationYear}
                  </p>
                </div>
                
                <div className="space-y-3 pt-4 border-t border-border/50 text-sm">
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Hash className="h-4 w-4 text-foreground/50" />
                    <span className="font-mono text-foreground">{student.studentId}</span>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <Mail className="h-4 w-4 text-foreground/50" />
                    <span className="text-foreground">{student.email}</span>
                  </div>
                  {student.phone && (
                    <div className="flex items-center gap-3 text-muted-foreground">
                      <Phone className="h-4 w-4 text-foreground/50" />
                      <span className="text-foreground">{student.phone}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-border/50 grid grid-cols-2 gap-4 text-center">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Loans</p>
                    <p className="text-xl font-bold">{student.activeLoansCount} <span className="text-sm font-normal text-muted-foreground">/ {student.borrowLimit}</span></p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Fines</p>
                    <p className={`text-xl font-bold ${student.totalFinesOwed && student.totalFinesOwed > 0 ? "text-destructive" : "text-emerald-600"}`}>
                      ${student.totalFinesOwed?.toFixed(2) || "0.00"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="w-full md:w-2/3">
          <Tabs defaultValue="active" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-muted/50 p-1">
              <TabsTrigger value="active">Active Loans</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
              <TabsTrigger value="fines">Fines</TabsTrigger>
              <TabsTrigger value="reservations">Reservations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="active" className="mt-4">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Checked Out</TableHead>
                      <TableHead>Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLoans ? (
                      <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ) : activeLoans.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No active loans.</TableCell></TableRow>
                    ) : (
                      activeLoans.map(loan => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">
                            <Link href={`/books/${loan.bookId}`} className="hover:underline">{loan.bookTitle}</Link>
                            <p className="text-xs text-muted-foreground">{loan.bookAuthor}</p>
                          </TableCell>
                          <TableCell>{format(new Date(loan.checkedOutAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{format(new Date(loan.dueDate), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={loan.status === 'overdue' ? 'destructive' : 'default'}>{loan.status}</Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Borrowed</TableHead>
                      <TableHead>Returned</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingLoans ? (
                      <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ) : pastLoans.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No borrowing history.</TableCell></TableRow>
                    ) : (
                      pastLoans.map(loan => (
                        <TableRow key={loan.id}>
                          <TableCell className="font-medium">
                            <Link href={`/books/${loan.bookId}`} className="hover:underline">{loan.bookTitle}</Link>
                          </TableCell>
                          <TableCell>{format(new Date(loan.checkedOutAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell>{loan.returnedAt ? format(new Date(loan.returnedAt), 'MMM d, yyyy') : '-'}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="fines" className="mt-4">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Reason</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingFines ? (
                      <TableRow><TableCell colSpan={4}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ) : !fines || fines.length === 0 ? (
                      <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No fines on record.</TableCell></TableRow>
                    ) : (
                      fines.map(fine => (
                        <TableRow key={fine.id}>
                          <TableCell className="font-medium">{fine.bookTitle}</TableCell>
                          <TableCell>{fine.reason}</TableCell>
                          <TableCell className="text-right font-medium">${fine.amount.toFixed(2)}</TableCell>
                          <TableCell>
                            {fine.paid ? 
                              <Badge variant="outline" className="bg-muted text-muted-foreground">Paid</Badge> : 
                              <Badge variant="destructive" className="flex w-fit items-center gap-1"><AlertCircle className="h-3 w-3" /> Unpaid</Badge>
                            }
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="reservations" className="mt-4">
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Book</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingReservations ? (
                      <TableRow><TableCell colSpan={3}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                    ) : !reservations || reservations.length === 0 ? (
                      <TableRow><TableCell colSpan={3} className="text-center py-8 text-muted-foreground">No reservations.</TableCell></TableRow>
                    ) : (
                      reservations.map(res => (
                        <TableRow key={res.id}>
                          <TableCell className="font-medium">
                            <Link href={`/books/${res.bookId}`} className="hover:underline">{res.bookTitle}</Link>
                          </TableCell>
                          <TableCell>{format(new Date(res.createdAt), 'MMM d, yyyy')}</TableCell>
                          <TableCell>
                            <Badge variant={res.status === 'pending' ? 'secondary' : res.status === 'fulfilled' ? 'default' : 'outline'}>
                              {res.status}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
