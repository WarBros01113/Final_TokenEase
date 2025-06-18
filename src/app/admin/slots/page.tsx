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
import { PlusCircle, Edit, Trash2, CalendarClock, Users } from "lucide-react";
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Checkbox } from "@/components/ui/checkbox";

const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const slotFormSchema = z.object({
  id: z.string().optional(),
  doctorId: z.string().min(1, "Doctor is required."),
  dayOfWeek: z.string().min(1, "Day of week is required."),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid start time (HH:MM)."),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Invalid end time (HH:MM)."),
  slotDurationMinutes: z.number().min(5, "Duration must be at least 5 minutes.").max(120),
  capacityPerSlot: z.number().min(1, "Capacity must be at least 1.").max(50), // Max patients per individual generated slot
}).refine(data => data.startTime < data.endTime, {
  message: "End time must be after start time.",
  path: ["endTime"],
});

type SlotFormValues = z.infer<typeof slotFormSchema>;

interface SlotConfig extends SlotFormValues {
  id: string;
  doctorName?: string; // For display
}

// Mock doctors for selection
const mockDoctors = [
  { id: "doc1", name: "Dr. Alice Smith" },
  { id: "doc2", name: "Dr. Bob Johnson" },
];

export default function ManageSlotsPage() {
  const { toast } = useToast();
  const [slotConfigs, setSlotConfigs] = useState<SlotConfig[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingSlotConfig, setEditingSlotConfig] = useState<SlotConfig | null>(null);

  const form = useForm<SlotFormValues>({
    resolver: zodResolver(slotFormSchema),
    defaultValues: { doctorId: "", dayOfWeek: "", startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, capacityPerSlot: 15 },
  });

   useEffect(() => {
    setSlotConfigs([
      { id: "slotcfg1", doctorId: "doc1", doctorName: "Dr. Alice Smith", dayOfWeek: "Monday", startTime: "09:00", endTime: "12:00", slotDurationMinutes: 30, capacityPerSlot: 10 },
      { id: "slotcfg2", doctorId: "doc1", doctorName: "Dr. Alice Smith", dayOfWeek: "Wednesday", startTime: "14:00", endTime: "17:00", slotDurationMinutes: 20, capacityPerSlot: 15 },
      { id: "slotcfg3", doctorId: "doc2", doctorName: "Dr. Bob Johnson", dayOfWeek: "Tuesday", startTime: "10:00", endTime: "13:00", slotDurationMinutes: 15, capacityPerSlot: 5 },
    ]);
  }, []);

  const handleDialogOpen = (slotConfig?: SlotConfig) => {
    if (slotConfig) {
      setEditingSlotConfig(slotConfig);
      form.reset(slotConfig);
    } else {
      setEditingSlotConfig(null);
      form.reset({ doctorId: "", dayOfWeek: "", startTime: "09:00", endTime: "17:00", slotDurationMinutes: 30, capacityPerSlot: 15 });
    }
    setIsDialogOpen(true);
  };

  const onSubmit = async (values: SlotFormValues) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const doctor = mockDoctors.find(d => d.id === values.doctorId);
    if (editingSlotConfig) {
      setSlotConfigs(slotConfigs.map(sc => sc.id === editingSlotConfig.id ? { ...editingSlotConfig, ...values, doctorName: doctor?.name } : sc));
      toast({ title: "Slot Configuration Updated" });
    } else {
      const newSlotConfig: SlotConfig = { ...values, id: `slotcfg${Date.now()}`, doctorName: doctor?.name };
      setSlotConfigs([...slotConfigs, newSlotConfig]);
      toast({ title: "Slot Configuration Added" });
    }
    setIsDialogOpen(false);
    form.reset();
  };

  const handleDeleteSlotConfig = async (slotConfigId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setSlotConfigs(slotConfigs.filter(sc => sc.id !== slotConfigId));
    toast({ title: "Slot Configuration Deleted", variant: "destructive" });
  };


  return (
    <div className="space-y-6">
      <PageHeader title="Manage Doctor Slots" description="Define doctors' availability schedules and slot capacities.">
        <Button onClick={() => handleDialogOpen()}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Slot Configuration
        </Button>
      </PageHeader>

       <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Slot Configurations</CardTitle>
          <CardDescription>List of defined availability schedules for doctors.</CardDescription>
        </CardHeader>
        <CardContent>
          {slotConfigs.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
                <CalendarClock className="mx-auto h-12 w-12 mb-4"/>
                <p>No slot configurations found. Add one to define doctor availability.</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Doctor</TableHead>
                <TableHead>Day</TableHead>
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
                  <TableCell>{sc.dayOfWeek}</TableCell>
                  <TableCell>{sc.startTime} - {sc.endTime}</TableCell>
                  <TableCell>{sc.slotDurationMinutes} mins</TableCell>
                  <TableCell>{sc.capacityPerSlot} patients</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button variant="ghost" size="icon" onClick={() => handleDialogOpen(sc)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive/80" onClick={() => handleDeleteSlotConfig(sc.id)}>
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
              Define a recurring availability block for a doctor. Individual slots will be generated based on this. Max 15 patients per generated slot.
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
                        {mockDoctors.map(doc => <SelectItem key={doc.id} value={doc.id}>{doc.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Day of Week</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select a day" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {daysOfWeek.map(day => <SelectItem key={day} value={day}>{day}</SelectItem>)}
                      </SelectContent>
                    </Select>
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
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="capacityPerSlot"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Patients Per Slot (e.g., 30 min slot)</FormLabel>
                    <FormControl><Input type="number" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
                    <FormDescription>This is the capacity for each generated slot (e.g. 9:00-9:30). The system caps this at 15.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                <Button type="submit" className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {form.formState.isSubmitting ? "Saving..." : (editingSlotConfig ? "Save Changes" : "Add Configuration")}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
