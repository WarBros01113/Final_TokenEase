
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CalendarClock, Search, Loader2, AlertCircle, Eye } from "lucide-react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { db, collection, getDocs, query as firestoreQuery, orderBy, Timestamp, where, writeBatch } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface Appointment {
  id: string;
  patientName: string;
  patientId: string;
  doctorName: string;
  doctorId: string;
  date: string; 
  time: string; 
  appointmentTimeDisplay: string; 
  status: 'upcoming' | 'active' | 'delayed' | 'completed' | 'cancelled' | 'missed';
  tokenNumber?: number;
  createdAt: Timestamp; 
  notes?: string; 
  specialization?: string;
}

type AppointmentStatus = Appointment['status'];

const getStatusBadgeStyle = (status: AppointmentStatus): string => {
    switch (status) {
        case 'upcoming': return 'bg-blue-100 text-blue-700 border-blue-300';
        case 'active': return 'bg-green-100 text-green-700 border-green-300 animate-pulse';
        case 'delayed': return 'bg-yellow-100 text-yellow-700 border-yellow-300';
        case 'completed': return 'bg-gray-100 text-gray-700 border-gray-300';
        case 'cancelled': return 'bg-red-100 text-red-700 border-red-300';
        case 'missed': return 'bg-orange-100 text-orange-700 border-orange-300';
        default: return 'bg-gray-100 text-gray-700 border-gray-300';
    }
}


export default function ManageAppointmentsPage() {
  const { toast } = useToast();
  const [allAppointments, setAllAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"upcoming" | "past">("upcoming");

  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [viewingAppointment, setViewingAppointment] = useState<Appointment | null>(null);

  const updateMissedAppointments = useCallback(async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayStr = today.toISOString().split('T')[0];
      
      const missedApptsQuery = firestoreQuery(
        collection(db, "appointments"),
        where("date", "<", todayStr),
        where("status", "in", ["upcoming", "active", "delayed"])
      );

      const snapshot = await getDocs(missedApptsQuery);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach(docSnap => {
          batch.update(docSnap.ref, { status: "missed" });
        });
        await batch.commit();
        console.log(`Updated ${snapshot.size} appointments to 'missed'.`);
        return true; 
      }
      return false;
    } catch (e) {
      console.error("Error updating missed appointments on admin page: ", e);
      return false;
    }
  }, []);

  const fetchAppointments = useCallback(async () => {
    setIsLoading(true);
    // First, run the cleanup for missed appointments
    await updateMissedAppointments();
    
    try {
      const appointmentsRef = collection(db, "appointments");
      const q = firestoreQuery(
        appointmentsRef,
        orderBy("date", "desc"),
        orderBy("time", "desc") 
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
          time: data.appointmentTime, 
          appointmentTimeDisplay: data.appointmentTimeDisplay || data.time,
          status: data.status,
          tokenNumber: data.tokenNumber,
          createdAt: data.createdAt,
          notes: data.notes,
          specialization: data.specialization
        } as Appointment);
      });
      setAllAppointments(fetchedAppointments);
    } catch (error) {
      console.error("Error fetching appointments: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch appointments." });
    } finally {
      setIsLoading(false);
    }
  }, [toast, updateMissedAppointments]);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const filteredAppointments = useMemo(() => {
    let appointmentsToShow = allAppointments;
    if (activeTab === "upcoming") {
      appointmentsToShow = appointmentsToShow
        .filter(appt => ['upcoming', 'active', 'delayed'].includes(appt.status))
        .sort((a, b) => { 
            const dateComp = a.date.localeCompare(b.date);
            if (dateComp !== 0) return dateComp;
            return a.time.localeCompare(b.time);
        });
    } else if (activeTab === "past") {
      appointmentsToShow = appointmentsToShow
        .filter(appt => ['completed', 'cancelled', 'missed'].includes(appt.status))
        .sort((a,b) => { 
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return b.time.localeCompare(a.time);
        });
    } else { 
       appointmentsToShow = appointmentsToShow.sort((a,b) => { 
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return b.time.localeCompare(a.time);
        });
    }
    
    if (searchTerm) {
      appointmentsToShow = appointmentsToShow.filter(appt =>
        appt.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.doctorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        appt.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return appointmentsToShow;
  }, [allAppointments, activeTab, searchTerm]);

  const handleViewAppointment = (appointment: Appointment) => {
    setViewingAppointment(appointment);
    setIsViewDialogOpen(true);
  };

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
              <AppointmentsTable appointments={filteredAppointments} isLoading={isLoading} onViewDetails={handleViewAppointment} />
            </TabsContent>
            <TabsContent value="past">
              <AppointmentsTable appointments={filteredAppointments} isLoading={isLoading} onViewDetails={handleViewAppointment} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {viewingAppointment && (
        <AlertDialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
          <AlertDialogContent className="max-w-lg">
            <AlertDialogHeader>
              <AlertDialogTitle>Appointment Details</AlertDialogTitle>
              <AlertDialogDescription>
                ID: {viewingAppointment.id}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2 text-sm max-h-[60vh] overflow-y-auto pr-2">
              <p><strong>Patient:</strong> {viewingAppointment.patientName} (ID: {viewingAppointment.patientId.substring(0,8)}...)</p>
              <p><strong>Doctor:</strong> {viewingAppointment.doctorName} (ID: {viewingAppointment.doctorId.substring(0,8)}...)</p>
              {viewingAppointment.specialization && <p><strong>Specialization:</strong> {viewingAppointment.specialization}</p>}
              <p><strong>Date:</strong> {new Date(viewingAppointment.date).toLocaleDateString()}</p>
              <p><strong>Time Slot:</strong> {viewingAppointment.appointmentTimeDisplay}</p>
              <p><strong>Actual Time (HH:MM):</strong> {viewingAppointment.time}</p>
              <p><strong>Token:</strong> {viewingAppointment.tokenNumber || 'N/A'}</p>
              <p><strong>Status:</strong> <span className={`font-semibold px-2 py-0.5 rounded-full text-xs capitalize ${getStatusBadgeStyle(viewingAppointment.status)}`}>{viewingAppointment.status}</span></p>
              {viewingAppointment.notes && <p><strong>Notes:</strong> {viewingAppointment.notes}</p>}
              <p><strong>Created At:</strong> {viewingAppointment.createdAt.toDate().toLocaleString()}</p>
            </div>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setViewingAppointment(null)}>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

interface AppointmentsTableProps {
    appointments: Appointment[];
    isLoading: boolean;
    onViewDetails: (appointment: Appointment) => void;
}

const AppointmentsTable: React.FC<AppointmentsTableProps> = ({ appointments, isLoading, onViewDetails }) => {
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
                        <Badge variant={"outline"} className={getStatusBadgeStyle(appt.status) + ' ' + 'font-semibold'}>
                         {appt.status.charAt(0).toUpperCase() + appt.status.slice(1)}
                        </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                        <Button variant="outline" size="sm" onClick={() => onViewDetails(appt)}>
                            <Eye className="mr-1 h-4 w-4" /> View
                        </Button>
                    </TableCell>
                    </TableRow>
                ))}
                </TableBody>
            </Table>
        </div>
    );
}
