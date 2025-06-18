"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BarChart, LineChart, PieChart } from 'lucide-react'; // Placeholder icons for charts
import { Users, CalendarCheck, DollarSign, AlertTriangle } from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import { Bar, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, Pie, Cell, Line } from 'recharts'; // Using recharts directly
import type { ChartConfig } from "@/components/ui/chart";

const chartData = [
  { month: "January", appointments: 186, revenue: 8000 },
  { month: "February", appointments: 305, revenue: 12000 },
  { month: "March", appointments: 237, revenue: 9500 },
  { month: "April", appointments: 273, revenue: 11000 },
  { month: "May", appointments: 209, revenue: 8500 },
  { month: "June", appointments: 314, revenue: 13000 },
];

const chartConfig = {
  appointments: {
    label: "Appointments",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenue",
    color: "hsl(var(--accent))",
  },
} satisfies ChartConfig;

const pieChartData = [
    { name: 'Cardiology', value: 400, fill: 'hsl(var(--chart-1))' },
    { name: 'Pediatrics', value: 300, fill: 'hsl(var(--chart-2))'  },
    { name: 'Dermatology', value: 200, fill: 'hsl(var(--chart-3))'  },
    { name: 'Others', value: 278, fill: 'hsl(var(--chart-4))'  },
];


export default function AdminDashboardPage() {
  const summaryStats = [
    { title: "Total Patients", value: "1,250", icon: <Users className="h-6 w-6 text-primary" />, trend: "+5% this month" },
    { title: "Appointments Today", value: "75", icon: <CalendarCheck className="h-6 w-6 text-primary" />, trend: "+10 from yesterday" },
    { title: "Total Revenue (Month)", value: "$13,500", icon: <DollarSign className="h-6 w-6 text-primary" />, trend: "+8% from last month" },
    { title: "Active Penalties", value: "12", icon: <AlertTriangle className="h-6 w-6 text-destructive" />, trend: "2 new today" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Dashboard" description="Overview of clinic operations and statistics." />

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {summaryStats.map(stat => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.trend}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><BarChart className="mr-2 h-5 w-5 text-primary" /> Monthly Appointments & Revenue</CardTitle>
            <CardDescription>Overview of appointments and revenue for the last 6 months.</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                 <RechartsPrimitive.BarChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                  <YAxis yAxisId="left" orientation="left" stroke="hsl(var(--primary))" />
                  <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--accent))" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <ChartLegend content={<ChartLegendContent />} />
                  <RechartsPrimitive.Bar dataKey="appointments" fill="var(--color-appointments)" radius={4} yAxisId="left" />
                  <RechartsPrimitive.Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} yAxisId="right" dot={false} />
                </RechartsPrimitive.BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center"><PieChart className="mr-2 h-5 w-5 text-primary" /> Appointments by Specialization</CardTitle>
            <CardDescription>Distribution of appointments across different specializations.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
             <ChartContainer config={{}} className="h-[300px] w-full max-w-xs">
               <ResponsiveContainer width="100%" height="100%">
                <RechartsPrimitive.PieChart>
                  <RechartsPrimitive.Pie data={pieChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label >
                     {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                  </RechartsPrimitive.Pie>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <ChartLegend content={<ChartLegendContent />} />
                </RechartsPrimitive.PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}

// Need to define RechartsPrimitive for the BarChart and PieChart components as used in shadcn/ui chart examples
import * as RechartsPrimitive from "recharts";
