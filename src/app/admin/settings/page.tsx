"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck, Palette, Lock, Bell, SettingsIcon,SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AdminSettingsPage() {
  const { toast } = useToast();

  const [generalSettings, setGeneralSettings] = useState({
    clinicName: "TokenEase Central Clinic",
    clinicAddress: "123 Main St, HealthCity, HC 54321",
    defaultAppointmentDuration: 30, // in minutes
    maxPatientsPerSlot: 15,
  });
  
  const [notificationSettings, setNotificationSettings] = useState({
    adminEmailForAlerts: "admin_alerts@tokenease.com",
    sendPatientReminders: true,
  });

  const [securitySettings, setSecuritySettings] = useState({
    adminTwoFactorAuth: true,
    sessionTimeoutMinutes: 60,
  });

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setGeneralSettings(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) : value }));
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement | HTMLButtonElement> , key?: keyof typeof notificationSettings) => {
     if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox' && key) {
        setNotificationSettings(prev => ({ ...prev, [key]: e.target.checked }));
    } else if (e.target instanceof HTMLInputElement && key) {
         setNotificationSettings(prev => ({ ...prev, [key]: e.target.value }));
    }
  };
  
  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement | HTMLButtonElement>, key?: keyof typeof securitySettings) => {
    if (e.target instanceof HTMLInputElement && e.target.type === 'checkbox' && key) {
        setSecuritySettings(prev => ({ ...prev, [key]: e.target.checked }));
    } else if (e.target instanceof HTMLInputElement && key) {
         setSecuritySettings(prev => ({ ...prev, [key]: e.target.value }));
    }
  };

  const handleSaveSettings = (section: string) => {
    // In a real app, save settings to Firestore or a config file
    toast({ title: `${section} Settings Saved`, description: `Your changes to ${section.toLowerCase()} settings have been applied.`});
  };

  return (
    <div className="space-y-6">
      <PageHeader title="System Settings" description="Configure overall clinic and application settings." />

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><SettingsIcon className="mr-2 h-5 w-5 text-primary" /> General Clinic Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="clinicName">Clinic Name</Label>
            <Input id="clinicName" name="clinicName" value={generalSettings.clinicName} onChange={handleGeneralChange} />
          </div>
          <div>
            <Label htmlFor="clinicAddress">Clinic Address</Label>
            <Input id="clinicAddress" name="clinicAddress" value={generalSettings.clinicAddress} onChange={handleGeneralChange} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="defaultAppointmentDuration">Default Appointment Duration (minutes)</Label>
                <Input id="defaultAppointmentDuration" name="defaultAppointmentDuration" type="number" value={generalSettings.defaultAppointmentDuration} onChange={handleGeneralChange} />
            </div>
            <div>
                <Label htmlFor="maxPatientsPerSlot">System-Wide Max Patients Per Slot</Label>
                <Input id="maxPatientsPerSlot" name="maxPatientsPerSlot" type="number" value={generalSettings.maxPatientsPerSlot} onChange={handleGeneralChange} disabled />
                <p className="text-xs text-muted-foreground mt-1">This is a system cap (15). Individual slot capacities can be lower.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => handleSaveSettings("General")} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save General Settings</Button>
          </div>
        </CardContent>
      </Card>
      
      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><Bell className="mr-2 h-5 w-5 text-primary" /> Notification Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            <div>
                <Label htmlFor="adminEmailForAlerts">Admin Email for Critical Alerts</Label>
                <Input id="adminEmailForAlerts" name="adminEmailForAlerts" type="email" value={notificationSettings.adminEmailForAlerts} onChange={(e) => handleNotificationChange(e, "adminEmailForAlerts")} />
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                <Label htmlFor="sendPatientReminders" className="flex-grow">Send Appointment Reminders to Patients</Label>
                <Switch
                id="sendPatientReminders"
                checked={notificationSettings.sendPatientReminders}
                onCheckedChange={(checked) => handleNotificationChange({ target: { type: 'checkbox', checked } } as any, "sendPatientReminders")}
                />
            </div>
            <div className="flex justify-end">
                 <Button onClick={() => handleSaveSettings("Notification")} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Notification Settings</Button>
            </div>
        </CardContent>
      </Card>

      <Card className="shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary" /> Security Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
            <Label htmlFor="adminTwoFactorAuth" className="flex-grow">Enable Two-Factor Authentication for Admins</Label>
            <Switch
              id="adminTwoFactorAuth"
              checked={securitySettings.adminTwoFactorAuth}
              onCheckedChange={(checked) => handleSecurityChange({ target: { type: 'checkbox', checked } } as any, "adminTwoFactorAuth")}
            />
          </div>
          <div>
            <Label htmlFor="sessionTimeoutMinutes">Admin Session Timeout (minutes)</Label>
            <Input id="sessionTimeoutMinutes" name="sessionTimeoutMinutes" type="number" value={securitySettings.sessionTimeoutMinutes} onChange={(e) => handleSecurityChange(e, "sessionTimeoutMinutes")} />
          </div>
           <div className="flex justify-end">
                 <Button onClick={() => handleSaveSettings("Security")} className="bg-accent hover:bg-accent/90 text-accent-foreground">Save Security Settings</Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
