
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, ShieldCheck, Lock, Loader2 } from "lucide-react"; // Removed Palette
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
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
import { useAuth } from "@/contexts/AuthContext";
import { db, doc, getDoc, updateDoc } from "@/lib/firebase";

interface UserSettings {
    emailNotifications: boolean;
    smsNotifications: boolean;
    twoFactorAuth: boolean; // Note: actual 2FA implementation is complex
}

const USER_SETTINGS_DOC_ID_PREFIX = "userPrefs_";

export default function PatientSettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [settings, setSettings] = useState<UserSettings>({
    emailNotifications: true,
    smsNotifications: false,
    twoFactorAuth: false,
  });

  const getSettingsDocId = useCallback(() => {
    if (!user) return null;
    return `${USER_SETTINGS_DOC_ID_PREFIX}${user.uid}`;
  }, [user]);

  const fetchUserSettings = useCallback(async () => {
    const settingsDocId = getSettingsDocId();
    if (!settingsDocId) {
        setIsLoading(false);
        return;
    }
    setIsLoading(true);
    try {
        const settingsDocRef = doc(db, "userSettings", settingsDocId);
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            setSettings(docSnap.data() as UserSettings);
        } else {
            // Use default settings if none exist, potentially save them on first change
            console.log("No user settings found, using defaults.");
        }
    } catch (error) {
        console.error("Error fetching user settings:", error);
        toast({variant: "destructive", title: "Load Error", description: "Could not load your settings."});
    } finally {
        setIsLoading(false);
    }
  }, [toast, getSettingsDocId]);

  useEffect(() => {
    if (user && !authLoading) {
        fetchUserSettings();
    } else if (!authLoading && !user) {
        setIsLoading(false); // Not logged in
    }
  }, [user, authLoading, fetchUserSettings]);


  const handleSettingChange = async (key: keyof UserSettings, value: boolean) => {
    const settingsDocId = getSettingsDocId();
    if (!settingsDocId) {
        toast({variant: "destructive", title: "Error", description: "User not identified."});
        return;
    }
    
    setIsSaving(true);
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings); // Optimistic update

    try {
        const settingsDocRef = doc(db, "userSettings", settingsDocId);
        await updateDoc(settingsDocRef, { [key]: value });
        toast({ title: "Settings Updated", description: `${key.replace(/([A-Z])/g, ' $1').trim()} preference saved.`});
    } catch (error: any) {
        console.error("Error saving setting:", error);
        toast({variant: "destructive", title: "Save Error", description: "Could not save setting."});
        setSettings(prev => ({...prev, [key]: !value})); // Revert optimistic update
    } finally {
        setIsSaving(false);
    }
  };
  
  const handlePasswordChange = () => {
    toast({ title: "Password Change", description: "Password change functionality is not fully implemented. Please contact support if needed." });
  };
  
  const handleDeleteAccount = () => {
    toast({ title: "Account Deletion", description: "Account deletion is a critical action. Please contact support to proceed." });
  };

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading settings...</p>
      </div>
    );
  }
  if (!user && !authLoading) {
    return <div className="text-center p-8">Please log in to manage your settings.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" description="Manage your account preferences and security." />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" /> Notifications</CardTitle>
          <CardDescription>Control how you receive updates and reminders.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
            <Label htmlFor="emailNotifications" className="flex-grow">Email Notifications</Label>
            <Switch
              id="emailNotifications"
              checked={settings.emailNotifications}
              onCheckedChange={(value) => handleSettingChange("emailNotifications", value)}
              disabled={isSaving}
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
            <Label htmlFor="smsNotifications" className="flex-grow">SMS Notifications</Label>
            <Switch
              id="smsNotifications"
              checked={settings.smsNotifications}
              onCheckedChange={(value) => handleSettingChange("smsNotifications", value)}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>
      
      {/* Removed Appearance Card for Dark Mode */}

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary" /> Security</CardTitle>
          <CardDescription>Manage your account security settings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
            <div className="flex-grow">
                <Label htmlFor="changePassword">Change Password</Label>
                <p className="text-xs text-muted-foreground">Update your account password regularly for better security.</p>
            </div>
            <Button variant="outline" onClick={handlePasswordChange} disabled={isSaving}>
                <Lock className="mr-2 h-4 w-4"/> Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
            <Label htmlFor="twoFactorAuth" className="flex-grow">Two-Factor Authentication (2FA)</Label>
            <Switch
              id="twoFactorAuth"
              checked={settings.twoFactorAuth}
              onCheckedChange={(value) => {
                handleSettingChange("twoFactorAuth", value);
                if (value) toast({title: "2FA", description: "2FA setup would proceed here (not implemented)."});
              }}
              disabled={isSaving}
            />
          </div>
        </CardContent>
      </Card>
      
      <Separator />
      
      <Card className="border-destructive shadow-lg">
        <CardHeader>
            <CardTitle className="text-destructive">Danger Zone</CardTitle>
            <CardDescription>Irreversible actions related to your account.</CardDescription>
        </CardHeader>
        <CardContent>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" disabled={isSaving}>Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers. This feature is currently disabled for safety. Please contact support.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90" disabled> 
                    Yes, delete account (Disabled)
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">Account deletion requires contacting support.</p>
        </CardContent>
      </Card>
    </div>
  );
}
