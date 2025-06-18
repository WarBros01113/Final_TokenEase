"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Bell, ShieldCheck, Palette, Lock } from "lucide-react";
import { useState } from "react";
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
} from "@/components/ui/alert-dialog"


export default function PatientSettingsPage() {
  const { toast } = useToast();

  // Mock settings state
  const [settings, setSettings] = useState({
    emailNotifications: true,
    smsNotifications: false,
    darkMode: false, // Assuming a theme toggle might exist
    twoFactorAuth: false,
  });

  const handleSettingChange = (key: keyof typeof settings, value: boolean) => {
    setSettings(prev => ({ ...prev, [key]: value }));
    // In a real app, save this to user preferences in Firestore
    toast({ title: "Settings Updated", description: `${key.replace(/([A-Z])/g, ' $1').trim()} preference saved.`});
  };
  
  const handlePasswordChange = () => {
    // Placeholder for password change flow
    toast({ title: "Password Change", description: "Password change functionality not implemented in this demo." });
  };
  
  const handleDeleteAccount = () => {
    // Placeholder for account deletion flow
    toast({ title: "Account Deletion", description: "Account deletion functionality not implemented in this demo." });
  };


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
            />
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
            <Label htmlFor="smsNotifications" className="flex-grow">SMS Notifications</Label>
            <Switch
              id="smsNotifications"
              checked={settings.smsNotifications}
              onCheckedChange={(value) => handleSettingChange("smsNotifications", value)}
            />
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Palette className="mr-2 h-5 w-5 text-primary" /> Appearance</CardTitle>
          <CardDescription>Customize the look and feel of the app.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
           <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
            <Label htmlFor="darkMode" className="flex-grow">Dark Mode</Label>
            <Switch
              id="darkMode"
              checked={settings.darkMode}
              onCheckedChange={(value) => {
                handleSettingChange("darkMode", value);
                // Basic theme toggle - a real app would use context or CSS variables
                if (value) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              }}
            />
          </div>
        </CardContent>
      </Card>

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
            <Button variant="outline" onClick={handlePasswordChange}>
                <Lock className="mr-2 h-4 w-4"/> Change Password
            </Button>
          </div>
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
            <Label htmlFor="twoFactorAuth" className="flex-grow">Two-Factor Authentication (2FA)</Label>
            <Switch
              id="twoFactorAuth"
              checked={settings.twoFactorAuth}
              onCheckedChange={(value) => handleSettingChange("twoFactorAuth", value)}
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
                <Button variant="destructive">Delete Account</Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete your
                    account and remove your data from our servers.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive hover:bg-destructive/90">
                    Yes, delete account
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
            <p className="text-xs text-muted-foreground mt-2">Once you delete your account, there is no going back. Please be certain.</p>
        </CardContent>
      </Card>

    </div>
  );
}
