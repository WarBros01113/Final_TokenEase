"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { CheckCircle, CreditCard, Download, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";

interface BillItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Bill {
  id: string;
  appointmentId: string;
  date: string;
  doctorName: string;
  items: BillItem[];
  subtotal: number;
  tax: number;
  totalAmount: number;
  status: 'Pending' | 'Paid' | 'Failed';
}

const mockBills: Bill[] = [
  {
    id: "bill001",
    appointmentId: "appt1",
    date: "2024-08-20",
    doctorName: "Dr. Alice Smith",
    items: [
      { id: "item1", description: "Consultation Fee", quantity: 1, unitPrice: 150, total: 150 },
      { id: "item2", description: "ECG Test", quantity: 1, unitPrice: 75, total: 75 },
      { id: "item3", description: "Blood Test Panel", quantity: 1, unitPrice: 120, total: 120 },
    ],
    subtotal: 345,
    tax: 34.50, // 10% tax
    totalAmount: 379.50,
    status: 'Pending',
  },
  {
    id: "bill002",
    appointmentId: "appt3",
    date: "2024-07-15",
    doctorName: "Dr. Carol Williams",
    items: [
      { id: "item4", description: "Consultation Fee", quantity: 1, unitPrice: 120, total: 120 },
      { id: "item5", description: "Skin Biopsy", quantity: 1, unitPrice: 200, total: 200 },
    ],
    subtotal: 320,
    tax: 32,
    totalAmount: 352,
    status: 'Paid',
  }
];

// This is a simplified Razorpay mock. A real integration needs their SDK.
declare global {
  interface Window { Razorpay: any; }
}

export default function BillingPage() {
  const [bills, setBills] = useState<Bill[]>(mockBills);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const { toast } = useToast();

  const handlePayBill = async (bill: Bill) => {
    setSelectedBill(bill);
    setIsPaying(true);

    // Simulate creating an order with Razorpay
    // In a real app, this would be a server action call
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API delay
    const orderDetails = {
      amount: bill.totalAmount * 100, // Amount in paise
      currency: "INR",
      receipt: bill.id,
    };

    // Load Razorpay SDK if not already loaded
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => {
      const options = {
        key: "YOUR_RAZORPAY_KEY_ID", // Replace with your actual key_id
        amount: orderDetails.amount,
        currency: orderDetails.currency,
        name: "TokenEase Clinic",
        description: `Payment for Bill #${bill.id}`,
        image: "https://placehold.co/100x100.png?text=TE", // Your logo
        order_id: `mock_order_${Date.now()}`, // This would come from your server in a real app
        handler: function (response: any) {
          // alert(response.razorpay_payment_id);
          // alert(response.razorpay_order_id);
          // alert(response.razorpay_signature);
          // This function is called when payment is successful
          // Update payment status in Firestore here (via Server Action)
          toast({
            title: "Payment Successful!",
            description: `Payment ID: ${response.razorpay_payment_id}`,
            action: <CheckCircle className="text-green-500" />
          });
          setBills(prevBills => prevBills.map(b => b.id === bill.id ? {...b, status: 'Paid'} : b));
          setIsPaying(false);
          setSelectedBill(null);
        },
        prefill: {
          name: "Test User", // Prefill user details
          email: "test.user@example.com",
          contact: "9999999999",
        },
        notes: {
          address: "TokenEase Clinic Corporate Office",
        },
        theme: {
          color: "#7EC4CF", // Your primary color
        },
        modal: {
            ondismiss: function(){
                // This function is called when the modal is closed by the user
                toast({
                    variant: "default",
                    title: "Payment Cancelled",
                    description: "Payment process was cancelled.",
                });
                setIsPaying(false);
                setSelectedBill(null);
            }
        }
      };
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', function (response: any){
        // alert(response.error.code);
        // alert(response.error.description);
        // alert(response.error.source);
        // alert(response.error.step);
        // alert(response.error.reason);
        // alert(response.error.metadata.order_id);
        // alert(response.error.metadata.payment_id);
        toast({
            variant: "destructive",
            title: "Payment Failed",
            description: response.error.description || "An error occurred during payment.",
        });
        setBills(prevBills => prevBills.map(b => b.id === bill.id ? {...b, status: 'Failed'} : b));
        setIsPaying(false);
        setSelectedBill(null);
      });
      rzp1.open();
    };
    script.onerror = () => {
      toast({ variant: "destructive", title: "Error", description: "Could not load payment gateway." });
      setIsPaying(false);
      setSelectedBill(null);
    };
    document.body.appendChild(script);
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Payments" description="View your bills and make payments." />

      {bills.length === 0 && (
        <Card className="text-center py-12">
            <CardContent>
                <CreditCard className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Bills Found</h3>
                <p className="text-muted-foreground">You currently have no outstanding or past bills.</p>
            </CardContent>
        </Card>
      )}

      {bills.map((bill) => (
        <Card key={bill.id} className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
              <div>
                <CardTitle>Bill #{bill.id}</CardTitle>
                <CardDescription>
                  For appointment with {bill.doctorName} on {new Date(bill.date).toLocaleDateString()}
                </CardDescription>
              </div>
              <span className={`mt-2 sm:mt-0 px-3 py-1 text-sm font-semibold rounded-full
                ${bill.status === 'Paid' ? 'bg-green-100 text-green-700' : 
                  bill.status === 'Pending' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'}`}>
                Status: {bill.status}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bill.items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">Subtotal</TableCell>
                  <TableCell className="text-right">${bill.subtotal.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">Tax (10%)</TableCell>
                  <TableCell className="text-right">${bill.tax.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="text-lg font-bold">
                  <TableCell colSpan={3} className="text-right text-primary">Total Amount</TableCell>
                  <TableCell className="text-right text-primary">${bill.totalAmount.toFixed(2)}</TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline">
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            {bill.status === 'Pending' && (
              <Button 
                onClick={() => handlePayBill(bill)} 
                disabled={isPaying && selectedBill?.id === bill.id}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isPaying && selectedBill?.id === bill.id ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CreditCard className="mr-2 h-4 w-4" />
                )}
                Pay Now
              </Button>
            )}
             {bill.status === 'Paid' && (
              <Button variant="ghost" disabled className="text-green-600">
                <CheckCircle className="mr-2 h-4 w-4" /> Paid
              </Button>
            )}
          </CardFooter>
        </Card>
      ))}
       <Card className="mt-8 bg-secondary/30">
        <CardHeader>
            <CardTitle>Payment Information</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col md:flex-row items-center gap-4">
            <Image src="https://placehold.co/150x80.png?text=Razorpay" alt="Razorpay Secure Payments" width={150} height={80} data-ai-hint="payment gateway logo" />
            <div>
                <p className="text-muted-foreground">
                    All payments are processed securely through Razorpay. We support various payment methods including credit/debit cards, UPI, net banking, and wallets. 
                    Your financial information is encrypted and protected.
                </p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
