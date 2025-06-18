"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CalendarCheck, Clock, MessageCircle } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import Image from "next/image";

// Mock data types
interface Appointment {
  id: string;
  doctorName: string;
  specialization: string;
  date: string;
  time: string;
  status: 'upcoming' | 'active' | 'completed';
  tokenNumber?: number;
  estimatedWaitTime?: string;
}

interface TokenInfo {
  currentServing: number;
  yourToken: number;
  estimatedTime: string;
  doctorName: string;
}

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const [upcomingAppointments, setUpcomingAppointments] = useState<Appointment[]>([]);
  const [activeToken, setActiveToken] = useState<TokenInfo | null>(null);

  useEffect(() => {
    // Mock fetching data
    setUpcomingAppointments([
      { id: "1", doctorName: "Dr. Smith", specialization: "Cardiologist", date: "2024-08-15", time: "10:00 AM", status: 'upcoming' },
      { id: "2", doctorName: "Dr. Jones", specialization: "Pediatrician", date: "2024-08-16", time: "02:30 PM", status: 'upcoming' },
    ]);
    setActiveToken({
      currentServing: 5,
      yourToken: 8,
      estimatedTime: "11:45 AM",
      doctorName: "Dr. Emily White"
    });
  }, []);

  return (
    <div className="space-y-6">
      <PageHeader title={`Welcome, ${user?.displayName || 'Patient'}!`} description="Here's an overview of your upcoming activities." />

      {activeToken && (
        <Card className="bg-primary/10 border-primary shadow-lg">
          <CardHeader>
            <CardTitle className="text-primary flex items-center">
              <Clock className="mr-2 h-6 w-6" /> Live Token Status
            </CardTitle>
            <CardDescription>Your current appointment with {activeToken.doctorName}.</CardDescription>
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
                    <p className="text-sm">{new Date(appt.date).toDateString()} at {appt.time}</p>
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
            {/* Placeholder for recent messages */}
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
             {/* Placeholder for notices */}
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
                <Image src="https://placehold.co/300x200.png" alt="Health Tip" width={300} height={200} className="rounded-md shadow-md" data-ai-hint="healthy lifestyle"/>
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
