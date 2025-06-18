
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { AuthFormWrapper } from "@/components/auth/AuthFormWrapper";
import { useAuth } from "@/contexts/AuthContext";
import { Mail, Lock, ShieldCheck } from "lucide-react";

const adminLoginFormSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

type AdminLoginFormValues = z.infer<typeof adminLoginFormSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { signIn, signOut } = useAuth(); 
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AdminLoginFormValues>({
    resolver: zodResolver(adminLoginFormSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: AdminLoginFormValues) {
    setIsLoading(true);
    try {
      const { role } = await signIn(values.email, values.password);
      if (role === 'admin') {
        toast({
          title: "Admin Login Successful",
          description: "Welcome to the Admin Panel!",
        });
        router.push("/admin/dashboard");
      } else {
        await signOut(); // Sign out if login was successful but not for an admin role
        throw new Error("Access Denied. Not an admin account.");
      }
    } catch (error: any) {
       let errorMessage = "Invalid credentials or not an admin account.";
        if (error.code === 'auth/invalid-credential' || error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = "Invalid email or password.";
        } else if (error.message) {
            errorMessage = error.message;
        }
      toast({
        variant: "destructive",
        title: "Admin Login Failed",
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthFormWrapper
      title="Admin Panel Login"
      description="Access the TokenEase administration area."
    >
      <div className="flex justify-center mb-6">
        <ShieldCheck className="h-16 w-16 text-primary" />
      </div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Admin Email</FormLabel>
                 <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <FormControl>
                    <Input type="email" placeholder="admin@example.com" {...field} className="pl-10" suppressHydrationWarning={true}/>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <FormControl>
                    <Input type="password" placeholder="••••••••" {...field} className="pl-10" suppressHydrationWarning={true}/>
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading} suppressHydrationWarning={true}>
            {isLoading ? "Authenticating..." : "Login to Admin Panel"}
          </Button>
        </form>
      </Form>
    </AuthFormWrapper>
  );
}
