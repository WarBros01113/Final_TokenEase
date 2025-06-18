"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, CheckCircle, Clock, Users, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";

const appointmentFormSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor."),
  date: z.date({ required_error: "Please select a date." }),
  timeSlotId: z.string().min(1, "Please select a time slot."),
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

// Mock data
const mockDoctors = [
  { id: "doc1", name: "Dr. Alice Smith", specialization: "Cardiologist" },
  { id: "doc2", name: "Dr. Bob Johnson", specialization: "Pediatrician" },
  { id: "doc3", name: "Dr. Carol Williams", specialization: "Dermatologist" },
];

const mockTimeSlots = [
  { id: "slot1", time: "09:00 AM - 09:30 AM", available: true, capacity: 15, booked: 5 },
  { id: "slot2", time: "09:30 AM - 10:00 AM", available: true, capacity: 15, booked: 12 },
  { id: "slot3", time: "10:00 AM - 10:30 AM", available: false, capacity: 15, booked: 15 },
  { id: "slot4", time: "10:30 AM - 11:00 AM", available: true, capacity: 15, booked: 2 },
];

const mockBookedAppointments = [
  { id: "appt1", doctorName: "Dr. Alice Smith", date: "2024-08-20", time: "09:00 AM", status: "Upcoming", type: "In-Person" },
  { id: "appt2", doctorName: "Dr. Bob Johnson", date: "2024-08-22", time: "10:30 AM", status: "Upcoming", type: "Video Call" },
  { id: "appt3", doctorName: "Dr. Carol Williams", date: "2024-07-15", time: "02:00 PM", status: "Completed", type: "In-Person" },
];


