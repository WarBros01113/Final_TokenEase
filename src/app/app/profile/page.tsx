"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Edit3, Mail, Phone, CalendarDays as CalendarIcon, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function PatientProfilePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  // Mock additional user data
  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || "Test Patient",
    email: user?.email || "patient@example.com",
    phoneNumber: "9876543210",
    dob: "1990-01-01",
    address: "123 Health St, Wellness City",
    strikes: 1, // Example penalty strikes
    isBlocked: false, // Example block status
    blockedUntil: "2024-09-01" // Example blocked until date
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    // Here you would call an action to update user profile in Firestore/Firebase Auth
    console.log("Saving profile:", profileData);
    toast({ title: "Profile Updated", description: "Your changes have been saved." });
    setIsEditing(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) return <div className="text-center p-8">Please log in to view your profile.</div>;
  
  const getInitials = (name?: string | null) => {
    if (!name) return "U";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="View and manage your personal information.">
        <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "default" : "outline"}>
          <Edit3 className="mr-2 h-4 w-4" /> {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left">
          <Avatar className="h-24 w-24 mb-4 sm:mb-0 sm:mr-6 ring-2 ring-primary ring-offset-2">
            <AvatarImage src={user.photoURL || `https://placehold.co/100x100.png?text=${getInitials(profileData.displayName)}`} alt={profileData.displayName} />
            <AvatarFallback>{getInitials(profileData.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-headline">{profileData.displayName}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> {profileData.email}
            </CardDescription>
            {isEditing && (
                 <Button variant="outline" size="sm" className="mt-2">Change Photo</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="space-y-6">
            <div>
              <Label htmlFor="displayName">Full Name</Label>
              <Input id="displayName" name="displayName" value={profileData.displayName} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email" className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Email</Label>
                <Input id="email" type="email" value={profileData.email} disabled />
                 <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
              </div>
              <div>
                <Label htmlFor="phoneNumber" className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" /> Phone Number</Label>
                <Input id="phoneNumber" name="phoneNumber" value={profileData.phoneNumber} onChange={handleInputChange} disabled={!isEditing} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="dob" className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Date of Birth</Label>
                <Input id="dob" name="dob" type="date" value={profileData.dob} onChange={handleInputChange} disabled={!isEditing} />
              </div>
               <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={profileData.address} onChange={handleInputChange} disabled={!isEditing} />
              </div>
            </div>
            
            {isEditing && (
              <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Changes</Button>
              </div>
            )}
          </div>

          <Separator className="my-8" />

          <div>
            <h3 className="text-lg font-semibold mb-2 flex items-center text-primary">
                <ShieldAlert className="mr-2 h-5 w-5"/> Account Status
            </h3>
            <div className="p-4 bg-secondary/30 rounded-md space-y-2">
                <p>Missed Appointment Strikes: <span className="font-semibold">{profileData.strikes} / 3</span></p>
                {profileData.isBlocked && (
                    <p className="text-destructive font-semibold">
                        Your account is currently blocked for new bookings until {new Date(profileData.blockedUntil).toLocaleDateString()}.
                    </p>
                )}
                {!profileData.isBlocked && profileData.strikes > 0 && (
                    <p className="text-yellow-600">
                       Please attend your appointments to avoid booking restrictions. Reaching 3 strikes will result in a temporary block.
                    </p>
                )}
                 {!profileData.isBlocked && profileData.strikes === 0 && (
                    <p className="text-green-600">
                       Your account is in good standing. Thank you for your cooperation!
                    </p>
                )}
            </div>
          </div>

        </CardContent>
      </Card>
    </div>
  );
}

// Minimal loader for when auth state is loading
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
