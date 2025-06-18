"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Edit3, Mail, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminProfilePage() {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    displayName: user?.displayName || "Admin User",
    email: user?.email || "admin@example.com",
    role: "Administrator"
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setProfileData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = () => {
    console.log("Saving admin profile:", profileData);
    toast({ title: "Profile Updated", description: "Admin profile changes have been saved." });
    setIsEditing(false);
  };

  if (loading) return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!user) return <div className="text-center p-8">Please log in to view your profile.</div>;
  
  const getInitials = (name?: string | null) => {
    if (!name) return "A";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Admin Profile" description="View and manage your administrator profile.">
        <Button onClick={() => setIsEditing(!isEditing)} variant={isEditing ? "default" : "outline"}>
          <Edit3 className="mr-2 h-4 w-4" /> {isEditing ? "Cancel" : "Edit Profile"}
        </Button>
      </PageHeader>

      <Card className="shadow-lg">
        <CardHeader className="flex flex-col items-center text-center sm:flex-row sm:text-left">
          <Avatar className="h-24 w-24 mb-4 sm:mb-0 sm:mr-6 ring-2 ring-primary ring-offset-2">
            <AvatarImage src={user.photoURL || `https://placehold.co/100x100.png?text=${getInitials(profileData.displayName)}`} alt={profileData.displayName} data-ai-hint="admin user"/>
            <AvatarFallback>{getInitials(profileData.displayName)}</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle className="text-2xl font-headline">{profileData.displayName}</CardTitle>
            <CardDescription className="flex items-center mt-1">
              <Mail className="mr-2 h-4 w-4 text-muted-foreground" /> {profileData.email}
            </CardDescription>
            <CardDescription className="flex items-center mt-1">
              <ShieldCheck className="mr-2 h-4 w-4 text-primary" /> {profileData.role}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="mt-4">
          <div className="space-y-6">
            <div>
              <Label htmlFor="displayName">Full Name</Label>
              <Input id="displayName" name="displayName" value={profileData.displayName} onChange={handleInputChange} disabled={!isEditing} />
            </div>
            
            <div>
              <Label htmlFor="email" className="flex items-center"><Mail className="mr-2 h-4 w-4 text-muted-foreground" /> Email</Label>
              <Input id="email" type="email" value={profileData.email} disabled />
              <p className="text-xs text-muted-foreground mt-1">Email cannot be changed here.</p>
            </div>
            
            {isEditing && (
              <div className="flex justify-end">
                <Button onClick={handleSave} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Changes</Button>
              </div>
            )}
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
