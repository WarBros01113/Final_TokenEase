
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Ban, CheckCircle, UserX, Search, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
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
import { db, collection, getDocs, doc, updateDoc, query as firestoreQuery, where, Timestamp } from "@/lib/firebase"; // Added Timestamp

interface PenalizedUser {
  id: string; // Firebase User UID
  fullName: string; // Changed from patientName to match user model
  email: string;
  strikes: number;
  isBlocked: boolean;
  blockedUntil: string | null; 
  lastMissedAppointment?: string; // This might be harder to track without a dedicated "missed_appointments" collection
}

export default function ManagePenaltiesPage() {
  const { toast } = useToast();
  const [penalizedUsers, setPenalizedUsers] = useState<PenalizedUser[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchPenalizedUsers = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch users who have strikes or are blocked
      const usersRef = collection(db, "users");
      // Firestore doesn't support OR queries directly on different fields like (strikes > 0 || isBlocked == true)
      // So, fetch users with strikes, then users who are blocked, and merge them.
      // Or, more simply, fetch all users and filter client-side if the user base isn't excessively large.
      // For a more scalable solution, you might have a dedicated field or trigger that marks users for penalty review.
      
      // Fetch all users for now and filter.
      const querySnapshot = await getDocs(usersRef);
      const fetchedUsers: PenalizedUser[] = [];
      querySnapshot.forEach((userDoc) => {
        const data = userDoc.data();
        if (data.role === 'patient' && (data.strikes > 0 || data.isBlocked)) {
          fetchedUsers.push({
            id: userDoc.id,
            fullName: data.fullName || data.displayName || "N/A",
            email: data.email || "N/A",
            strikes: data.strikes || 0,
            isBlocked: data.isBlocked || false,
            blockedUntil: data.blockedUntil ? (data.blockedUntil as Timestamp).toDate().toISOString().split('T')[0] : null,
            // lastMissedAppointment: data.lastMissedAppointment ? new Date(data.lastMissedAppointment.seconds * 1000).toLocaleDateString() : "N/A",
          });
        }
      });
      setPenalizedUsers(fetchedUsers);
    } catch (error) {
      console.error("Error fetching penalized users: ", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch user data for penalties." });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPenalizedUsers();
  }, [fetchPenalizedUsers]);


  const filteredUsers = penalizedUsers.filter(user =>
    user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleUnblockUser = async (userId: string) => {
    setIsUpdating(true);
    try {
      const userRef = doc(db, "users", userId);
      await updateDoc(userRef, {
        isBlocked: false,
        blockedUntil: null,
        strikes: 0, // Typically unblocking also resets strikes
      });
      toast({ title: "User Unblocked", description: "The user's booking restrictions have been lifted and strikes reset." });
      fetchPenalizedUsers(); // Refresh list
    } catch (error: any) {
        toast({ variant: "destructive", title: "Update Error", description: error.message || "Could not unblock user." });
    } finally {
        setIsUpdating(false);
    }
  };
  
  const handleResetStrikes = async (userId: string) => {
    setIsUpdating(true);
    try {
        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
            strikes: 0,
            // Optionally, ensure isBlocked is false if strikes are reset, unless blocking is for other reasons.
            // isBlocked: false, 
            // blockedUntil: null,
        });
        toast({ title: "Strikes Reset", description: "The user's missed appointment strikes have been reset." });
        fetchPenalizedUsers(); // Refresh list
    } catch (error: any) {
        toast({ variant: "destructive", title: "Update Error", description: error.message || "Could not reset strikes." });
    } finally {
        setIsUpdating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading penalized users...</p>
      </div>
    );
  }

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
                {/* <TableHead>Last Missed</TableHead> */}
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredUsers.map((user) => (
                <TableRow key={user.id} className={user.isBlocked ? "bg-destructive/10" : ""}>
                  <TableCell className="font-medium">{user.fullName}</TableCell>
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
                  {/* <TableCell>{user.lastMissedAppointment || 'N/A'}</TableCell> */}
                  <TableCell className="text-right space-x-1">
                    {user.isBlocked && (
                       <AlertDialog>
                        <AlertDialogTrigger asChild>
                           <Button variant="outline" size="sm" disabled={isUpdating}>
                            {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Unblock
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Unblock User: {user.fullName}?</AlertDialogTitle>
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
                           <Button variant="outline" size="sm" className="border-yellow-500 text-yellow-700 hover:bg-yellow-100" disabled={isUpdating}>
                             {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Reset Strikes
                           </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                            <AlertDialogTitle>Reset Strikes for: {user.fullName}?</AlertDialogTitle>
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
