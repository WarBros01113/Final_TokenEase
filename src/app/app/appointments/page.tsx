
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import { CalendarPlus, CheckCircle, Users, Video, Loader2 } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useForm, Controller } from "react-hook-form";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, addDoc, serverTimestamp, query as firestoreQuery, where, orderBy, doc, Timestamp, limit } from "@/lib/firebase";

const appointmentFormSchema = z.object({
  doctorId: z.string().min(1, "Please select a doctor."),
  date: z.date({ required_error: "Please select a date." }),
  timeSlotId: z.string().min(1, "Please select a time slot."), // This will be composite: "startTime_slotConfigId"
});

type AppointmentFormValues = z.infer<typeof appointmentFormSchema>;

interface DoctorOption {
  id: string;
  name: string;
  specialization: string;
}

interface TimeSlot {
  id: string; // Composite: "startTime_slotConfigId" e.g., "09:00_cfg123"
  time: string; // Display time e.g., "09:00 AM - 09:15 AM" (now always 15min)
  available: boolean;
  capacity: number;
  booked: number;
  slotConfigId: string; // To link back to the configuration
  startTime: string; // "HH:MM" for storing
}

interface BookedAppointment {
  id: string;
  doctorName: string;
  date: string; // ISO String
  time: string; // Display time
  status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'delayed' | 'missed';
  type: string;
  patientId: string;
  tokenNumber?: number;
}