export default function AppointmentsPage() {
  const { toast } = useToast();
  const [selectedDoctor, setSelectedDoctor] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState(mockTimeSlots); // This would be fetched based on doctor and date
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
  });

  const { control, handleSubmit, watch, reset } = form;
  const selectedDate = watch("date");

  useEffect(() => {
    if (selectedDoctor && selectedDate) {
      // In a real app, fetch available slots for the selected doctor and date
      // For now, just use mockTimeSlots and filter or modify as needed
      console.log("Fetching slots for", selectedDoctor, selectedDate.toDateString());
      // Example: randomly make some slots unavailable based on date/doctor
      const updatedSlots = mockTimeSlots.map(slot => ({
        ...slot,
        available: Math.random() > 0.3 && (slot.capacity - slot.booked > 0), 
      }));
      setAvailableSlots(updatedSlots);
    }
  }, [selectedDoctor, selectedDate]);

  async function onSubmit(data: AppointmentFormValues) {
    setIsSubmitting(true);
    console.log("Booking appointment:", data);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Simulate checking capacity (15 patients per doctor per slot)
    const selectedSlot = availableSlots.find(slot => slot.id === data.timeSlotId);
    if (selectedSlot && selectedSlot.booked >= selectedSlot.capacity) {
        toast({
            variant: "destructive",
            title: "Booking Failed",
            description: "Selected time slot is full. Please choose another.",
        });
        setIsSubmitting(false);
        return;
    }

    // Mock penalty check - assume this is handled server-side
    // For now, always successful if slot is not full
    const hasPenalty = false; // Math.random() > 0.8; // Simulate 20% chance of penalty
    if (hasPenalty) {
         toast({
            variant: "destructive",
            title: "Booking Blocked",
            description: "You have too many missed appointments. Booking is temporarily disabled.",
        });
        setIsSubmitting(false);
        return;
    }

    toast({
      title: "Appointment Booked!",
      description: `Your appointment with Dr. ${mockDoctors.find(doc => doc.id === data.doctorId)?.name} on ${data.date.toLocaleDateString()} at ${availableSlots.find(slot => slot.id === data.timeSlotId)?.time} is confirmed.`,
      action: <CheckCircle className="text-green-500" />,
    });
    reset(); // Reset form
    setSelectedDoctor(null); 
    setIsSubmitting(false);
    // Potentially refetch booked appointments here or navigate
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Book new appointments and manage existing ones.">
        {/* Optional: Add a quick action button here if needed */}
      </PageHeader>

      <Tabs defaultValue="book">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2">
          <TabsTrigger value="book">Book Appointment</TabsTrigger>
          <TabsTrigger value="view">My Appointments</TabsTrigger>
        </TabsList>
        <TabsContent value="book">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center"><CalendarPlus className="mr-2 h-6 w-6 text-primary" /> Book a New Appointment</CardTitle>
              <CardDescription>Select a doctor, date, and time slot for your appointment.</CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                  <FormField
                    control={control}
                    name="doctorId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Select Doctor</FormLabel>
                        <Select onValueChange={(value) => { field.onChange(value); setSelectedDoctor(value); }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a doctor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {mockDoctors.map(doc => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.name} ({doc.specialization})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedDoctor && (
                    <FormField
                      control={control}
                      name="date"
                      render={({ field }) => (
                        <FormItem className="flex flex-col">
                          <FormLabel>Select Date</FormLabel>
                          <FormControl>
                            <Calendar
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() - 1)) } // Disable past dates
                              initialFocus
                              className="rounded-md border self-start"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedDoctor && selectedDate && (
                    <FormField
                      control={control}
                      name="timeSlotId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Available Time Slots</FormLabel>
                          {availableSlots.length > 0 ? (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {availableSlots.map(slot => (
                                <Button
                                  key={slot.id}
                                  type="button"
                                  variant={field.value === slot.id ? "default" : "outline"}
                                  onClick={() => field.onChange(slot.id)}
                                  disabled={!slot.available || (slot.booked >= slot.capacity)}
                                  className={`w-full h-auto py-3 flex flex-col items-center justify-center ${!slot.available || (slot.booked >= slot.capacity) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <span className="text-sm font-medium">{slot.time}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {slot.available && (slot.capacity - slot.booked > 0) ? `${slot.capacity - slot.booked} spots left` : 'Full / Unavailable'}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <p className="text-muted-foreground">No slots available for this date/doctor. Please try another selection.</p>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <Button type="submit" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || !selectedDoctor || !selectedDate || !watch("timeSlotId")}>
                    {isSubmitting ? "Booking..." : "Book Appointment"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="view">
          <Card className="shadow-lg">
            <CardHeader>
              <CardTitle>Your Booked Appointments</CardTitle>
              <CardDescription>Review your upcoming and past appointments.</CardDescription>
            </CardHeader>
            <CardContent>
              {mockBookedAppointments.length > 0 ? (
                <div className="space-y-4">
                  {mockBookedAppointments.map(appt => (
                    <Card key={appt.id} className={`p-4 ${appt.status === 'Completed' ? 'bg-muted/50' : 'bg-secondary/30'}`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <h3 className="font-semibold text-primary">{appt.doctorName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appt.date).toLocaleDateString()} at {appt.time}
                          </p>
                          <p className="text-xs">Type: {appt.type === 'In-Person' ? 
                            <span className="inline-flex items-center"><Users className="w-3 h-3 mr-1"/>In-Person</span> : 
                            <span className="inline-flex items-center"><Video className="w-3 h-3 mr-1"/>Video Call</span>}
                          </p>
                        </div>
                        <div className="flex flex-col items-start sm:items-end">
                           <span className={`px-2 py-1 text-xs rounded-full font-medium
                            ${appt.status === 'Upcoming' ? 'bg-blue-100 text-blue-700' :
                              appt.status === 'Completed' ? 'bg-green-100 text-green-700' :
                              'bg-gray-100 text-gray-700'}`}>
                            {appt.status}
                          </span>
                          {appt.status === 'Upcoming' && (
                            <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                                <Link href={`/app/appointments/${appt.id}/status`}>View Details/Track Token</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-8">You have no booked appointments.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
