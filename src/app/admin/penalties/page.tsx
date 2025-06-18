"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Ban, CheckCircle, UserX, Search } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PenalizedUser {
  id: string;
  patientName: string;
  email: string;
  strikes: number;
  isBlocked: boolean;
  blockedUntil: string | null; // Date string or null
  lastMissedAppointment: string; // Date string
}

const mockPenalizedUsers: PenalizedUser[] = [
  { id: "user1", patientName: "John Doe", email: "john.doe@example.com", strikes: 3, isBlocked: true, blockedUntil: "2024-09-10", lastMissedAppointment: "2024-08-10" },
  { id: "user2", patientName: "Jane Smith", email: "jane.smith@example.com", strikes: 2, isBlocked: false, blockedUntil: null, lastMissedAppointment: "2024-08-15" },
  { id: "user3", patientName: "Mike Brown", email: "mike.brown@example.com", strikes: 1, isBlocked: false, blockedUntil: null, lastMissedAppointment: "2024-07-20" },
  { id: "user4", patientName: "Lisa White", email: "lisa.white@example.com", strikes: 3, isBlocked: true, blockedUntil: "2024-08-25", lastMissedAppointment: "2024-08-01" },
];

export default function ManagePenaltiesPage() {
  const { toast } = useToast();
  const [penalizedUsers, setPenalizedUsers] = useState<PenalizedUser[]>(mockPenalizedUsers);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredUsers = penalizedUsers.filter(user =>
    user.patientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUnblockUser = async (userId: string) => {
    // Simulate API call to unblock user
    await new Promise(resolve => setTimeout(resolve, 500));
    setPenalizedUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, isBlocked: false, blockedUntil: null, strikes: 0 } : user
      )
    );
    toast({ title: "User Unblocked", description: "The user's booking restrictions have been lifted." });
  };
  
  const handleResetStrikes = async (userId: string) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    setPenalizedUsers(prevUsers =>
      prevUsers.map(user =>
        user.id === userId ? { ...user, strikes: 0, isBlocked: false, blockedUntil: null } : user
      )
    );
    toast({ title: "Strikes Reset", description: "The user's missed appointment strikes have been reset." });
  };


  return (
    <div className="space-y-6">
      <PageHeader title="Manage Penalties" description="View and manage patient accounts with booking penalties due to missed appointments." />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle>Penalized Patient Accounts</CardTitle>
          <CardDescription>
            Patients are penalized for repeatedly missing appointments. Three strikes result in a temporary booking ban.
          </CardDescription>
          <div className="pt-4">
             <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                <Input 
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full md:w-1/2 lg:w-1/3 pl-10"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredUsers.length === 0 ? (
             <div className="text-center py-8 text-muted-foreground">
                <UserX className="mx-auto h-12 w-12 mb-4"/>
                <p>{searchTerm ? "No users match your search." : "No penalized users found."}</p>
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Patient Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="text-center">Strikes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Blocked Until</TableHead>
                <TableHead>Last Missed</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className={user.isBlocked ? "bg-destructive/10" : ""}>
                  <TableCell className="font-medium">{user.patientName}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell className="text-center">{user.strikes} / 3</TableCell>
                  <TableCell>
                    {user.isBlocked ? (
                      <span className="text-destructive font-semibold inline-flex items-center"><Ban className="mr-1 h-4 w-4"/>Blocked</span>
                    ) : (
                      <span className="text-green-600 inline-flex items-center"><CheckCircle className="mr-1 h-4 w-4"/>Active</span>
                    )}
                  </TableCell>
                  <TableCell>{user.blockedUntil ? new Date(user.blockedUntil).toLocaleDateString() : 'N/A'}</TableCell>
                  <TableCell>{new Date(user.lastMissedAppointment).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right space-x-1">
                    {user.isBlocked && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="outline" size="sm">Unblock</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Unblock User: {user.patientName}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will lift all booking restrictions and reset their strikes to 0. Are you sure?
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleUnblockUser(user.id)} className="bg-green-600 hover:bg-green-700 text-white">
                                Yes, Unblock
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    )}
                     {!user.isBlocked && user.strikes > 0 && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-700 hover:bg-yellow-100">Reset Strikes</Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Reset Strikes for: {user.patientName}?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will reset their missed appointment strikes to 0. Use this action with caution.
                            </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleResetStrikes(user.id)} className="bg-yellow-500 hover:bg-yellow-600 text-white">
                                Yes, Reset Strikes
                            </AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                        </AlertDialog>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