export default function AppointmentsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [doctors, setDoctors] = useState<DoctorOption[]>([]);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<TimeSlot[]>([]);
  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointment[]>([]);

  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isLoadingBookedAppointments, setIsLoadingBookedAppointments] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentFormSchema),
  });

  const { control, handleSubmit, watch, reset, setValue } = form;
  const selectedDate = watch("date");

  const fetchDoctors = useCallback(async () => {
    setIsLoadingDoctors(true);
    try {
      const q = firestoreQuery(collection(db, "doctors"), orderBy("name"));
      const snapshot = await getDocs(q);
      const fetchedDoctors: DoctorOption[] = [];
      snapshot.forEach(doc => fetchedDoctors.push({ id: doc.id, specialization: doc.data().specialization || 'General', ...doc.data() } as DoctorOption));
      setDoctors(fetchedDoctors);
    } catch (error) {
      console.error("Error fetching doctors:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch doctors." });
    } finally {
      setIsLoadingDoctors(false);
    }
  }, [toast]);

  const fetchBookedAppointments = useCallback(async (patientId: string) => {
    setIsLoadingBookedAppointments(true);
    try {
        const q = firestoreQuery(
            collection(db, "appointments"),
            where("patientId", "==", patientId),
            orderBy("date", "desc"),
            orderBy("time", "desc")
        );
        const snapshot = await getDocs(q);
        const fetched: BookedAppointment[] = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            fetched.push({
                id: doc.id,
                doctorName: data.doctorName,
                date: data.date instanceof Timestamp ? data.date.toDate().toISOString().split('T')[0] : data.date,
                time: data.appointmentTimeDisplay || data.time,
                status: data.status,
                type: "In-Person", 
                patientId: data.patientId,
                tokenNumber: data.tokenNumber,
            });
        });
        setBookedAppointments(fetched);
    } catch (error) {
        console.error("Error fetching booked appointments:", error);
        toast({variant: "destructive", title: "Error", description: "Could not load your appointments."})
    } finally {
        setIsLoadingBookedAppointments(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDoctors();
    if (user && !authLoading) {
      fetchBookedAppointments(user.uid);
    }
  }, [fetchDoctors, user, authLoading, fetchBookedAppointments]);

  // Generate slots when doctor and date change
  useEffect(() => {
    if (selectedDoctorId && selectedDate && user) {
      const generateAndFetchSlots = async () => {
        setIsLoadingSlots(true);
        setAvailableSlots([]);
        try {
          const dayOfWeek = selectedDate.toLocaleDateString('en-US', { weekday: 'long' });
          const dateString = selectedDate.toISOString().split('T')[0];

          const slotConfigsRef = collection(db, "slotConfigurations");
          // Query for slot configurations for the selected doctor that include the selected day of the week
          const qConfigs = firestoreQuery(
            slotConfigsRef,
            where("doctorId", "==", selectedDoctorId),
            where("dayOfWeek", "array-contains", dayOfWeek) // Use array-contains for multi-day configs
          );
          const configSnapshot = await getDocs(qConfigs);

          if (configSnapshot.empty) {
            setAvailableSlots([]);
            setIsLoadingSlots(false);
            return;
          }

          const generatedSlots: TimeSlot[] = [];

          for (const confDoc of configSnapshot.docs) {
            const configData = confDoc.data() as { selectedSlots: string[], capacityPerSlot: number };
            if (configData.selectedSlots && Array.isArray(configData.selectedSlots)) {
              configData.selectedSlots.forEach(slotTime => { // slotTime is "HH:MM"
                const [hours, minutes] = slotTime.split(':').map(Number);
                const slotStartTime = new Date(selectedDate);
                slotStartTime.setHours(hours, minutes, 0, 0);

                const slotEndTime = new Date(slotStartTime.getTime() + 15 * 60000); // 15 minutes slot

                generatedSlots.push({
                  id: `${slotTime}_${confDoc.id}`, // e.g. "09:00_configId123"
                  time: `${slotTime} - ${String(slotEndTime.getHours()).padStart(2, '0')}:${String(slotEndTime.getMinutes()).padStart(2, '0')}`,
                  available: true,
                  capacity: configData.capacityPerSlot,
                  booked: 0, // Will be updated below
                  slotConfigId: confDoc.id,
                  startTime: slotTime, // "HH:MM"
                });
              });
            }
          }

          if (generatedSlots.length > 0) {
            const appointmentsRef = collection(db, "appointments");
            const qBookings = firestoreQuery(
                appointmentsRef,
                where("doctorId", "==", selectedDoctorId),
                where("date", "==", dateString),
                where("status", "!=", "cancelled"), // Exclude cancelled appointments from count
                limit(300) 
            );
            const bookingsSnapshot = await getDocs(qBookings);
            const bookingsOnDate = bookingsSnapshot.docs.map(d => d.data());

            generatedSlots.forEach(slot => {
                const bookingsInSlot = bookingsOnDate.filter(b => b.appointmentTime === slot.startTime && b.slotConfigId === slot.slotConfigId);
                slot.booked = bookingsInSlot.length;
                if (slot.booked >= slot.capacity) {
                    slot.available = false;
                }
            });
          }
          setAvailableSlots(generatedSlots.sort((a,b) => a.startTime.localeCompare(b.startTime)));
        } catch (error: any) {
          console.error("Error generating/fetching slots:", error);
          if (error.code === 'failed-precondition') {
            console.error("Firebase error code:", error.code, " - This usually means a composite index is required.");
            console.warn("Please create a composite index in Firestore for the 'slotConfigurations' collection with fields: 'doctorId' (Ascending) and 'dayOfWeek' (Array).");
            toast({ variant: "destructive", title: "Configuration Error", description: "A required database index is missing. Please contact support or check the console.", duration: 10000 });
          } else {
             toast({ variant: "destructive", title: "Slot Loading Error", description: `Could not load available slots. ${error.message || 'Please try again.'}` });
          }
        } finally {
          setIsLoadingSlots(false);
        }
      };
      generateAndFetchSlots();
    } else {
      setAvailableSlots([]);
    }
  }, [selectedDoctorId, selectedDate, user, toast]);

  async function onSubmit(data: AppointmentFormValues) {
    if (!user || user.isBlocked) {
        toast({
            variant: "destructive",
            title: "Booking Restricted",
            description: user?.isBlocked ? `Your account is blocked for bookings until ${new Date(user.blockedUntil || '').toLocaleDateString()}.` : "You must be logged in to book.",
        });
        return;
    }

    setIsSubmitting(true);
    const selectedSlot = availableSlots.find(slot => slot.id === data.timeSlotId);
    const doctor = doctors.find(doc => doc.id === data.doctorId);
    const dateString = selectedDate.toISOString().split('T')[0];

    // Check for existing appointment on the same day
    const existingApptQuery = firestoreQuery(
      collection(db, "appointments"),
      where("patientId", "==", user.uid),
      where("date", "==", dateString),
      where("status", "in", ["upcoming", "active", "delayed", "missed"])
    );
    const existingApptSnapshot = await getDocs(existingApptQuery);
    if (!existingApptSnapshot.empty) {
      toast({
        variant: "destructive",
        title: "Booking Limit Reached",
        description: "You can only book one appointment per day.",
      });
      setIsSubmitting(false);
      return;
    }

    if (!selectedSlot || !doctor || !selectedDate) {
      toast({ variant: "destructive", title: "Booking Error", description: "Invalid selection. Please try again." });
      setIsSubmitting(false);
      return;
    }

    if (selectedSlot.booked >= selectedSlot.capacity) {
        toast({ variant: "destructive", title: "Booking Failed", description: "Selected time slot is full. Please choose another."});
        setIsSubmitting(false);
        return;
    }

    try {
      // Generate token number by counting existing appointments for this exact slot
      const tokenQuery = firestoreQuery(
        collection(db, "appointments"),
        where("doctorId", "==", doctor.id),
        where("date", "==", selectedDate.toISOString().split('T')[0]),
        where("appointmentTime", "==", selectedSlot.startTime),
        where("slotConfigId", "==", selectedSlot.slotConfigId),
        where("status", "!=", "cancelled") // Ensure cancelled are not counted for token
      );
      const tokenQuerySnapshot = await getDocs(tokenQuery);
      const tokenNumber = tokenQuerySnapshot.size + 1;

      if (tokenNumber > selectedSlot.capacity) {
        toast({ variant: "destructive", title: "Booking Failed", description: "Selected time slot just became full. Please choose another."});
        setIsSubmitting(false);
        // Optionally, refresh slots here
        if (selectedDoctorId && selectedDate && user) { // Re-run slot fetching logic
             setValue("timeSlotId", ""); // Clear selection
             // This effect will re-trigger:
             // To force re-fetch, you might need to slightly change a dependency or call fetchSlots directly
        }
        return;
      }


      const appointmentData = {
        patientId: user.uid,
        patientName: user.displayName || user.fullName,
        doctorId: doctor.id,
        doctorName: doctor.name,
        specialization: doctor.specialization,
        date: selectedDate.toISOString().split('T')[0],
        time: selectedSlot.startTime, 
        appointmentTime: selectedSlot.startTime, 
        appointmentTimeDisplay: selectedSlot.time, 
        slotConfigId: selectedSlot.slotConfigId,
        status: 'upcoming',
        tokenNumber: tokenNumber, // Add generated token number
        createdAt: serverTimestamp(),
      };
      const newApptRef = await addDoc(collection(db, "appointments"), appointmentData);

      toast({
        title: "Appointment Booked!",
        description: `Your appointment with ${doctor.name} on ${selectedDate.toLocaleDateString()} at ${selectedSlot.time} (Token: ${tokenNumber}) is confirmed.`,
        action: <CheckCircle className="text-green-500" />,
      });
      reset();
      setSelectedDoctorId(null);
      setAvailableSlots([]);
      if (user.uid) fetchBookedAppointments(user.uid); 
    } catch (error: any) {
        console.error("Error booking appointment: ", error);
        toast({ variant: "destructive", title: "Booking Error", description: error.message || "Could not book appointment."});
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading || isLoadingDoctors) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>;
  }
  if (!user && !authLoading) {
    return <div className="text-center p-8">Please log in to manage appointments.</div>;
  }


  return (
    <div className="space-y-6">
      <PageHeader title="Appointments" description="Book new appointments and manage existing ones.">
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
                        <Select onValueChange={(value) => { field.onChange(value); setSelectedDoctorId(value); setValue("timeSlotId", ""); setAvailableSlots([]); }} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Choose a Doctor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {doctors.map(doc => (
                              <SelectItem key={doc.id} value={doc.id}>
                                {doc.name} {doc.specialization ? `(${doc.specialization})` : ''}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {selectedDoctorId && (
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
                              onSelect={(date) => { field.onChange(date); setValue("timeSlotId", ""); setAvailableSlots([]); }}
                              disabled={(date) => date < new Date(new Date().setDate(new Date().getDate() -1)) } 
                              initialFocus
                              className="rounded-md border self-start"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  {selectedDoctorId && selectedDate && (
                    <FormField
                      control={control}
                      name="timeSlotId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Available Time Slots {isLoadingSlots && <Loader2 className="inline ml-2 h-4 w-4 animate-spin" />}</FormLabel>
                          {!isLoadingSlots && availableSlots.length === 0 && <p className="text-muted-foreground text-sm">No slots available for this selection, or all spots are booked. Try another date or doctor.</p>}
                          {availableSlots.length > 0 && (
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {availableSlots.map(slot => (
                                <Button
                                  key={slot.id}
                                  type="button"
                                  variant={field.value === slot.id ? "default" : "outline"}
                                  onClick={() => field.onChange(slot.id)}
                                  disabled={!slot.available || (slot.booked >= slot.capacity)}
                                  className={`w-full h-auto py-3 flex flex-col items-center justify-center ${(!slot.available || (slot.booked >= slot.capacity)) ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <span className="text-sm font-medium">{slot.time.split(' - ')[0]}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {slot.available && (slot.capacity - slot.booked > 0) ? `${slot.capacity - slot.booked} spots` : 'Full'}
                                  </span>
                                </Button>
                              ))}
                            </div>
                          )}
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <Button type="submit" className="w-full md:w-auto bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSubmitting || !selectedDoctorId || !selectedDate || !watch("timeSlotId") || isLoadingSlots || user?.isBlocked}>
                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Booking...</> : (user?.isBlocked ? "Booking Restricted" : "Book Appointment")}
                  </Button>
                   {user?.isBlocked && <p className="text-sm text-destructive">Your account is currently restricted from booking new appointments.</p>}
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
              {isLoadingBookedAppointments ? (
                 <div className="flex items-center justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading your appointments...</p></div>
              ) : bookedAppointments.length > 0 ? (
                <div className="space-y-4">
                  {bookedAppointments.map(appt => (
                    <Card key={appt.id} className={`p-4 ${appt.status === 'completed' || appt.status === 'cancelled' || appt.status === 'missed' ? 'bg-muted/50' : 'bg-secondary/30'}`}>
                      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                        <div>
                          <h3 className="font-semibold text-primary">{appt.doctorName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {new Date(appt.date).toLocaleDateString()} at {appt.time}
                          </p>
                           <p className="text-xs">Type: <span className="inline-flex items-center"><Users className="w-3 h-3 mr-1"/>In-Person</span></p>
                           {appt.tokenNumber && <p className="text-xs">Token: <span className="font-semibold">{appt.tokenNumber}</span></p>}
                        </div>
                        <div className="flex flex-col items-start sm:items-end">
                           <span className={`px-2 py-1 text-xs rounded-full font-medium capitalize
                            ${appt.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                              appt.status === 'active' ? 'bg-green-100 text-green-700' :
                              appt.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                              appt.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                              appt.status === 'delayed' ? 'bg-yellow-100 text-yellow-700' :
                              appt.status === 'missed' ? 'bg-orange-100 text-orange-700' :
                              'bg-gray-100 text-gray-700'}`}>
                            {appt.status}
                          </span>
                          {(appt.status === 'upcoming' || appt.status === 'active' || appt.status === 'delayed') && (
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
