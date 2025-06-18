
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth, AppUser } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Edit3, Mail, Phone, CalendarDays as CalendarIcon, ShieldAlert, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { db, doc, updateDoc, getDoc } from "@/lib/firebase";
import { updateProfile as updateFirebaseUserProfile } from "firebase/auth"; // Renamed to avoid conflict

interface ProfileData {
  displayName: string;
  email: string;
  phoneNumber: string;
  dob: string;
  address: string;
  strikes: number;
  isBlocked: boolean;
  blockedUntil: string;
  photoURL?: string | null;
}

export default function PatientProfilePage() {
  const { user, loading: authLoading, role } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [pageLoading, setPageLoading] = useState(true);

  const [profileData, setProfileData] = useState<ProfileData>({
    displayName: "",
    email: "",
    phoneNumber: "",
    dob: "",
    address: "",
    strikes: 0,
    isBlocked: false,
    blockedUntil: "",
    photoURL: null,
  });

  useEffect(() => {
    if (user) {
      // Initialize form with data from AuthContext (which includes Firestore data)
      setProfileData({
        displayName: user.displayName || user.fullName || "",
        email: user.email || "",
        phoneNumber: user.phoneNumber || "",
        dob: user.dob || "",
        address: user.address || "",
        strikes: user.strikes || 0,
        isBlocked: user.isBlocked || false,
        blockedUntil: user.blockedUntil || "",
        photoURL: user.photoURL,
      });
      setPageLoading(false);
    } else if (!authLoading) {
      // If auth is not loading and there's no user, stop page loading
      setPageLoading(false);
    }
  }, [user, authLoading]);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) {
      toast({ variant: "destructive", title: "Error", description: "You must be logged in to update your profile." });
      return;
    }
    setIsSaving(true);
    try {
      // Update Firebase Auth profile (displayName, photoURL)
      if (auth.currentUser) { // Ensure currentUser is available
        await updateFirebaseUserProfile(auth.currentUser, {
          displayName: profileData.displayName,
          // photoURL: profileData.photoURL, // Photo upload not implemented in this step
        });
      }

      // Update Firestore user document
      const userDocRef = doc(db, "users", user.uid);
      await updateDoc(userDocRef, {
        displayName: profileData.displayName, // Keep Firestore displayName in sync
        fullName: profileData.displayName, // Assuming displayName is the full name for simplicity
        phoneNumber: profileData.phoneNumber,
        dob: profileData.dob,
        address: profileData.address,
        // photoURL: profileData.photoURL, // If storing in Firestore too
      });

      toast({ title: "Profile Updated", description: "Your changes have been saved." });
      setIsEditing(false);
       // Manually update user object in AuthContext or trigger a re-fetch.
      // For now, local state is updated, AuthContext will update on next full load/change.
    } catch (error: any) {
      console.error("Error saving profile: ", error);
      toast({ variant: "destructive", title: "Save Error", description: error.message || "Could not save profile." });
    } finally {
      setIsSaving(false);
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading profile...</p>
      </div>
    );
  }
  
  if (!user) {
    return <div className="text-center p-8">Please log in to view your profile. Redirecting...</div>;
  }
  
  const getInitials = (name?: string | null) => {
    if (!name) return "P"; // Patient
    return name.split(' ').map(n => n[0]).join('').toUpperCase() || "P";
  };

  return (
    <div className="space-y-6">
      <PageHeader title="My Profile" description="View and manage your personal information.">
        <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "default" : "outline"} disabled={isSaving} suppressHydrationWarning={true}>
          <Edit3 className="mr-2 h-4 w-4" /> {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left">
          <Avatar className="h-24 w-24 mb-4 sm:mb-0 sm:mr-6 ring-2 ring-primary ring-offset-2">
            <AvatarImage src={profileData.photoURL || `https://placehold.co/100x100.png?text=${getInitials(profileData.displayName)}`} alt={profileData.displayName} />
            <AvatarFallback>{getInitials(profileData.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-headline">{profileData.displayName}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> {profileData.email}
            </CardDescription>
            {isEditing && (
                 <Button variant="outline" size="sm" className="mt-2" onClick={() => toast({title: "Feature not implemented", description:"Photo upload will be available soon."})} suppressHydrationWarning={true}>Change Photo</Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="space-y-6">
            <div>
              <Label htmlFor="displayName">Full Name</Label>
              <Input id="displayName" name="displayName" value={profileData.displayName} onChange={handleInputChange} disabled={!isEditing || isSaving} suppressHydrationWarning={true}/>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="email" className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Email</Label>
                <Input id="email" type="email" value={profileData.email} disabled suppressHydrationWarning={true}/>
                 <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
              </div>
              <div>
                <Label htmlFor="phoneNumber" className="flex items-center"><Phone className="mr-2 h-4 w-4 text-muted-foreground" /> Phone Number</Label>
                <Input id="phoneNumber" name="phoneNumber" value={profileData.phoneNumber} onChange={handleInputChange} disabled={!isEditing || isSaving} suppressHydrationWarning={true}/>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <Label htmlFor="dob" className="flex items-center"><CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" /> Date of Birth</Label>
                <Input id="dob" name="dob" type="date" value={profileData.dob} onChange={handleInputChange} disabled={!isEditing || isSaving} suppressHydrationWarning={true}/>
              </div>
               <div>
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" value={profileData.address} onChange={handleInputChange} disabled={!isEditing || isSaving} suppressHydrationWarning={true}/>
              </div>
            </div>
            
            {isEditing && (
              <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSaving} suppressHydrationWarning={true}>
                  {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Saving...</> : "Save Changes"}
                </Button>
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
                {profileData.isBlocked && profileData.blockedUntil && (
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
