
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Edit, Trash2, FlaskConical, DollarSign, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query as firestoreQuery, orderBy } from "@/lib/firebase";

const testFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Test name must be at least 2 characters."),
  price: z.coerce.number().min(0, "Price cannot be negative."),
  description: z.string().optional(),
  category: z.string().optional(), // Free text category
});

type TestFormValues = z.infer<typeof testFormSchema>;

interface Test extends TestFormValues {
  id: string;
  createdAt?: any;
}

export default function ManageTestsPage() {
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: { name: "", price: 0, description: "", category: "" },
  });

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    try {
      const testsSnapshot = await getDocs(firestoreQuery(collection(db, "tests"), orderBy("name")));
      const fetchedTests: Test[] = [];
      testsSnapshot.forEach(doc => fetchedTests.push({ id: doc.id, ...doc.data() } as Test));
      setTests(fetchedTests);
    } catch (error) {
      console.error("Error fetching tests: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch tests." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTests();
  }, [fetchTests]);

  const handleDialogOpen = (test?: Test) => {
    if (test) {
      setEditingTest(test);
      form.reset(test);
    } else {
      setEditingTest(null);
      form.reset({ name: "", price: 0, description: "", category: "" });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: TestFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingTest) {
        const testRef = doc(db, "tests", editingTest.id);
        await updateDoc(testRef, values);
        toast({ title: "Test Updated", description: `${values.name} has been updated.` });
      } else {
        await addDoc(collection(db, "tests"), { ...values, createdAt: serverTimestamp() });
        toast({ title: "Test Added", description: `${values.name} has been added.` });
      }
      fetchTests();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error saving test: ", error);
      toast({ variant: "destructive", title: "Save Error", description: error.message || "Could not save test details." });
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteTest = async (testId: string, testName: string) => {
    if(!window.confirm(`Are you sure you want to delete the test "${testName}"?`)) return;
    try {
      await deleteDoc(doc(db, "tests", testId));
      toast({ title: "Test Deleted", description: `"${testName}" has been removed.`, variant: "destructive" });
      fetchTests();
    } catch (error) {
      console.error("Error deleting test: ", error);
      toast({ variant: "destructive", title: "Delete Error", description: "Could not delete test." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading tests...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Medical Tests" description="Add, edit, or remove billable tests offered by the clinic.">
        <Button onClick={() => handleDialogOpen()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add New Test
        </Button>
      </PageHeader>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Test List</CardTitle>
          <CardDescription>Available medical tests and their prices.</CardDescription>
        </CardHeader>
        <CardContent>
          {tests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
                <FlaskConical className="mx-auto h-12 w-12 mb-4"/>
                <p>No tests found. Add a new test to populate the list.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.map((test) => (
                <TableRow key={test.id}>
                  <TableCell className="font-medium">{test.name}</TableCell>
                  <TableCell>{test.category || 'N/A'}</TableCell>
                  <TableCell className="max-w-xs truncate">{test.description || 'N/A'}</TableCell>
                  <TableCell className="text-right">${test.price.toFixed(2)}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(test)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleDeleteTest(test.id, test.name)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingTest ? "Edit Test" : "Add New Test"}</DialogTitle>
            <DialogDescription>
              {editingTest ? "Update the test details." : "Fill in the details for the new medical test."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Test Name</FormLabel>
                    <FormControl><Input placeholder="e.g., Blood Sugar Test" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <FormControl><Input type="number" placeholder="0.00" step="0.01" {...field} className="pl-8"/></FormControl>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category (Optional)</FormLabel>
                     <FormControl><Input placeholder="e.g., Blood Work, Gynecology" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl><Input placeholder="Brief description of the test" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (editingTest ? "Save Changes" : "Add Test")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
