
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarCheck, Clock, Loader2, User, Ticket } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { db, collection, query, where, getDocs, orderBy, Timestamp, writeBatch } from "@/lib/firebase";


interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  date: string; 
  time: string; // appointmentTime
  appointmentTimeDisplay: string; // display string for time
  status: 'upcoming' | 'active' | 'completed' | 'cancelled' | 'delayed' | 'missed';
  tokenNumber?: number;
  patientId: string;
  createdAt: Timestamp;
}

export default function PatientDashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [nextAppointment, setNextAppointment] = useState<Appointment | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateMissedAppointments = useCallback(async (userId: string) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0); 
      const todayStr = today.toISOString().split('T')[0];

      const missedApptsQuery = query(
        collection(db, "appointments"),
        where("patientId", "==", userId),
        where("status", "in", ["upcoming", "active", "delayed"]),
        where("date", "<", todayStr)
      );

      const snapshot = await getDocs(missedApptsQuery);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach(docSnap => {
          batch.update(docSnap.ref, { status: "missed" });
        });
        await batch.commit();
        console.log(`Updated ${snapshot.size} appointments to 'missed' status.`);
        return true; 
      }
      return false;
    } catch (e) {
      console.error("Error updating missed appointments: ", e);
      return false;
    }
  }, []);

  const fetchData = useCallback(async (currentUserId: string) => {
    setIsLoading(true);
    setError(null);
    
    await updateMissedAppointments(currentUserId);
    setUpcomingAppointments([]);
    setNextAppointment(null);

    try {
      const appointmentsRef = collection(db, "appointments");
      const today = new Date().toISOString().split('T')[0];

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
      
      upcomingSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedUpcomingAppointments.push({
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
        });
      });
      
      setUpcomingAppointments(fetchedUpcomingAppointments);
      if (fetchedUpcomingAppointments.length > 0) {
        setNextAppointment(fetchedUpcomingAppointments[0]);
      }

    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
      setError("Failed to load dashboard data. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  }, [updateMissedAppointments]);

  useEffect(() => {
    if (user?.uid && !authLoading) {
      fetchData(user.uid);
    } else if (!authLoading && !user) {
      setIsLoading(false); 
      setError(null);
      setUpcomingAppointments([]);
      setNextAppointment(null);
    }
  }, [user?.uid, authLoading, fetchData]);


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


  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.displayName || 'Patient'}!`} description="Here's an overview of your upcoming activities." />

      {nextAppointment ? (
        <Card className="bg-primary/10 border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Clock className="mr-2 h-6 w-6" /> Your Next Appointment
            </CardTitle>
            <CardDescription>Details for your upcoming visit.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
                <p className="flex items-center font-semibold text-lg"><User className="mr-2 h-5 w-5"/> Dr. {nextAppointment.doctorName}</p>
                <p className="flex items-center text-muted-foreground"><CalendarCheck className="mr-2 h-5 w-5"/> {new Date(nextAppointment.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} at {nextAppointment.appointmentTimeDisplay}</p>
            </div>
             <div className="flex flex-col items-start justify-center md:items-center bg-secondary/30 p-4 rounded-md">
                <p className="text-sm text-muted-foreground">Your Token Number</p>
                <p className="text-4xl font-bold text-primary flex items-center"><Ticket className="mr-2 h-8 w-8"/> {nextAppointment.tokenNumber || 'Not Assigned'}</p>
            </div>
          </CardContent>
           <CardContent className="text-center pb-4">
             <Button asChild variant="default">
                <Link href={`/app/appointments/${nextAppointment.id}/status`}>View Full Status</Link>
             </Button>
           </CardContent>
        </Card>
      ) : (
        <Card className="bg-secondary/30">
            <CardContent className="p-6 text-center">
                <p className="text-lg text-muted-foreground">You have no upcoming appointments.</p>
                <Button asChild className="mt-4 bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Link href="/app/appointments">Book a New Appointment</Link>
                </Button>
            </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarCheck className="mr-2 h-5 w-5 text-primary" /> All Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <ul className="space-y-3 max-h-60 overflow-y-auto">
                {upcomingAppointments.map(appt => (
                  <li key={appt.id} className="p-3 bg-secondary/50 rounded-md shadow-sm">
                    <p className="font-semibold">Dr. {appt.doctorName} <span className="text-sm text-muted-foreground">({appt.specialization})</span></p>
                    <p className="text-sm">{new Date(appt.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })} at {appt.appointmentTimeDisplay}</p>
                     <p className={`text-xs capitalize font-medium ${
                        appt.status === 'active' ? 'text-green-600' :
                        appt.status === 'upcoming' ? 'text-blue-600' :
                        appt.status === 'delayed' ? 'text-yellow-600' :
                        'text-muted-foreground'
                     }`}>Status: {appt.status}</p>
                    <Button variant="link" size="sm" asChild className="p-0 h-auto mt-1">
                      <Link href={`/app/appointments/${appt.id}/status`}>View Details</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">No upcoming appointments found.</p>
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
