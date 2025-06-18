import { Stethoscope } from 'lucide-react';
import Link from 'next/link';

interface AppLogoProps {
  className?: string;
  iconSize?: number;
  textSize?: string;
}

export function AppLogo({ className, iconSize = 28, textSize = "text-2xl" }: AppLogoProps) {
  return (
    <Link href="/" className={`flex items-center gap-2 text-primary hover:text-primary/90 transition-colors ${className}`}>
      <Stethoscope size={iconSize} className="text-accent" />
      <span className={`font-bold font-headline ${textSize}`}>TokenEase</span>
    </Link>
  );
}
