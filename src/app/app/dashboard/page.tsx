
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarCheck, Clock, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { db, collection, query, where, getDocs, orderBy, Timestamp, doc, onSnapshot } from "@/lib/firebase";
import type { Unsubscribe } from "firebase/firestore";


interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  date: string; 
  time: string; // appointmentTime
  appointmentTimeDisplay: string; // display string for time
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  tokenNumber?: number;
  patientId: string;
  createdAt: Timestamp;
}

interface TokenInfo {
  currentServingToken: number; 
  yourToken: number;
  estimatedWaitTime: string; 
  doctorName: string;
  appointmentId: string;
}

interface LiveQueueStatus {
    currentServingToken: number;
    estimatedWaitTime: string; 
    updatedAt: Timestamp;
}

export default function PatientDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [activeAppointmentForToken, setActiveAppointmentForToken] = useState<Appointment | null>(null);
  const [liveQueue, setLiveQueue] = useState<LiveQueueStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (currentUserId: string) => {
    setIsLoading(true);
    setError(null);
    setUpcomingAppointments([]);
    setActiveAppointmentForToken(null);
    try {
      const appointmentsRef = collection(db, "appointments");
      const today = new Date().toISOString().split('T')[0];

      // Fetch upcoming appointments (today or in future)
      const qUpcoming = query(
        appointmentsRef,
        where("patientId", "==", currentUserId),
        where("status", "in", ["upcoming", "active", "delayed"]),
        where("date", ">=", today),
        orderBy("date", "asc"),
        orderBy("time", "asc")
      );
      const upcomingSnapshot = await getDocs(qUpcoming);
      const fetchedUpcomingAppointments: Appointment[] = [];
      let foundActiveForToken: Appointment | null = null;

      upcomingSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const appointment: Appointment = {
          id: docSnap.id,
          doctorId: data.doctorId,
          doctorName: data.doctorName,
          specialization: data.specialization || "Gynecology",
          date: data.date instanceof Timestamp ? data.date.toDate().toISOString().split('T')[0] : data.date,
          time: data.appointmentTime,
          appointmentTimeDisplay: data.appointmentTimeDisplay || data.appointmentTime,
          status: data.status,
          tokenNumber: data.tokenNumber,
          patientId: data.patientId,
          createdAt: data.createdAt,
        };
        fetchedUpcomingAppointments.push(appointment);
        if (data.date === today && (data.status === 'active' || data.status === 'upcoming') && data.tokenNumber) {
            if (!foundActiveForToken || data.status === 'active' || (data.time < foundActiveForToken.time && foundActiveForToken.status !== 'active')) {
                foundActiveForToken = appointment;
            }
        }
      });
      setUpcomingAppointments(fetchedUpcomingAppointments);
      setActiveAppointmentForToken(foundActiveForToken);

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.uid && !authLoading) {
      fetchData(user.uid);
    } else if (!authLoading && !user) {
      setIsLoading(false); 
      setUpcomingAppointments([]);
      setActiveAppointmentForToken(null);
    }
  }, [user?.uid, authLoading, fetchData]);

  // Listener for live queue status if there's an active/upcoming appointment with a token
  useEffect(() => {
    let unsubscribe: Unsubscribe | null = null;
    if (activeAppointmentForToken?.doctorId && activeAppointmentForToken.tokenNumber && (activeAppointmentForToken.status === 'active' || activeAppointmentForToken.status === 'upcoming')) {
      const queueDocRef = doc(db, "doctorQueueStatus", activeAppointmentForToken.doctorId);
      unsubscribe = onSnapshot(queueDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setLiveQueue(docSnap.data() as LiveQueueStatus);
        } else {
          setLiveQueue(null);
        }
      }, (error) => {
        console.error("Error listening to live queue: ", error);
        setLiveQueue(null);
      });
    } else {
      setLiveQueue(null); 
    }
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [activeAppointmentForToken]);


  if (isLoading || authLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 text-center p-8">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold text-destructive">Error Loading Dashboard</h2>
        <p className="text-muted-foreground">{error}</p>
        <Button onClick={() => user?.uid && fetchData(user.uid)} variant="outline">Try Again</Button>
      </div>
    );
  }
   if (!user && !authLoading) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <h2 className="text-2xl font-semibold">Not Logged In</h2>
        <p className="text-muted-foreground">Please log in to view your dashboard.</p>
        <Button asChild className="mt-4"><Link href="/login">Login</Link></Button>
      </div>
    );
  }

  const tokenInfo: TokenInfo | null = activeAppointmentForToken && activeAppointmentForToken.tokenNumber ? {
    appointmentId: activeAppointmentForToken.id,
    doctorName: activeAppointmentForToken.doctorName,
    yourToken: activeAppointmentForToken.tokenNumber,
    currentServingToken: liveQueue?.currentServingToken ?? (activeAppointmentForToken.status === 'upcoming' ? '-' : (activeAppointmentForToken.tokenNumber - Math.floor(Math.random()*2+1))),
    estimatedWaitTime: liveQueue?.currentServingToken && activeAppointmentForToken.tokenNumber && liveQueue.currentServingToken >= activeAppointmentForToken.tokenNumber ? "Your turn soon!" : liveQueue?.estimatedWaitTime || "Calculating..."
  } : null;

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.displayName || 'Patient'}!`} description="Here's an overview of your upcoming activities." />

      {tokenInfo && (
        <Card className="bg-primary/10 border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Clock className="mr-2 h-6 w-6" /> Live Token Status
            </CardTitle>
            <CardDescription>Your current appointment with Dr. {tokenInfo.doctorName}.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Currently Serving</p>
              <p className="text-4xl font-bold text-accent">{tokenInfo.currentServingToken}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Token</p>
              <p className="text-4xl font-bold text-primary">{tokenInfo.yourToken}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Wait</p>
              <p className="text-3xl font-bold text-foreground">{tokenInfo.estimatedWaitTime}</p>
            </div>
          </CardContent>
           <CardContent className="text-center pb-4">
             <Button asChild variant="default">
                <Link href={`/app/appointments/${tokenInfo.appointmentId}/status`}>View Full Status</Link>
             </Button>
           </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2"> {/* Changed to 2 cols */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarCheck className="mr-2 h-5 w-5 text-primary" /> Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <ul className="space-y-3 max-h-60 overflow-y-auto">
                {upcomingAppointments.map(appt => (
                  <li key={appt.id} className="p-3 bg-secondary/50 rounded-md shadow-sm">
                    <p className="font-semibold">Dr. {appt.doctorName} <span className="text-sm text-muted-foreground">({appt.specialization})</span></p>
                    <p className="text-sm">{new Date(appt.date).toLocaleDateString()} at {appt.appointmentTimeDisplay}</p>
                    <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                      <Link href={`/app/appointments/${appt.id}/status`}>View Details</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No upcoming appointments.</p>
            )}
            <Button asChild className="mt-4 w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Link href="/app/appointments">Book New Appointment</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><AlertCircle className="mr-2 h-5 w-5 text-primary" /> Clinic Notices</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-md">
                 <p className="text-muted-foreground">No important notices at this time.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Health Insights</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <Image src="https://placehold.co/300x200.png" alt="Health Insight" width={300} height={200} className="rounded-md shadow-md object-cover" data-ai-hint="women health"/>
                <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Focus on Your Wellbeing</h3>
                    <p className="text-muted-foreground">
                        Regular check-ups and open communication with your Gynecologist are key to maintaining good health.
                        TokenEase helps you stay connected and informed for your gynecological care.
                    </p>
                </div>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
