"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ArrowLeft, CalendarCheck, Clock, MessageCircle, User, Users } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

interface AppointmentDetails {
  id: string;
  doctorName: string;
  doctorSpecialization: string;
  doctorAvatarUrl?: string;
  appointmentDate: string;
  appointmentTime: string;
  status: 'Upcoming' | 'Active' | 'Delayed' | 'Completed' | 'Cancelled';
  currentServingToken?: number;
  yourToken: number;
  estimatedWaitTime?: string; // e.g., "15 mins" or "Approximately 11:45 AM"
  clinicAddress: string;
  notes?: string;
}

const mockAppointmentDetails: AppointmentDetails = {
  id: "appt123",
  doctorName: "Dr. Emily Carter",
  doctorSpecialization: "General Physician",
  doctorAvatarUrl: "https://placehold.co/100x100.png?text=EC",
  appointmentDate: "2024-08-28",
  appointmentTime: "11:30 AM",
  status: 'Active',
  currentServingToken: 8,
  yourToken: 10,
  estimatedWaitTime: "Approximately 11:45 AM (10 mins wait)",
  clinicAddress: "TokenEase Central Clinic, 123 Main St, HealthCity",
  notes: "Please bring any previous medical records if this is your first visit.",
};

export default function AppointmentStatusPage() {
  const params = useParams();
  const appointmentId = params.appointmentId as string;
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate fetching appointment details
    setIsLoading(true);
    setTimeout(() => {
      // In a real app, fetch details for `appointmentId`
      // For this mock, we'll use the same details and update token numbers slightly over time
      const updatedMock = {
        ...mockAppointmentDetails,
        id: appointmentId,
        currentServingToken: (mockAppointmentDetails.currentServingToken || 0) + Math.floor(Math.random() * 2), // Simulate token progress
      };
      setAppointment(updatedMock);
      setIsLoading(false);
    }, 1000);
  }, [appointmentId]);

  // Simulate real-time updates for token
  useEffect(() => {
    if (appointment?.status === 'Active' || appointment?.status === 'Upcoming') {
      const interval = setInterval(() => {
        setAppointment(prev => {
          if (!prev || (prev.currentServingToken && prev.currentServingToken >= prev.yourToken)) {
            clearInterval(interval);
            if (prev && prev.currentServingToken && prev.currentServingToken >= prev.yourToken) {
                return {...prev, status: 'Active', estimatedWaitTime: 'Your turn soon!'};
            }
            return prev;
          }
          const newServing = (prev.currentServingToken || 0) + 1;
          const waitDiff = prev.yourToken - newServing;
          const estimatedWait = waitDiff > 0 ? `${waitDiff * 5} mins` : 'Your turn soon!'; // Rough estimate
          
          return {
            ...prev,
            currentServingToken: newServing,
            estimatedWaitTime: estimatedWait,
            status: newServing >= prev.yourToken ? 'Active' : prev.status,
          };
        });
      }, 15000); // Update every 15 seconds
      return () => clearInterval(interval);
    }
  }, [appointment]);


  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[calc(100vh-200px)]">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Loading appointment details...</p>
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="space-y-6 text-center">
        <PageHeader title="Appointment Not Found" />
        <AlertCircle className="mx-auto h-16 w-16 text-destructive" />
        <p className="text-lg">We couldn't find the details for this appointment.</p>
        <Button asChild variant="outline">
          <Link href="/app/appointments"><ArrowLeft className="mr-2 h-4 w-4"/> Back to Appointments</Link>
        </Button>
      </div>
    );
  }
  
  const isYourTurn = appointment.status === 'Active' && appointment.currentServingToken && appointment.currentServingToken >= appointment.yourToken;

  return (
    <div className="space-y-6">
      <PageHeader title="Appointment Status" description={`Tracking your appointment: #${appointment.id}`}>
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
            <p className="flex items-center"><CalendarCheck className="mr-2 h-4 w-4" /> {new Date(appointment.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })} at {appointment.appointmentTime}</p>
            <p className="flex items-center mt-1"><Users className="mr-2 h-4 w-4" /> Token Number: <span className="font-bold text-xl ml-2">{appointment.yourToken}</span></p>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 grid md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-primary">Live Queue Status</h3>
            {appointment.status === 'Upcoming' && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-md text-center">
                    <p className="text-blue-700 font-semibold">Your appointment is upcoming.</p>
                    <p className="text-sm text-blue-600">Queue tracking will begin closer to your appointment time.</p>
                </div>
            )}
            {(appointment.status === 'Active' || appointment.status === 'Delayed') && appointment.currentServingToken && (
              <div className="grid grid-cols-2 gap-4 text-center">
                <Card className="pt-4 bg-secondary/30">
                  <CardDescription>Currently Serving</CardDescription>
                  <CardTitle className="text-5xl font-bold text-accent py-2">{appointment.currentServingToken}</CardTitle>
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
            {appointment.estimatedWaitTime && !isYourTurn && (
              <p className="text-center text-lg font-medium text-foreground/80 flex items-center justify-center"><Clock className="mr-2 h-5 w-5 text-primary"/> {appointment.estimatedWaitTime}</p>
            )}
             {appointment.status === 'Completed' && (
                <div className="p-4 bg-green-100 border border-green-300 rounded-md text-center">
                    <p className="text-green-700 font-semibold text-lg">This appointment has been completed.</p>
                </div>
            )}
            {appointment.status === 'Cancelled' && (
                <div className="p-4 bg-red-100 border border-red-300 rounded-md text-center">
                    <p className="text-red-700 font-semibold text-lg">This appointment was cancelled.</p>
                </div>
            )}
          </div>

          <div className="space-y-4">
             <h3 className="text-lg font-semibold text-primary">Appointment Details</h3>
             <p><strong className="text-foreground/80">Status:</strong> <span className={`font-semibold px-2 py-0.5 rounded-full text-xs ${
                appointment.status === 'Active' ? 'bg-green-100 text-green-700' :
                appointment.status === 'Upcoming' ? 'bg-blue-100 text-blue-700' :
                appointment.status === 'Delayed' ? 'bg-yellow-100 text-yellow-700' :
                appointment.status === 'Completed' ? 'bg-gray-100 text-gray-700' :
                'bg-red-100 text-red-700'
             }`}>{appointment.status}</span></p>
             <p><strong className="text-foreground/80">Clinic:</strong> {appointment.clinicAddress}</p>
             {appointment.notes && <p><strong className="text-foreground/80">Notes:</strong> {appointment.notes}</p>}
             
             <div className="pt-4 space-x-2">
                <Button variant="outline" asChild>
                    <Link href={`/app/chat?doctorId=${appointment.doctorName.replace(/\s+/g, '')}`}> {/* Simplistic doctorId */}
                        <MessageCircle className="mr-2 h-4 w-4"/> Message Doctor
                    </Link>
                </Button>
                {(appointment.status === 'Upcoming' || appointment.status === 'Active') &&
                    <Button variant="destructive" outline>Cancel Appointment</Button>
                }
             </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


function Loader2({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
