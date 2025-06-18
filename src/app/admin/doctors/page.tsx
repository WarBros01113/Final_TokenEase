"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Edit, Trash2, UserPlus, Eye } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";

const doctorFormSchema = z.object({
  id: z.string().optional(), // For editing
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  specialization: z.string().min(2, "Specialization is required."),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits.").optional().or(z.literal('')),
  availabilityNotes: z.string().optional(), // e.g. "Mon-Fri, 9am-5pm"
});

type DoctorFormValues = z.infer<typeof doctorFormSchema>;

interface Doctor extends DoctorFormValues {
  id: string; // Ensure id is always present after creation
}

const mockSpecializations = ["Cardiology", "Pediatrics", "Dermatology", "Orthopedics", "Neurology", "General Medicine"];

export default function ManageDoctorsPage() {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: { name: "", email: "", specialization: "", phoneNumber: "", availabilityNotes: "" },
  });

  useEffect(() => {
    // Mock fetch doctors
    setDoctors([
      { id: "doc1", name: "Dr. Alice Smith", email: "alice@example.com", specialization: "Cardiology", phoneNumber: "1234567890", availabilityNotes: "Mon, Wed, Fri 9am-1pm" },
      { id: "doc2", name: "Dr. Bob Johnson", email: "bob@example.com", specialization: "Pediatrics", phoneNumber: "0987654321", availabilityNotes: "Tue, Thu 10am-4pm" },
    ]);
  }, []);

  const handleDialogOpen = (doctor?: Doctor) => {
    if (doctor) {
      setEditingDoctor(doctor);
      form.reset(doctor);
    } else {
      setEditingDoctor(null);
      form.reset({ name: "", email: "", specialization: "", phoneNumber: "", availabilityNotes: "" });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: DoctorFormValues) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    if (editingDoctor) {
      setDoctors(doctors.map(d => d.id === editingDoctor.id ? { ...editingDoctor, ...values } : d));
      toast({ title: "Doctor Updated", description: `${values.name} has been updated.` });
    } else {
      const newDoctor = { ...values, id: `doc${Date.now()}` } as Doctor;
      setDoctors([...doctors, newDoctor]);
      toast({ title: "Doctor Added", description: `${values.name} has been added.` });
    }
    setIsDialogOpen(false);
    form.reset();
  };

  const handleDeleteDoctor = async (doctorId: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setDoctors(doctors.filter(d => d.id !== doctorId));
    toast({ title: "Doctor Deleted", description: "The doctor has been removed.", variant: "destructive" });
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Doctors" description="Add, edit, or remove doctors from the system.">
        <Button onClick={() => handleDialogOpen()}>
          <UserPlus className="mr-2 h-4 w-4" /> Add New Doctor
        </Button>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Doctor List</CardTitle>
          <CardDescription>A list of all registered doctors in the clinic.</CardDescription>
        </CardHeader>
        <CardContent>
          {doctors.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
                <Users className="mx-auto h-12 w-12 mb-4"/>
                <p>No doctors found. Add a new doctor to get started.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Specialization</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Availability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">{doctor.name}</TableCell>
                  <TableCell>{doctor.email}</TableCell>
                  <TableCell>{doctor.specialization}</TableCell>
                  <TableCell>{doctor.phoneNumber || 'N/A'}</TableCell>
                  <TableCell>{doctor.availabilityNotes || 'N/A'}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => {/* View details logic */ toast({title: "View Doctor", description: "View doctor details not implemented."})}}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(doctor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleDeleteDoctor(doctor.id)}>
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
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? "Edit Doctor" : "Add New Doctor"}</DialogTitle>
            <DialogDescription>
              {editingDoctor ? "Update the doctor's details." : "Fill in the details for the new doctor."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Dr. John Doe" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Address</FormLabel>
                    <FormControl><Input type="email" placeholder="doctor@example.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select specialization" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mockSpecializations.map(spec => (
                            <SelectItem key={spec} value={spec}>{spec}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="phoneNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl><Input type="tel" placeholder="1234567890" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="availabilityNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Availability Notes (Optional)</FormLabel>
                    <FormControl><Input placeholder="e.g., Mon-Fri, 9am-12pm" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {form.formState.isSubmitting ? "Saving..." : (editingDoctor ? "Save Changes" : "Add Doctor")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
