
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarCheck, Clock, MessageCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Image from "next/image";
import { db, collection, query, where, getDocs, orderBy, Timestamp } from "@/lib/firebase";

interface Appointment {
  id: string;
  doctorId: string;
  doctorName: string;
  specialization: string;
  date: string; // ISO string date
  time: string;
  status: 'upcoming' | 'active' | 'completed' | 'cancelled';
  tokenNumber?: number;
  estimatedWaitTime?: string; // This would typically be dynamic
  patientId: string;
  createdAt: Timestamp;
}

interface TokenInfo {
  currentServing: number; // This would come from doctor's side, mock for now
  yourToken: number;
  estimatedTime: string; // Dynamic, mock for now
  doctorName: string;
  appointmentId: string;
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [activeToken, setActiveToken] = useState<TokenInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = user?.uid;

    if (!currentUserId) {
      setIsLoading(false);
      setUpcomingAppointments([]);
      setActiveToken(null);
      // Don't setError here, as it might be normal if user is logged out or loading
      return;
    }

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch upcoming appointments
        const appointmentsRef = collection(db, "appointments");
        const qUpcoming = query(
          appointmentsRef,
          where("patientId", "==", currentUserId),
          where("status", "==", "upcoming"),
          orderBy("date", "asc"),
          orderBy("time", "asc")
        );
        const upcomingSnapshot = await getDocs(qUpcoming);
        const fetchedUpcomingAppointments: Appointment[] = [];
        upcomingSnapshot.forEach((doc) => {
          const data = doc.data();
          fetchedUpcomingAppointments.push({
            id: doc.id,
            doctorId: data.doctorId,
            doctorName: data.doctorName,
            specialization: data.specialization,
            date: data.date instanceof Timestamp ? data.date.toDate().toISOString().split('T')[0] : data.date,
            time: data.time,
            status: data.status,
            tokenNumber: data.tokenNumber,
            estimatedWaitTime: data.estimatedWaitTime, 
            patientId: data.patientId,
            createdAt: data.createdAt,
          });
        });
        setUpcomingAppointments(fetchedUpcomingAppointments);

        // Fetch active appointment for token info
        const qActive = query(
          appointmentsRef,
          where("patientId", "==", currentUserId),
          where("status", "==", "active"),
          orderBy("date", "desc"), 
          orderBy("time", "desc")
        );
        const activeSnapshot = await getDocs(qActive);
        if (!activeSnapshot.empty) {
          const activeApptDoc = activeSnapshot.docs[0];
          const activeApptData = activeApptDoc.data() as Omit<Appointment, 'id' | 'createdAt'>; // Use Omit as id and createdAt are from doc
          setActiveToken({
            appointmentId: activeApptDoc.id,
            doctorName: activeApptData.doctorName,
            yourToken: activeApptData.tokenNumber || 0,
            currentServing: activeApptData.tokenNumber ? activeApptData.tokenNumber - Math.floor(Math.random()*3 +1) : 0, 
            estimatedTime: activeApptData.estimatedWaitTime || "Soon", 
          });
        } else {
          setActiveToken(null);
        }

      } catch (err: any) {
        console.error("Error fetching dashboard data:", err);
        setError("Failed to load dashboard data. Please check your connection and try again. Ensure Firestore rules allow access and required indexes are created.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.uid]); // Depend only on user.uid

  if (isLoading) {
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
        <Button onClick={() => window.location.reload()} variant="outline">Try Again</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.displayName || user?.fullName || 'Patient'}!`} description="Here's an overview of your upcoming activities." />

      {activeToken && (
        <Card className="bg-primary/10 border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Clock className="mr-2 h-6 w-6" /> Live Token Status
            </CardTitle>
            <CardDescription>Your current active appointment with {activeToken.doctorName}.</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-sm text-muted-foreground">Currently Serving</p>
              <p className="text-4xl font-bold text-accent">{activeToken.currentServing}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Your Token</p>
              <p className="text-4xl font-bold text-primary">{activeToken.yourToken}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estimated Time</p>
              <p className="text-3xl font-bold text-foreground">{activeToken.estimatedTime}</p>
            </div>
          </CardContent>
           <CardContent className="text-center pb-4">
             <Button asChild variant="default">
                <Link href={`/app/appointments/${activeToken.appointmentId}/status`}>View Full Status</Link>
             </Button>
           </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><CalendarCheck className="mr-2 h-5 w-5 text-primary" /> Upcoming Appointments</CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingAppointments.length > 0 ? (
              <ul className="space-y-3">
                {upcomingAppointments.map(appt => (
                  <li key={appt.id} className="p-3 bg-secondary/50 rounded-md shadow-sm">
                    <p className="font-semibold">{appt.doctorName} <span className="text-sm text-muted-foreground">({appt.specialization})</span></p>
                    <p className="text-sm">{new Date(appt.date).toLocaleDateString()} at {appt.time}</p>
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
            <CardTitle className="flex items-center"><MessageCircle className="mr-2 h-5 w-5 text-primary" /> Recent Messages</CardTitle>
          </CardHeader>
          <CardContent>
            {/* Placeholder for recent messages - Implement based on chat feature */}
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-md">
                <p className="text-muted-foreground">No new messages.</p>
            </div>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link href="/app/chat">Go to Chat</Link>
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center"><AlertCircle className="mr-2 h-5 w-5 text-primary" /> Important Notices</CardTitle>
          </CardHeader>
          <CardContent>
             {/* Placeholder for notices - Implement if needed */}
            <div className="flex items-center justify-center h-32 border-2 border-dashed rounded-md">
                 <p className="text-muted-foreground">No important notices.</p>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Card className="mt-6">
        <CardHeader>
            <CardTitle>Health Tips</CardTitle>
        </CardHeader>
        <CardContent>
            <div className="flex flex-col md:flex-row gap-4 items-center">
                <Image src="https://placehold.co/300x200.png" alt="Health Tip" width={300} height={200} className="rounded-md shadow-md object-cover" data-ai-hint="healthy lifestyle"/>
                <div>
                    <h3 className="text-lg font-semibold text-primary mb-2">Stay Hydrated This Summer!</h3>
                    <p className="text-muted-foreground">
                        Drinking enough water is crucial for maintaining good health, especially during warmer months. Aim for at least 8 glasses a day.
                        Water helps regulate body temperature, transport nutrients, and flush out waste.
                    </p>
                     <Button variant="link" asChild className="p-0 h-auto mt-2"><Link href="#">Read more</Link></Button>
                </div>
            </div>
        </CardContent>
      </Card>

    </div>
  );
}
