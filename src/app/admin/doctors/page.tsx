
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Edit, Trash2, UserPlus, Eye, Users as UsersIcon, Loader2, Clock, Briefcase } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, orderBy, query as firestoreQuery } from "@/lib/firebase";

const doctorFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Name must be at least 2 characters."),
  email: z.string().email("Invalid email address."),
  experience: z.coerce.number().min(0, "Experience cannot be negative.").default(0),
  phoneNumber: z.string().regex(/^\d{10}$/, "Phone number must be 10 digits.").optional().or(z.literal('')),
  availabilityStartTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time (HH:MM format)."),
  availabilityEndTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time (HH:MM format)."),
}).refine(data => {
    if (data.availabilityStartTime && data.availabilityEndTime) {
        return data.availabilityStartTime < data.availabilityEndTime;
    }
    return true; // Pass if one or both are not yet defined (during initial form fill)
}, {
  message: "End time must be after start time.",
  path: ["availabilityEndTime"],
});


type DoctorFormValues = z.infer<typeof doctorFormSchema>;

interface Doctor extends DoctorFormValues {
  id: string;
  createdAt?: any; 
}

export default function ManageDoctorsPage() {
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<DoctorFormValues>({
    resolver: zodResolver(doctorFormSchema),
    defaultValues: { 
        name: "", 
        email: "", 
        experience: 0, 
        phoneNumber: "", 
        availabilityStartTime: "09:00", 
        availabilityEndTime: "18:00" 
    },
  });

  const fetchDoctors = useCallback(async () => {
    setIsLoading(true);
    try {
      const doctorsCollection = collection(db, "doctors");
      const q = firestoreQuery(doctorsCollection, orderBy("name", "asc"));
      const querySnapshot = await getDocs(q);
      const fetchedDoctors: Doctor[] = [];
      querySnapshot.forEach((doc) => {
        fetchedDoctors.push({ id: doc.id, ...doc.data() } as Doctor);
      });
      setDoctors(fetchedDoctors);
    } catch (error) {
      console.error("Error fetching doctors: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch doctors." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  const handleDialogOpen = (doctor?: Doctor) => {
    if (doctor) {
      setEditingDoctor(doctor);
      form.reset({
        ...doctor,
        experience: doctor.experience ?? 0,
        phoneNumber: doctor.phoneNumber ?? "",
        availabilityStartTime: doctor.availabilityStartTime || "09:00",
        availabilityEndTime: doctor.availabilityEndTime || "18:00",
      });
    } else {
      setEditingDoctor(null);
      form.reset({ 
          name: "", 
          email: "", 
          experience: 0, 
          phoneNumber: "", 
          availabilityStartTime: "09:00", 
          availabilityEndTime: "18:00" 
      });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: DoctorFormValues) => {
    setIsSubmitting(true);
    const doctorData = { ...values };
    try {
      if (editingDoctor) {
        const doctorRef = doc(db, "doctors", editingDoctor.id);
        await updateDoc(doctorRef, doctorData);
        toast({ title: "Doctor Updated", description: `${values.name} has been updated.` });
      } else {
        await addDoc(collection(db, "doctors"), { ...doctorData, createdAt: serverTimestamp() });
        toast({ title: "Doctor Added", description: `${values.name} has been added.` });
      }
      fetchDoctors();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
      console.error("Error saving doctor: ", error);
      toast({ variant: "destructive", title: "Save Error", description: error.message || "Could not save doctor details." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDoctor = async (doctorId: string, doctorName: string) => {
    if (!window.confirm(`Are you sure you want to delete Dr. ${doctorName}?`)) return;
    try {
      await deleteDoc(doc(db, "doctors", doctorId));
      toast({ title: "Doctor Deleted", description: `Dr. ${doctorName} has been removed.`, variant: "destructive" });
      fetchDoctors();
    } catch (error) {
      console.error("Error deleting doctor: ", error);
      toast({ variant: "destructive", title: "Delete Error", description: "Could not delete doctor." });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading doctors...</p>
      </div>
    );
  }

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
                <UsersIcon className="mx-auto h-12 w-12 mb-4"/>
                <p>No doctors found. Add a new doctor to get started.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Experience (Years)</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>General Availability</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {doctors.map((doctor) => (
                <TableRow key={doctor.id}>
                  <TableCell className="font-medium">{doctor.name}</TableCell>
                  <TableCell>{doctor.email}</TableCell>
                  <TableCell>{doctor.experience !== undefined ? doctor.experience : 'N/A'}</TableCell>
                  <TableCell>{doctor.phoneNumber || 'N/A'}</TableCell>
                  <TableCell>
                    {doctor.availabilityStartTime && doctor.availabilityEndTime
                      ? `${doctor.availabilityStartTime} - ${doctor.availabilityEndTime}`
                      : 'Not Set'}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => toast({title: "View Doctor", description: "View doctor details not implemented."})}>
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(doctor)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleDeleteDoctor(doctor.id, doctor.name)}>
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
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingDoctor ? "Edit Doctor" : "Add New Doctor"}</DialogTitle>
            <DialogDescription>
              {editingDoctor ? "Update the doctor's details." : "Fill in the details for the new doctor."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Dr. Jane Doe" {...field} /></FormControl>
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
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex items-center"><Briefcase className="mr-2 h-4 w-4"/>Experience (Years)</FormLabel>
                    <FormControl><Input type="number" placeholder="e.g., 5" {...field} /></FormControl>
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
              
              <FormItem>
                <FormLabel className="flex items-center"><Clock className="mr-2 h-4 w-4"/>General Daily Availability</FormLabel>
                <FormDescription>Define the doctor's typical daily start and end working hours.</FormDescription>
                <div className="grid grid-cols-2 gap-4 mt-2">
                    <FormField
                    control={form.control}
                    name="availabilityStartTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>Start Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                    <FormField
                    control={form.control}
                    name="availabilityEndTime"
                    render={({ field }) => (
                        <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                        </FormItem>
                    )}
                    />
                </div>
              </FormItem>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (editingDoctor ? "Save Changes" : "Add Doctor")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
