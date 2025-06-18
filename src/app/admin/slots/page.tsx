
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { PlusCircle, Edit, Trash2, CalendarClock, Loader2, CalendarDays } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query as firestoreQuery, orderBy } from "@/lib/firebase";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const daysOfWeekOptions = [
  { id: "Monday", label: "Monday" },
  { id: "Tuesday", label: "Tuesday" },
  { id: "Wednesday", label: "Wednesday" },
  { id: "Thursday", label: "Thursday" },
  { id: "Friday", label: "Friday" },
  { id: "Saturday", label: "Saturday" },
  { id: "Sunday", label: "Sunday" },
];

const generateTimeSlotCheckboxOptions = () => {
  const options = [];
  const startHour = 9;
  const endHour = 18; // Slots up to 17:45 (ends before 18:00)

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
      options.push({ id: time, label: time });
    }
  }
  return options;
};
const timeSlotCheckboxOptions = generateTimeSlotCheckboxOptions();


const slotFormSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string().min(1, "Doctor is required."),
  dayOfWeek: z.array(z.string()).nonempty({ message: "Please select at least one day of the week." }),
  selectedSlots: z.array(z.string()).nonempty({ message: "Please select at least one time slot." }),
  capacityPerSlot: z.coerce.number().min(1, "Capacity must be at least 1.").max(15, "Capacity cannot exceed 15."),
});

type SlotFormValues = z.infer<typeof slotFormSchema>;

interface DoctorOption {
  id: string;
  name: string;
}

interface SlotConfig extends SlotFormValues {
  id: string; 
  doctorName?: string;
  createdAt?: any; 
}

