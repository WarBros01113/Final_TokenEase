
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Search, Loader2, AlertCircle } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { db, collection, getDocs, query as firestoreQuery, orderBy, Timestamp } from "@/lib/firebase";
import Link from "next/link";
import { Button } from "@/components/ui/button";

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  doctorId: string;
  date: string; // Stored as YYYY-MM-DD string from Firestore
  time: string; // Stored as HH:MM
  appointmentTimeDisplay: string; // Stored as "HH:MM - HH:MM" or similar
  status: 'upcoming' | 'active' | 'delayed' | 'completed' | 'cancelled';
  tokenNumber?: number;
  createdAt: Timestamp; // For consistent sorting if dates/times are identical
}

type AppointmentStatus = Appointment['status'];

const getStatusVariant = (status: AppointmentStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (status) {
    case 'upcoming': return 'default'; // Primary color
    case 'active': return 'secondary'; // Accent color for active/positive
    case 'delayed': return 'outline'; // Yellowish/Orange for warning
    case 'completed': return 'secondary'; // Green or neutral for completed
    case 'cancelled': return 'destructive';
    default: return 'outline';
  }
};
const getStatusBadgeStyle = (status: AppointmentStatus): string => {
    switch (status) {
        case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'active': return 'bg-green-100 text-green-700 border-green-300 animate-pulse';
        case 'delayed': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 'completed': return 'bg-gray-100 text-gray-700 border-gray-300';
        case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
        default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
}


export default function ManageAppointmentsPage() {
  const { toast } = useToast();
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    try {
      const appointmentsRef = collection(db, "appointments");
      // Fetch all appointments, sort by date then time, most recent/relevant first
      const q = firestoreQuery(
        appointmentsRef,
        orderBy("date", "desc"),
        orderBy("time", "desc") 
        // Note: createdAt can be a secondary sort if needed, but date/time should suffice
      );
      const querySnapshot = await getDocs(q);
      const fetchedAppointments: Appointment[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        fetchedAppointments.push({
          id: doc.id,
          patientName: data.patientName || "N/A",
          patientId: data.patientId,
          doctorName: data.doctorName || "N/A",
          doctorId: data.doctorId,
          date: data.date instanceof Timestamp ? data.date.toDate().toISOString().split('T')[0] : data.date,
          time: data.appointmentTime, // Assuming this is HH:MM
          appointmentTimeDisplay: data.appointmentTimeDisplay || data.time, // Fallback to 'time' if display string not present
          status: data.status,
          tokenNumber: data.tokenNumber,
          createdAt: data.createdAt,
        } as Appointment);
      });
      setAllAppointments(fetchedAppointments);
    } catch (error) {
      console.error("Error fetching appointments: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch appointments." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filteredAppointments = useMemo(() => {
    let appointmentsToShow = allAppointments;

    // Filter by active tab
    if (activeTab === "upcoming") {
      appointmentsToShow = appointmentsToShow
        .filter(appt => ['upcoming', 'active', 'delayed'].includes(appt.status))
        .sort((a, b) => { // Sort upcoming: earliest date, then earliest time
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return a.time.localeCompare(b.time);
        });
    } else if (activeTab === "past") {
      appointmentsToShow = appointmentsToShow
        .filter(appt => ['completed', 'cancelled'].includes(appt.status))
        .sort((a,b) => { // Sort past: latest date, then latest time
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return b.time.localeCompare(a.time);
        });
    } else { // "all" case or default if more tabs added
       appointmentsToShow = appointmentsToShow.sort((a,b) => { // Default sort: latest date, then latest time
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return b.time.localeCompare(a.time);
        });
    }
    

    // Filter by search term
    if (searchTerm) {
      appointmentsToShow = appointmentsToShow.filter(appt =>
        appt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return appointmentsToShow;
  }, [allAppointments, activeTab, searchTerm]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading appointments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Manage Appointments" description="View and manage all patient appointments." />

      <Card className="shadow-lg">
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <CardTitle>All Appointments</CardTitle>
            <div className="relative w-full sm:w-1/2 md:w-1/3">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input
                    placeholder="Search by Patient, Doctor, or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "upcoming" | "past")} className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4 md:w-1/2">
              <TabsTrigger value="upcoming">Upcoming & Active</TabsTrigger>
              <TabsTrigger value="past">Past (Completed/Cancelled)</TabsTrigger>
            </TabsList>
            <TabsContent value="upcoming">
              <AppointmentsTable appointments={filteredAppointments} isLoading={isLoading}/>
            </TabsContent>
            <TabsContent value="past">
              <AppointmentsTable appointments={filteredAppointments} isLoading={isLoading}/>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

interface AppointmentsTableProps {
    appointments: Appointment[];
    isLoading: boolean;
}

const AppointmentsTable: React.FC<AppointmentsTableProps> = ({ appointments, isLoading }) => {
    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="ml-2">Loading appointments...</p>
        </div>
      );
    }

    if (appointments.length === 0) {
        return (
            <div className="text-center py-10 text-muted-foreground">
                <AlertCircle className="mx-auto h-12 w-12 mb-4" />
                <p>No appointments found for this filter.</p>
            </div>
        );
    }
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                <TableRow>
                    <TableHead>Appt. ID</TableHead>
                    <TableHead>Patient</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Time</TableHead>
                    <TableHead>Token</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                </TableRow>
                </TableHeader>
                <TableBody>
                {appointments.map((appt) => (
                    <TableRow key={appt.id}>
                    <TableCell className="font-mono text-xs">{appt.id.substring(0,8)}...</TableCell>
                    <TableCell className="font-medium">{appt.patientName}</TableCell>
                    <TableCell>{appt.doctorName}</TableCell>
                    <TableCell>{new Date(appt.date).toLocaleDateString()}</TableCell>
                    <TableCell>{appt.appointmentTimeDisplay}</TableCell>
                    <TableCell>{appt.tokenNumber || 'N/A'}</TableCell>
                    <TableCell>
                        <Badge variant={getStatusVariant(appt.status)} className={getStatusBadgeStyle(appt.status) + ' ' + 'font-semibold'}>
                         {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        {/* Future: Link to a detailed appointment view modal or page */}
                        <Button variant="outline" size="sm" asChild>
                            {/* This is a placeholder, actual patient appointment status page is specific to a patient */}
                            <Link href={`#`} onClick={(e) => { e.preventDefault(); alert('Detailed admin view not implemented yet.');}}>View</Link>
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    );
}
