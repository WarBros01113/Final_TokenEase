
"use client";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ShieldCheck, Bell, SettingsIcon, Loader2 } from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { db, doc, getDoc, setDoc, serverTimestamp } from "@/lib/firebase";

interface GeneralSettings {
    clinicName: string;
    clinicAddress: string;
    defaultAppointmentDuration: number; 
    maxPatientsPerSlot: number; // This is a system cap, not per individual slot config
}
interface NotificationSettings {
    adminEmailForAlerts: string;
    sendPatientReminders: boolean;
}
interface SecuritySettings {
    adminTwoFactorAuth: boolean; // This would require more complex implementation
    sessionTimeoutMinutes: number;
}

const SETTINGS_DOC_ID = "globalClinicSettings"; // Fixed ID for the settings document

export default function AdminSettingsPage() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [generalSettings, setGeneralSettings] = useState<GeneralSettings>({
    clinicName: "TokenEase Clinic", // Default fallback
    clinicAddress: "",
    defaultAppointmentDuration: 30,
    maxPatientsPerSlot: 15, // As per PRD
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    adminEmailForAlerts: "",
    sendPatientReminders: true,
  });

  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    adminTwoFactorAuth: false,
    sessionTimeoutMinutes: 60,
  });

  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
        const settingsDocRef = doc(db, "clinicConfiguration", SETTINGS_DOC_ID);
        const docSnap = await getDoc(settingsDocRef);
        if (docSnap.exists()) {
            const data = docSnap.data();
            setGeneralSettings(data.general || generalSettings);
            setNotificationSettings(data.notifications || notificationSettings);
            setSecuritySettings(data.security || securitySettings);
        } else {
            // No settings document exists, use defaults (already set in state)
            // Optionally, create it with defaults here if desired on first load
            console.log("No global settings found, using defaults. Consider saving initial settings.");
        }
    } catch (error) {
        console.error("Error fetching settings:", error);
        toast({variant: "destructive", title: "Load Error", description: "Could not load clinic settings."});
    } finally {
        setIsLoading(false);
    }
  }, [toast]); // Dependencies on default states are fine here

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);


  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setGeneralSettings(prev => ({ ...prev, [name]: type === 'number' ? parseInt(value, 10) || 0 : value }));
  };

  const handleNotificationChange = (e: React.ChangeEvent<HTMLInputElement> , key: keyof NotificationSettings) => {
     setNotificationSettings(prev => ({ ...prev, [key]: e.target.value }));
  };
  const handleNotificationSwitchChange = (key: keyof NotificationSettings, checked: boolean) => {
    setNotificationSettings(prev => ({ ...prev, [key]: checked }));
  };
  
  const handleSecurityChange = (e: React.ChangeEvent<HTMLInputElement>, key: keyof SecuritySettings) => {
    const {name, value, type} = e.target;
    setSecuritySettings(prev => ({ ...prev, [key]: type === 'number' ? parseInt(value,10) || 0 : value }));
  };
  const handleSecuritySwitchChange = (key: keyof SecuritySettings, checked: boolean) => {
    setSecuritySettings(prev => ({ ...prev, [key]: checked }));
  };


  const handleSaveSettings = async (section: string) => {
    setIsSaving(true);
    try {
        const settingsDocRef = doc(db, "clinicConfiguration", SETTINGS_DOC_ID);
        // Prepare data to save. Only update the relevant section.
        let dataToSave = {};
        if (section === "General") dataToSave = { general: generalSettings };
        else if (section === "Notification") dataToSave = { notifications: notificationSettings };
        else if (section === "Security") dataToSave = { security: securitySettings };
        
        await setDoc(settingsDocRef, { 
            ...dataToSave, // Spread the section being saved
            lastUpdated: serverTimestamp() 
        }, { merge: true }); // Merge true ensures other sections are not overwritten

        toast({ title: `${section} Settings Saved`, description: `Your changes to ${section.toLowerCase()} settings have been applied.`});
    } catch (error: any) {
        console.error(`Error saving ${section} settings:`, error);
        toast({variant: "destructive", title: "Save Error", description: error.message || `Could not save ${section} settings.`})
    } finally {
        setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="ml-2">Loading settings...</p>
      </div>
    );
  }

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
            <Input id="clinicName" name="clinicName" value={generalSettings.clinicName} onChange={handleGeneralChange} disabled={isSaving}/>
          </div>
          <div>
            <Label htmlFor="clinicAddress">Clinic Address</Label>
            <Input id="clinicAddress" name="clinicAddress" value={generalSettings.clinicAddress} onChange={handleGeneralChange} disabled={isSaving}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <Label htmlFor="defaultAppointmentDuration">Default Appointment Duration (minutes)</Label>
                <Input id="defaultAppointmentDuration" name="defaultAppointmentDuration" type="number" value={generalSettings.defaultAppointmentDuration} onChange={handleGeneralChange} disabled={isSaving}/>
            </div>
            <div>
                <Label htmlFor="maxPatientsPerSlot">System-Wide Max Patients Per Slot</Label>
                <Input id="maxPatientsPerSlot" name="maxPatientsPerSlot" type="number" value={generalSettings.maxPatientsPerSlot} disabled />
                <p className="text-xs text-muted-foreground mt-1">This is a system cap ({generalSettings.maxPatientsPerSlot}). Individual slot capacities can be lower but not higher.</p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => handleSaveSettings("General")} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save General Settings
            </Button>
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
                <Input id="adminEmailForAlerts" name="adminEmailForAlerts" type="email" value={notificationSettings.adminEmailForAlerts} onChange={(e) => handleNotificationChange(e, "adminEmailForAlerts")} disabled={isSaving}/>
            </div>
            <div className="flex items-center justify-between p-3 bg-secondary/30 rounded-md">
                <Label htmlFor="sendPatientReminders" className="flex-grow">Send Appointment Reminders to Patients</Label>
                <Switch
                id="sendPatientReminders"
                checked={notificationSettings.sendPatientReminders}
                onCheckedChange={(checked) => handleNotificationSwitchChange("sendPatientReminders", checked)}
                disabled={isSaving}
                />
            </div>
            <div className="flex justify-end">
                 <Button onClick={() => handleSaveSettings("Notification")} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Notification Settings
                 </Button>
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
              onCheckedChange={(checked) => handleSecuritySwitchChange("adminTwoFactorAuth", checked)}
              disabled={isSaving}
            />
          </div>
          <div>
            <Label htmlFor="sessionTimeoutMinutes">Admin Session Timeout (minutes)</Label>
            <Input id="sessionTimeoutMinutes" name="sessionTimeoutMinutes" type="number" value={securitySettings.sessionTimeoutMinutes} onChange={(e) => handleSecurityChange(e, "sessionTimeoutMinutes")} disabled={isSaving}/>
          </div>
           <div className="flex justify-end">
                 <Button onClick={() => handleSaveSettings("Security")} className="bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Save Security Settings
                 </Button>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