export default function ManageSlotsPage() {
  const { toast } = useToast();
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [editingSlotConfig, setEditingSlotConfig] = useState<SlotConfig | null>(null);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isSlotConfigLoading, setIsSlotConfigLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [slotConfigIdToDelete, setSlotConfigIdToDelete] = useState<string | null>(null);
  const [slotDoctorNameToDelete, setSlotDoctorNameToDelete] = useState<string | undefined>(undefined);


  const form = useForm<SlotFormValues>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: { doctorId: "", dayOfWeek: [], selectedSlots: [], capacityPerSlot: 1 },
  });

  const fetchDoctors = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      const doctorsSnapshot = await getDocs(firestoreQuery(collection(db, "doctors"), orderBy("name")));
      const fetchedDoctors: DoctorOption[] = [];
      doctorsSnapshot.forEach(doc => fetchedDoctors.push({ id: doc.id, name: doc.data().name }));
      setDoctors(fetchedDoctors);
    } catch (error) {
      console.error("Error fetching doctors for slots: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch doctors." });
    } finally {
      setIsLoadingDoctors(false);
    }
  }, [toast]);

  const fetchSlotConfigs = useCallback(async () => {
    if (doctors.length === 0 && !isLoadingDoctors) {
        setSlotConfigs([]);
        setIsSlotConfigLoading(false);
        return;
    }
    if(doctors.length > 0) {
        setIsSlotConfigLoading(true);
        try {
          // Removed orderBy("dayOfWeek", "asc") as it's not effective for array fields
          const slotsSnapshot = await getDocs(firestoreQuery(collection(db, "slotConfigurations"), orderBy("doctorId", "asc")));
          const newConfigs: SlotConfig[] = [];
          const doctorNameMap = new Map(doctors.map(d => [d.id, d.name]));

          slotsSnapshot.forEach(docSnap => {
            const data = docSnap.data();
            
            let dayOfWeekValue: string[] = []; 
            const rawDayOfWeek = data.dayOfWeek;
            if (Array.isArray(rawDayOfWeek)) {
                dayOfWeekValue = rawDayOfWeek.filter(day => typeof day === 'string');
            } else if (typeof rawDayOfWeek === 'string' && rawDayOfWeek) {
                dayOfWeekValue = [rawDayOfWeek]; // Convert legacy string to array
            }
            
            newConfigs.push({
                id: docSnap.id,
                doctorId: data.doctorId,
                dayOfWeek: dayOfWeekValue, 
                selectedSlots: Array.isArray(data.selectedSlots) ? data.selectedSlots : [],
                capacityPerSlot: typeof data.capacityPerSlot === 'number' ? data.capacityPerSlot : 1,
                doctorName: doctorNameMap.get(data.doctorId) || data.doctorId,
            });
          });
          setSlotConfigs(newConfigs);
        } catch (error: any) {
          console.error("Error fetching slot configurations: ", error);
          toast({ variant: "destructive", title: "Error", description: "Could not fetch slot configurations. A new Firestore index might be required on 'doctorId'. Check console for details.", duration: 10000 });
          if (error.message && error.message.includes("firestore/failed-precondition")) {
            console.warn("Firestore query requires an index. Please create it using the link in the Firebase console error message or create it manually: collection 'slotConfigurations', field: 'doctorId' (Ascending).");
          }
        } finally {
          setIsSlotConfigLoading(false);
        }
    }
  }, [toast, doctors, isLoadingDoctors]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (!isLoadingDoctors && doctors.length > 0) { 
        fetchSlotConfigs();
    } else if (!isLoadingDoctors && doctors.length === 0) { 
        setSlotConfigs([]);
        setIsSlotConfigLoading(false);
    }
  }, [doctors, isLoadingDoctors, fetchSlotConfigs]);


  const handleFormDialogOpen = (slotConfig?: SlotConfig) => {
    if (slotConfig) {
      setEditingSlotConfig(slotConfig);
      let daysToSet: string[] = [];
      if (Array.isArray(slotConfig.dayOfWeek)) {
        daysToSet = slotConfig.dayOfWeek;
      } else if (typeof slotConfig.dayOfWeek === 'string') {
        daysToSet = [slotConfig.dayOfWeek]; // Handle legacy string data
      }
      form.reset({
        ...slotConfig, 
        dayOfWeek: daysToSet, 
        selectedSlots: Array.isArray(slotConfig.selectedSlots) ? slotConfig.selectedSlots : []
      });
    } else {
      setEditingSlotConfig(null);
      form.reset({ doctorId: "", dayOfWeek: [], selectedSlots: [], capacityPerSlot: 1 });
    }
    setIsFormDialogOpen(true);
  };

  const onSubmit = async (values: SlotFormValues) => {
    setIsSubmitting(true);
    try {
      if (editingSlotConfig) {
        const slotRef = doc(db, "slotConfigurations", editingSlotConfig.id);
        await updateDoc(slotRef, values);
        toast({ title: "Slot Configuration Updated" });
      } else {
        await addDoc(collection(db, "slotConfigurations"), { ...values, createdAt: serverTimestamp() });
        toast({ title: "Slot Configuration Added" });
      }
      if (doctors.length > 0) {
        fetchSlotConfigs();
      }
      setIsFormDialogOpen(false);
      form.reset();
    } catch (error: any) {
        console.error("Error saving slot config:", error);
        toast({variant: "destructive", title: "Save Error", description: error.message || "Could not save slot configuration."})
    } finally {
        setIsSubmitting(false);
    }
  };

  const openDeleteDialog = (slotConfigId: string, doctorName?: string) => {
    setSlotConfigIdToDelete(slotConfigId);
    setSlotDoctorNameToDelete(doctorName);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteSlotConfig = async () => {
    if (!slotConfigIdToDelete) return;
    try {
        await deleteDoc(doc(db, "slotConfigurations", slotConfigIdToDelete));
        toast({ title: "Slot Configuration Deleted", description: `Slot config for ${slotDoctorNameToDelete || 'selected doctor'} removed.`, variant: "default" });
        if (doctors.length > 0) {
            fetchSlotConfigs(); 
        } else {
            setSlotConfigs([]); 
        }
    } catch (error: any) {
        console.error("Error deleting slot config: ", error);
        toast({variant: "destructive", title: "Delete Error", description: `Could not delete slot configuration: ${error.message || 'Unknown error'}.`})
    } finally {
        setIsDeleteDialogOpen(false);
        setSlotConfigIdToDelete(null);
        setSlotDoctorNameToDelete(undefined);
    }
  };


  if (isLoadingDoctors) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Doctor Slots" description="Define doctors' availability schedules and slot capacities by selecting specific time slots.">
        <Button onClick={() => handleFormDialogOpen()} disabled={doctors.length === 0}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Slot Configuration
        </Button>
      </PageHeader>
      {doctors.length === 0 && !isLoadingDoctors && (
        <Card>
            <CardContent className="pt-6 text-center text-muted-foreground">
                <p>Please add doctors in the "Manage Doctors" section before configuring slots.</p>
            </CardContent>
        </Card>
      )}

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Slot Configurations</CardTitle>
          <CardDescription>List of defined availability schedules for doctors.</CardDescription>
        </CardHeader>
        <CardContent>
          {isSlotConfigLoading ? (
             <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2">Loading configurations...</p>
            </div>
          ) : slotConfigs.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
                <CalendarClock className="mx-auto h-12 w-12 mb-4"/>
                <p>No slot configurations found. Add one to define doctor availability.</p>
                <p className="text-xs mt-1">If you recently created a Firestore index, it might take a few minutes to activate.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Selected Slots</TableHead>
                <TableHead>Capacity/Slot</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slotConfigs.map((sc) => (
                <TableRow key={sc.id}>
                  <TableCell className="font-medium">{sc.doctorName || sc.doctorId}</TableCell>
                  <TableCell>{sc.dayOfWeek.join(', ')}</TableCell>
                  <TableCell>
                    {sc.selectedSlots.length > 0 ? `${sc.selectedSlots.length} slots (e.g., ${sc.selectedSlots.sort()[0]})` : 'None'}
                  </TableCell>
                  <TableCell>{sc.capacityPerSlot} patients</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleFormDialogOpen(sc)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => openDeleteDialog(sc.id, sc.doctorName)}>
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

      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingSlotConfig ? "Edit Slot Configuration" : "Add New Slot Configuration"}</DialogTitle>
            <DialogDescription>
              Select applicable days, then specific 15-minute time slots for a doctor. Max 15 patients per individual slot.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
              <FormField
                control={form.control}
                name="doctorId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Doctor</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a doctor" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {doctors.map(doc => <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={() => ( // No field needed directly here, use form.getValues/setValue
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel className="text-base">Days of Week</FormLabel>
                      <FormDescription>
                        Select the days this slot configuration applies to.
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 p-2 border rounded-md">
                      {daysOfWeekOptions.map((dayOption) => (
                        <FormItem
                          key={dayOption.id}
                          className="flex flex-row items-start space-x-3 space-y-0 bg-secondary/30 p-2 rounded"
                        >
                          <FormControl>
                            <Checkbox
                              checked={form.watch("dayOfWeek")?.includes(dayOption.id)}
                              onCheckedChange={(checked) => {
                                const currentDays = form.getValues("dayOfWeek") || [];
                                if (checked) {
                                  form.setValue("dayOfWeek", [...currentDays, dayOption.id].sort(), { shouldValidate: true });
                                } else {
                                  form.setValue("dayOfWeek", currentDays.filter(day => day !== dayOption.id).sort(), { shouldValidate: true });
                                }
                              }}
                            />
                          </FormControl>
                          <FormLabel className="font-normal">
                            {dayOption.label}
                          </FormLabel>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="selectedSlots"
                render={({ field }) => ( 
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel className="text-base flex items-center"><CalendarDays className="mr-2 h-4 w-4"/>Select Available 15-Minute Slots</FormLabel>
                      <FormDescription>
                        Check the boxes for time slots the doctor will be available (9:00 AM - 5:45 PM). Applies to all selected days.
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 border rounded-md max-h-60 overflow-y-auto">
                      {timeSlotCheckboxOptions.map((slotOption) => (
                        <FormItem
                            key={slotOption.id}
                            className="flex flex-row items-center space-x-2 space-y-0 bg-secondary/30 p-2 rounded"
                        >
                            <FormControl>
                            <Checkbox
                                checked={field.value?.includes(slotOption.id)}
                                onCheckedChange={(checked) => {
                                const currentValue = field.value || [];
                                return checked
                                    ? field.onChange([...currentValue, slotOption.id].sort())
                                    : field.onChange(
                                        currentValue.filter(
                                        (value) => value !== slotOption.id
                                        ).sort()
                                    );
                                }}
                            />
                            </FormControl>
                            <FormLabel className="text-sm font-normal whitespace-nowrap">
                            {slotOption.label}
                            </FormLabel>
                        </FormItem>
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacityPerSlot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Patients Per Selected Slot</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormDescription>Capacity for each checked 15-min slot. System cap: 15.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsFormDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (editingSlotConfig ? "Save Changes" : "Add Configuration")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the slot configuration
              {slotDoctorNameToDelete ? ` for Dr. ${slotDoctorNameToDelete}` : ""}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
                setSlotConfigIdToDelete(null);
                setSlotDoctorNameToDelete(undefined);
            }}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteSlotConfig} className="bg-destructive hover:bg-destructive/80">
              Yes, Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

    