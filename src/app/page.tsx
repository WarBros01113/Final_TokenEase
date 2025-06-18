import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Stethoscope, Users, UserCog, LogIn } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { AppLogo } from "@/components/shared/AppLogo";

export default function HomePage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="py-4 px-6 md:px-10 border-b sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="container mx-auto flex justify-between items-center">
          <AppLogo />
          <nav className="space-x-4">
            <Button variant="ghost" asChild>
              <Link href="/login">Patient Login</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/login">Admin Login</Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-grow">
        <section className="py-16 md:py-24 bg-gradient-to-br from-primary/10 via-background to-background">
          <div className="container mx-auto text-center px-6">
            <Stethoscope className="mx-auto h-16 w-16 text-primary mb-6" strokeWidth={1.5} />
            <h1 className="text-4xl md:text-5xl font-bold mb-6 text-primary font-headline">
              Welcome to TokenEase
            </h1>
            <p className="text-lg md:text-xl text-foreground/80 mb-10 max-w-2xl mx-auto">
              Streamline your clinic experience with our smart appointment and token management system.
              Say goodbye to long waits and hello to efficient healthcare.
            </p>
            <div className="space-x-4">
              <Button size="lg" asChild className="bg-accent hover:bg-accent/90 text-accent-foreground">
                <Link href="/register">
                  <Users className="mr-2" /> Register as Patient
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/login">
                  <LogIn className="mr-2" /> Patient Login
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container mx-auto px-6">
            <h2 className="text-3xl font-bold text-center mb-12 text-primary font-headline">Key Features</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={<Stethoscope className="w-10 h-10 text-accent" />}
                title="Easy Appointments"
                description="Book appointments with your preferred doctor in just a few clicks. Check availability and select your time slot."
                imageSrc="https://placehold.co/600x400.png"
                dataAiHint="appointment booking"
              />
              <FeatureCard
                icon={<Users className="w-10 h-10 text-accent" />}
                title="Live Token Tracking"
                description="Monitor your token number and estimated wait time in real-time. Plan your visit accordingly."
                imageSrc="https://placehold.co/600x400.png"
                dataAiHint="queue management"
              />
              <FeatureCard
                icon={<UserCog className="w-10 h-10 text-accent" />}
                title="Doctor-Patient Chat"
                description="Communicate securely with your doctor for quick queries or follow-ups. Share files if needed."
                imageSrc="https://placehold.co/600x400.png"
                dataAiHint="online consultation"
              />
            </div>
          </div>
        </section>
      </main>

      <footer className="py-8 border-t bg-secondary/50">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} TokenEase. All rights reserved.</p>
          <p className="text-sm mt-1">Simplifying Healthcare, One Token at a Time.</p>
        </div>
      </footer>
    </div>
  );
}

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  imageSrc: string;
  dataAiHint: string;
}

function FeatureCard({ icon, title, description, imageSrc, dataAiHint }: FeatureCardProps) {
  return (
    <Card className="overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="items-center text-center">
        <div className="p-3 bg-accent/20 rounded-full mb-3">{icon}</div>
        <CardTitle className="text-primary font-headline">{title}</CardTitle>
      </CardHeader>
      <div className="relative h-48 w-full">
        <Image src={imageSrc} alt={title} layout="fill" objectFit="cover" data-ai-hint={dataAiHint} />
      </div>
      <CardContent className="pt-4 text-center">
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
}
