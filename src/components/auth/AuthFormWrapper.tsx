import type React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AppLogo } from '@/components/shared/AppLogo';

interface AuthFormWrapperProps {
  title: string;
  description: string;
  children: React.ReactNode;
  footerContent?: React.ReactNode;
}

export function AuthFormWrapper({ title, description, children, footerContent }: AuthFormWrapperProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary/10 via-background to-background p-4">
      <div className="mb-8">
        <AppLogo iconSize={40} textSize="text-3xl" />
      </div>
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-headline">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          {children}
        </CardContent>
        {footerContent && (
          <div className="p-6 pt-0 text-center text-sm text-muted-foreground">
            {footerContent}
          </div>
        )}
      </Card>
      <p className="mt-8 text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} TokenEase. All rights reserved.
      </p>
    </div>
  );
}
