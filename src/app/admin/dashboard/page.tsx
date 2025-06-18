
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Users, UserCheck, CalendarCheck, ShieldAlert, PieChart as PieChartIcon, Loader2 } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Pie, Cell, ResponsiveContainer } from 'recharts';
import type { ChartConfig } from "@/components/ui/chart";
import { useEffect, useState, useCallback } from "react";
import { db, collection, getDocs, query as firestoreQuery, where, Timestamp, count } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";

interface SummaryStat {
  title: string;
  value: string;
  icon: JSX.Element;
  trend?: string; // Optional trend for future use
}

interface DoctorAppointmentCount {
  name: string; // Doctor's name
  value: number; // Number of appointments
  fill: string; // Color for the pie chart segment
}

const initialChartConfig = {
  // Config will be populated dynamically based on doctors
} satisfies ChartConfig;


export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  
  const [totalRegisteredUsers, setTotalRegisteredUsers] = useState(0);
  const [totalPatientsVisited, setTotalPatientsVisited] = useState(0);
  const [patientsVisitedToday, setPatientsVisitedToday] = useState(0);
  const [activePenalties, setActivePenalties] = useState(0);
  const [doctorAppointmentsData, setDoctorAppointmentsData] = useState<DoctorAppointmentCount[]>([]);
  const [pieChartConfig, setPieChartConfig] = useState<ChartConfig>(initialChartConfig);


  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // 1. Total Registered Users (Patients)
      const usersRef = collection(db, "users");
      const patientsQuery = firestoreQuery(usersRef, where("role", "==", "patient"));
      const patientsSnapshot = await getDocs(patientsQuery);
      setTotalRegisteredUsers(patientsSnapshot.size);

      // 2. Total Patients Visited (Completed Appointments)
      const appointmentsRef = collection(db, "appointments");
      const completedQuery = firestoreQuery(appointmentsRef, where("status", "==", "completed"));
      const completedSnapshot = await getDocs(completedQuery);
      setTotalPatientsVisited(completedSnapshot.size);

      // 3. Patients Visited Today (Completed Appointments Today)
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
      const visitedTodayQuery = firestoreQuery(appointmentsRef, where("status", "==", "completed"), where("date", "==", todayStr));
      const visitedTodaySnapshot = await getDocs(visitedTodayQuery);
      setPatientsVisitedToday(visitedTodaySnapshot.size);
      
      // 4. Active Penalties
      const penaltiesQuery1 = firestoreQuery(usersRef, where("isBlocked", "==", true));
      const penaltiesSnapshot1 = await getDocs(penaltiesQuery1);
      const penaltiesQuery2 = firestoreQuery(usersRef, where("strikes", ">", 0)); // Consider users with strikes but not yet blocked
      const penaltiesSnapshot2 = await getDocs(penaltiesQuery2);
      // Combine results ensuring uniqueness if a user is blocked AND has strikes
      const penalizedUserIds = new Set<string>();
      penaltiesSnapshot1.forEach(doc => penalizedUserIds.add(doc.id));
      penaltiesSnapshot2.forEach(doc => penalizedUserIds.add(doc.id));
      setActivePenalties(penalizedUserIds.size);

      // 5. Appointments by Doctor (e.g., all appointments or completed ones)
      // For simplicity, let's count all appointments per doctor for now
      const allAppointmentsSnapshot = await getDocs(appointmentsRef);
      const appointmentsByDoctor: { [key: string]: number } = {};
      allAppointmentsSnapshot.forEach(doc => {
        const data = doc.data();
        if (data.doctorName) {
          appointmentsByDoctor[data.doctorName] = (appointmentsByDoctor[data.doctorName] || 0) + 1;
        }
      });
      
      const chartColors = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];
      const newPieData: DoctorAppointmentCount[] = [];
      const newPieConfig: ChartConfig = {};
      Object.entries(appointmentsByDoctor).forEach(([doctorName, count], index) => {
        const color = chartColors[index % chartColors.length];
        newPieData.push({ name: doctorName, value: count, fill: color });
        newPieConfig[doctorName] = { label: doctorName, color: color };
      });
      setDoctorAppointmentsData(newPieData);
      setPieChartConfig(newPieConfig);

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load dashboard data." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const summaryStats: SummaryStat[] = [
    { title: "Total Registered Users", value: totalRegisteredUsers.toString(), icon: <Users className="h-6 w-6 text-primary" /> },
    { title: "Total Patients Visited", value: totalPatientsVisited.toString(), icon: <UserCheck className="h-6 w-6 text-primary" /> },
    { title: "Patients Visited Today", value: patientsVisitedToday.toString(), icon: <CalendarCheck className="h-6 w-6 text-primary" /> },
    { title: "Active Penalties", value: activePenalties.toString(), icon: <ShieldAlert className="h-6 w-6 text-destructive" /> },
  ];
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading dashboard data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Overview of clinic operations and patient statistics." />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map(stat => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.trend && <p className="text-xs text-muted-foreground">{stat.trend}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-1"> {/* Changed to lg:grid-cols-1 as only one chart remains */}
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><PieChartIcon className="mr-2 h-5 w-5 text-primary" /> Appointments by Doctor</CardTitle>
            <CardDescription>Distribution of appointments across different doctors.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             {doctorAppointmentsData.length > 0 ? (
                <ChartContainer config={pieChartConfig} className="h-[300px] w-full max-w-md"> {/* Adjusted max-w */}
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPrimitive.PieChart>
                      <RechartsPrimitive.Pie data={doctorAppointmentsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label >
                        {doctorAppointmentsData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                      </RechartsPrimitive.Pie>
                      <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                      <ChartLegend content={<ChartLegendContent />} />
                    </RechartsPrimitive.PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
             ) : (
                <div className="text-center py-8 text-muted-foreground">
                    <PieChartIcon className="mx-auto h-12 w-12 mb-4"/>
                    <p>No appointment data available to display chart.</p>
                </div>
             )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Need to define RechartsPrimitive for the PieChart component as used in shadcn/ui chart examples
import * as RechartsPrimitive from "recharts";

    