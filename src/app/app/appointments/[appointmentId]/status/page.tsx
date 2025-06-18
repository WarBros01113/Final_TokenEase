
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CalendarCheck, Clock, MessageCircle, Users, Loader2 as LoaderIcon } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { db, doc, getDoc, updateDoc, onSnapshot, Unsubscribe } from "@/lib/firebase"; // Added onSnapshot
import type { Timestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";

interface AppointmentDetails {
  id: string;
  doctorId: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorAvatarUrl?: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // HH:MM (start time)
  appointmentTimeDisplay: string; // "HH:MM AM/PM - HH:MM AM/PM"
  status: 'upcoming' | 'active' | 'delayed' | 'completed' | 'cancelled';
  currentServingToken?: number; // Fetched from a live queue status document if available
  yourToken?: number;
  estimatedWaitTime?: string; 
  clinicAddress: string; // Potentially from doctor or clinic settings
  notes?: string;
  patientId: string;
}

// Placeholder for a live queue status if not part of appointment doc directly
interface LiveQueueStatus {
    currentServingToken: number;
    estimatedWaitTime: string; // for the specific doctor/queue
    updatedAt: Timestamp;
}


export default function AppointmentStatusPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const appointmentId = params.appointmentId as string;
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [liveQueue, setLiveQueue] = useState<LiveQueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch initial appointment details
  useEffect(() => {
    if (!appointmentId || !user) {
        if (!user && !isLoading) router.push('/login'); // Redirect if not logged in
        return;
    };
    setIsLoading(true);
    const apptDocRef = doc(db, "appointments", appointmentId);
    
    getDoc(apptDocRef).then(docSnap => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.patientId !== user.uid) {
            toast({variant: "destructive", title: "Access Denied", description: "You do not have permission to view this appointment."});
            router.push('/app/appointments');
            return;
        }
        setAppointment({
          id: docSnap.id,
          doctorId: data.doctorId,
          doctorName: data.doctorName,
          doctorSpecialization: data.specialization || "Gynecology",
          // doctorAvatarUrl: data.doctorAvatarUrl || `https://placehold.co/80x80.png?text=${data.doctorName?.substring(0,1) || 'D'}`,
          appointmentDate: data.date instanceof Timestamp ? data.date.toDate().toISOString().split('T')[0] : data.date,
          appointmentTime: data.appointmentTime,
          appointmentTimeDisplay: data.appointmentTimeDisplay || data.appointmentTime,
          status: data.status,
          yourToken: data.tokenNumber, // This might be assigned later or upon check-in
          clinicAddress: "TokenEase Gynecology Clinic, 123 Health St, Wellness City", // Placeholder
          notes: data.notes,
          patientId: data.patientId,
          // currentServingToken and estimatedWaitTime will come from liveQueue listener
        } as AppointmentDetails);
      } else {
        toast({variant: "destructive", title: "Not Found", description: "Appointment details could not be found."});
        router.push('/app/appointments');
      }
    }).catch(error => {
        console.error("Error fetching appointment:", error);
        toast({variant: "destructive", title: "Error", description: "Failed to load appointment details."});
    }).finally(() => {
        setIsLoading(false);
    });
  }, [appointmentId, user, router, toast, isLoading]); // Added isLoading to deps of outer useEffect

  // Listen to live queue status for the specific doctor (if appointment is active/upcoming)
  useEffect(() => {
    if (!appointment || !appointment.doctorId || (appointment.status !== 'upcoming' && appointment.status !== 'active')) {
      setLiveQueue(null); // Clear live queue if appointment not suitable for tracking
      return;
    }

    // Path to a document that holds the live queue status for the doctor.
    // Example: /doctorQueueStatus/{doctorId}
    // This document would be updated by the doctor's interface or an admin.
    const queueDocRef = doc(db, "doctorQueueStatus", appointment.doctorId);
    
    const unsubscribe = onSnapshot(queueDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data() as LiveQueueStatus;
            setLiveQueue(data);
            
            // Update appointment status based on live token
            if (appointment.yourToken && data.currentServingToken >= appointment.yourToken && appointment.status !== 'completed' && appointment.status !== 'cancelled') {
                 setAppointment(prev => prev ? {...prev, status: 'active', estimatedWaitTime: 'Your turn soon!'} : null);
            } else if (appointment.status !== 'completed' && appointment.status !== 'cancelled') {
                 setAppointment(prev => prev ? {...prev, estimatedWaitTime: data.estimatedWaitTime} : null);
            }

        } else {
            // No live queue data for this doctor, or document doesn't exist.
            // You might want to set a default message or handle this case.
            setLiveQueue(null);
            console.log(`No live queue status found for doctor ${appointment.doctorId}`);
        }
    }, (error) => {
        console.error("Error listening to live queue status:", error);
        // Don't show toast for listener errors usually, can be noisy.
    });

    return () => unsubscribe(); // Cleanup listener on component unmount or when appointment changes

  }, [appointment]); // Dependency on `appointment` object

  const handleCancelAppointment = async () => {
    if (!appointment || (appointment.status !== 'upcoming' && appointment.status !== 'active')) {
        toast({title: "Cannot Cancel", description: "This appointment cannot be cancelled at its current status."});
        return;
    }
    if (!window.confirm("Are you sure you want to cancel this appointment?")) return;

    try {
        const apptDocRef = doc(db, "appointments", appointment.id);
        await updateDoc(apptDocRef, { status: 'cancelled' });
        setAppointment(prev => prev ? {...prev, status: 'cancelled'} : null);
        toast({title: "Appointment Cancelled", description: "Your appointment has been cancelled."});
    } catch (error) {
        console.error("Error cancelling appointment:", error);
        toast({variant: "destructive", title: "Cancellation Failed", description: "Could not cancel the appointment."});
    }
  };


  if (isLoading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <LoaderIcon className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading appointment details...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="space-y-6 text-center">
        <PageHeader title="Appointment Not Found" />
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <p className="text-lg">We couldn't find the details for this appointment, or you may not have access.</p>
        <Button asChild variant="outline">
          <Link href="/app/appointments"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Appointments</Link>
        </Button>
      </div>
    );
  }
  
  const isYourTurn = appointment.status === 'active' && liveQueue?.currentServingToken && appointment.yourToken && liveQueue.currentServingToken >= appointment.yourToken;
  const displayCurrentServingToken = liveQueue?.currentServingToken ?? (appointment.status === 'upcoming' ? '-' : appointment.yourToken ? appointment.yourToken -1 : '-'); // Fallback logic
  const displayEstimatedWaitTime = isYourTurn ? "Your turn soon!" : liveQueue?.estimatedWaitTime ?? appointment.estimatedWaitTime ?? "Calculating...";

  return (
    <div className="space-y-6">
      <PageHeader title="Appointment Status" description={`Tracking your appointment: #${appointment.id.substring(0,8)}...`}>
         <Button asChild variant="outline">
          <Link href="/app/appointments"><ArrowLeft className="mr-2 h-4 w-4"/> All Appointments</Link>
        </Button>
      </PageHeader>

      <Card className="shadow-xl overflow-hidden">
        <CardHeader className={`p-6 ${isYourTurn ? 'bg-accent text-accent-foreground' : 'bg-primary text-primary-foreground'}`}>
          <div className="flex items-center space-x-4">
            <Image src={appointment.doctorAvatarUrl || `https://placehold.co/80x80.png?text=${appointment.doctorName.substring(0,1)}`} alt={appointment.doctorName} width={80} height={80} className="rounded-full border-2 border-background shadow-md" data-ai-hint="doctor portrait"/>
            <div>
              <CardTitle className="text-2xl font-headline">Dr. {appointment.doctorName}</CardTitle>
              <CardDescription className={`${isYourTurn ? 'text-accent-foreground/80' : 'text-primary-foreground/80'}`}>{appointment.doctorSpecialization}</CardDescription>
            </div>
          </div>
          <div className="mt-4 text-sm">
            <p className="flex items-center"><CalendarCheck className="mr-2 h-4 w-4" /> {new Date(appointment.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {appointment.appointmentTimeDisplay}</p>
            {appointment.yourToken && <p className="flex items-center mt-1"><Users className="mr-2 h-4 w-4" /> Token Number: <span className="font-bold text-xl ml-2">{appointment.yourToken}</span></p>}
          </div>
        </CardHeader>
        
        <CardContent className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Live Queue Status</h3>
            {appointment.status === 'upcoming' && !appointment.yourToken && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
                    <p className="text-blue-700 font-semibold">Your appointment is upcoming.</p>
                    <p className="text-sm text-blue-600">Token number will be assigned upon check-in or closer to the appointment time.</p>
                </div>
            )}
            {(appointment.status === 'upcoming' || appointment.status === 'active' || appointment.status === 'delayed') && appointment.yourToken && (
              <div className="grid grid-cols-2 gap-4 text-center">
                <Card className="pt-4 bg-secondary/30">
                  <CardDescription>Currently Serving</CardDescription>
                  <CardTitle className="text-5xl font-bold text-accent py-2">{displayCurrentServingToken}</CardTitle>
                </Card>
                <Card className="pt-4 bg-primary/10">
                  <CardDescription>Your Token</CardDescription>
                  <CardTitle className="text-5xl font-bold text-primary py-2">{appointment.yourToken}</CardTitle>
                </Card>
              </div>
            )}
            {isYourTurn && (
                <div className="p-4 bg-green-500 text-white rounded-md text-center shadow-lg">
                    <h3 className="text-2xl font-bold">It's Your Turn!</h3>
                    <p>Please proceed to Dr. {appointment.doctorName}'s room.</p>
                </div>
            )}
            {!isYourTurn && (appointment.status === 'upcoming' || appointment.status === 'active' || appointment.status === 'delayed') && (
              <p className="text-center text-lg font-medium text-foreground/80 flex items-center justify-center"><Clock className="mr-2 h-5 w-5 text-primary"/> {displayEstimatedWaitTime}</p>
            )}
             {appointment.status === 'completed' && (
                <div className="p-4 bg-green-100 border border-green-300 rounded-md text-center">
                    <p className="text-green-700 font-semibold text-lg">This appointment has been completed.</p>
                </div>
            )}
            {appointment.status === 'cancelled' && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-md text-center">
                    <p className="text-red-700 font-semibold text-lg">This appointment was cancelled.</p>
                </div>
            )}
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-semibold text-primary">Appointment Details</h3>
             <p><strong className="text-foreground/80">Status:</strong> <span className={`font-semibold px-2 py-0.5 rounded-full text-xs capitalize ${
                appointment.status === 'active' ? 'bg-green-100 text-green-700' :
                appointment.status === 'upcoming' ? 'bg-blue-100 text-blue-700' :
                appointment.status === 'delayed' ? 'bg-yellow-100 text-yellow-700' :
                appointment.status === 'completed' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-700'
             }`}>{appointment.status}</span></p>
             <p><strong className="text-foreground/80">Clinic:</strong> {appointment.clinicAddress}</p>
             {appointment.notes && <p><strong className="text-foreground/80">Notes:</strong> {appointment.notes}</p>}
             
             <div className="pt-4 space-x-2">
                <Button variant="outline" asChild>
                    <Link href={`/app/chat?doctorId=${appointment.doctorId}`}> 
                        <MessageCircle className="mr-2 h-4 w-4"/> Message Doctor
                    </Link>
                </Button>
                {(appointment.status === 'upcoming' || appointment.status === 'active') &&
                    <Button variant="destructive" onClick={handleCancelAppointment} type="button">Cancel Appointment</Button>
                }
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
