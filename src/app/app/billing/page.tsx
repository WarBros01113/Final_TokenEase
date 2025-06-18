
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Info } from "lucide-react";

export default function BillingFeatureRemovedPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="This feature is currently not available." />
      <Card className="shadow-lg">
        <CardContent className="pt-6 text-center">
          <Info className="mx-auto h-12 w-12 text-primary mb-4" />
          <p className="text-lg text-muted-foreground">
            The billing section has been removed.
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            If you have any questions regarding past bills, please contact support.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
