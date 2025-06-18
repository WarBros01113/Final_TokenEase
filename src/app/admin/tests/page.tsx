"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Edit, Trash2, FlaskConical, DollarSign } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const testFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Test name must be at least 2 characters."),
  price: z.coerce.number().min(0, "Price cannot be negative."), // coerce to number
  description: z.string().optional(),
  category: z.string().optional(),
});

type TestFormValues = z.infer<typeof testFormSchema>;

interface Test extends TestFormValues {
  id: string;
}

const mockTestCategories = ["Blood Work", "Imaging", "Cardiology", "Pathology", "General Checkup"];


export default function ManageTestsPage() {
  const { toast } = useToast();
  const [tests, setTests] = useState<Test[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);

  const form = useForm<TestFormValues>({
    resolver: zodResolver(testFormSchema),
    defaultValues: { name: "", price: 0, description: "", category: "" },
  });

  useEffect(() => {
    setTests([
      { id: "test1", name: "Complete Blood Count (CBC)", price: 50, category: "Blood Work", description: "Measures different components of blood." },
      { id: "test2", name: "X-Ray Chest PA View", price: 75, category: "Imaging", description: "Basic chest imaging." },
      { id: "test3", name: "ECG (Electrocardiogram)", price: 120, category: "Cardiology", description: "Records electrical activity of the heart." },
    ]);
  }, []);

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
    await new Promise(resolve => setTimeout(resolve, 500));
    if (editingTest) {
      setTests(tests.map(t => t.id === editingTest.id ? { ...editingTest, ...values } : t));
      toast({ title: "Test Updated", description: `${values.name} has been updated.` });
    } else {
      const newTest = { ...values, id: `test${Date.now()}` } as Test;
      setTests([...tests, newTest]);
      toast({ title: "Test Added", description: `${values.name} has been added.` });
    }
    setIsDialogOpen(false);
    form.reset();
  };

  const handleDeleteTest = async (testId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setTests(tests.filter(t => t.id !== testId));
    toast({ title: "Test Deleted", description: "The test has been removed.", variant: "destructive" });
  };


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
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleDeleteTest(test.id)}>
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
                        <FormControl><Input type="number" placeholder="0.00" {...field} className="pl-8"/></FormControl>
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
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select a category" /></SelectTrigger></FormControl>
                        <SelectContent>
                            {mockTestCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                        </SelectContent>
                    </Select>
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
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {form.formState.isSubmitting ? "Saving..." : (editingTest ? "Save Changes" : "Add Test")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
