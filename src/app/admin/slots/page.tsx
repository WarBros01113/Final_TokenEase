
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
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { db, collection, getDocs, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, query as firestoreQuery, orderBy, where } from "@/lib/firebase";

const daysOfWeekOptions = [
  { id: "Monday", label: "Monday" },
  { id: "Tuesday", label: "Tuesday" },
  { id: "Wednesday", label: "Wednesday" },
  { id: "Thursday", label: "Thursday" },
  { id: "Friday", label: "Friday" },
  { id: "Saturday", label: "Saturday" },
  { id: "Sunday", label: "Sunday" },
];

const slotFormSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string().min(1, "Doctor is required."),
  dayOfWeek: z.array(z.string()).nonempty({ message: "Please select at least one day." }),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time (HH:MM)."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time (HH:MM)."),
  slotDurationMinutes: z.coerce.number().min(5, "Duration must be at least 5 minutes.").max(120),
  capacityPerSlot: z.coerce.number().min(1, "Capacity must be at least 1.").max(15, "Capacity cannot exceed 15."),
}).refine(data => data.startTime < data.endTime, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

type SlotFormValues = z.infer<typeof slotFormSchema>;

interface DoctorOption {
  id: string;
  name: string;
}

interface SlotConfig extends Omit<SlotFormValues, 'dayOfWeek'> {
  id: string;
  dayOfWeek: string[];
  doctorName?: string;
  createdAt?: any;
}

export default function ManageSlotsPage() {
  const { toast } = useToast();
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>([]);
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlotConfig, setEditingSlotConfig] = useState<SlotConfig | null>(null);
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isSlotConfigLoading, setIsSlotConfigLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<SlotFormValues>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: { doctorId: "", dayOfWeek: [], startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, capacityPerSlot: 1 },
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
    if (doctors.length === 0) {
        setSlotConfigs([]);
        setIsSlotConfigLoading(false);
        return;
    }
    setIsSlotConfigLoading(true);
    try {
      const slotsSnapshot = await getDocs(firestoreQuery(collection(db, "slotConfigurations"), orderBy("doctorId", "asc"), orderBy("startTime", "asc")));
      const fetchedConfigs: SlotConfig[] = [];
      const doctorNameMap = new Map(doctors.map(d => [d.id, d.name]));
      slotsSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        fetchedConfigs.push({
            id: docSnap.id,
            ...data,
            dayOfWeek: Array.isArray(data.dayOfWeek) ? data.dayOfWeek : (typeof data.dayOfWeek === 'string' ? [data.dayOfWeek] : []),
            doctorName: doctorNameMap.get(data.doctorId) || data.doctorId
        } as SlotConfig);
      });
      setSlotConfigs(fetchedConfigs);
    } catch (error: any) {
      console.error("Error fetching slot configurations: ", error);
      if (error.code === "failed-precondition" || (error.message && error.message.includes("firestore/failed-precondition"))) {
         toast({ variant: "destructive", title: "Firestore Index Required", description: "A Firestore index is needed for slot configurations (doctorId asc, startTime asc). Please check the console for a link to create it, or create it manually.", duration: 10000 });
         console.warn("Firestore query requires an index. Please create it using the link in the Firebase console error message or create it manually: collection 'slotConfigurations', fields: 'doctorId' (Ascending), 'startTime' (Ascending).");
      } else {
        toast({ variant: "destructive", title: "Error", description: "Could not fetch slot configurations." });
      }
    } finally {
      setIsSlotConfigLoading(false);
    }
  }, [toast, doctors]);

  useEffect(() => {
    fetchDoctors();
  }, [fetchDoctors]);

  useEffect(() => {
    if (!isLoadingDoctors && doctors.length > 0) {
        fetchSlotConfigs();
    } else if (!isLoadingDoctors && doctors.length === 0) {
        setSlotConfigs([]);
        // setIsSlotConfigLoading(false); // This was already being set in fetchSlotConfigs, avoid potential conflicts
    }
  }, [doctors, fetchSlotConfigs, isLoadingDoctors]);


  const handleDialogOpen = (slotConfig?: SlotConfig) => {
    if (slotConfig) {
      setEditingSlotConfig(slotConfig);
      form.reset({
        ...slotConfig,
        dayOfWeek: Array.isArray(slotConfig.dayOfWeek) ? slotConfig.dayOfWeek : (typeof slotConfig.dayOfWeek === 'string' ? [slotConfig.dayOfWeek] : [])
      });
    } else {
      setEditingSlotConfig(null);
      form.reset({ doctorId: "", dayOfWeek: [], startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, capacityPerSlot: 1 });
    }
    setIsDialogOpen(true);
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
      fetchSlotConfigs();
      setIsDialogOpen(false);
      form.reset();
    } catch (error: any) {
        console.error("Error saving slot config:", error);
        toast({variant: "destructive", title: "Save Error", description: error.message || "Could not save slot configuration."})
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleDeleteSlotConfig = async (slotConfigId: string, doctorName?: string) => {
    const confirmMessage = doctorName
      ? `Are you sure you want to delete this slot configuration for Dr. ${doctorName}?`
      : "Are you sure you want to delete this slot configuration?";

    if (!window.confirm(confirmMessage)) {
      console.log("Deletion cancelled by user for slotConfigId:", slotConfigId);
      return;
    }

    console.log("Attempting to delete slotConfigId:", slotConfigId, "for doctor:", doctorName || "Unknown");
    try {
        await deleteDoc(doc(db, "slotConfigurations", slotConfigId));
        toast({ title: "Slot Configuration Deleted", description: `Slot for ${doctorName || 'selected doctor'} removed.`, variant: "default" });
        console.log("Successfully deleted slotConfigId:", slotConfigId);
        fetchSlotConfigs(); // Refresh list
    } catch (error: any) {
        console.error("Error deleting slot config (slotConfigId:", slotConfigId, "): ", error);
        toast({variant: "destructive", title: "Delete Error", description: `Could not delete slot configuration: ${error.message || 'Unknown error'}. Check console for details.`})
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
      <PageHeader title="Manage Doctor Slots" description="Define doctors' availability schedules and slot capacities.">
        <Button onClick={() => handleDialogOpen()} disabled={doctors.length === 0}>
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
                <p className="text-xs mt-1">If you are seeing this after creating an index, it might take a few minutes for the index to activate.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead>Days</TableHead>
                <TableHead>Time Range</TableHead>
                <TableHead>Slot Duration</TableHead>
                <TableHead>Capacity/Slot</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slotConfigs.map((sc) => (
                <TableRow key={sc.id}>
                  <TableCell className="font-medium">{sc.doctorName || sc.doctorId}</TableCell>
                  <TableCell>{(Array.isArray(sc.dayOfWeek) ? sc.dayOfWeek.join(', ') : sc.dayOfWeek) || 'N/A'}</TableCell>
                  <TableCell>{sc.startTime} - {sc.endTime}</TableCell>
                  <TableCell>{sc.slotDurationMinutes} mins</TableCell>
                  <TableCell>{sc.capacityPerSlot} patients</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(sc)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleDeleteSlotConfig(sc.id, sc.doctorName)}>
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
            <DialogTitle>{editingSlotConfig ? "Edit Slot Configuration" : "Add New Slot Configuration"}</DialogTitle>
            <DialogDescription>
              Define a recurring availability block for a doctor. Max 15 patients per generated slot.
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
                render={({ field }) => ( // Pass field here for Checkbox group
                  <FormItem>
                    <div className="mb-2">
                      <FormLabel className="text-base flex items-center"><CalendarDays className="mr-2 h-4 w-4"/>Days of Week</FormLabel>
                      <FormDescription>
                        Select the days this configuration applies to.
                      </FormDescription>
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 p-2 border rounded-md">
                      {daysOfWeekOptions.map((day) => (
                        <FormField
                          key={day.id}
                          control={form.control}
                          name="dayOfWeek" // Individual Checkbox also needs to be part of the form field array
                          render={({ field: checkboxField }) => { // field specific to this checkbox instance
                            return (
                              <FormItem
                                key={day.id}
                                className="flex flex-row items-center space-x-2 space-y-0 bg-secondary/30 p-2 rounded"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={checkboxField.value?.includes(day.id)}
                                    onCheckedChange={(checked) => {
                                      const currentValue = checkboxField.value || [];
                                      return checked
                                        ? checkboxField.onChange([...currentValue, day.id])
                                        : checkboxField.onChange(
                                            currentValue.filter(
                                              (value) => value !== day.id
                                            )
                                          );
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="text-sm font-normal whitespace-nowrap">
                                  {day.label}
                                </FormLabel>
                              </FormItem>
                            );
                          }}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                    control={form.control}
                    name="startTime"
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
                    name="endTime"
                    render={({ field }) => (
                    <FormItem>
                        <FormLabel>End Time</FormLabel>
                        <FormControl><Input type="time" {...field} /></FormControl>
                        <FormMessage />
                    </FormItem>
                    )}
                />
              </div>
              <FormField
                control={form.control}
                name="slotDurationMinutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slot Duration (minutes)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacityPerSlot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Patients Per Individual Slot</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormDescription>Capacity for each generated slot (e.g. 9:00-9:30). System cap: 15.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : (editingSlotConfig ? "Save Changes" : "Add Configuration")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

    