
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter as ShadTableFooter } from "@/components/ui/table"; // Renamed TableFooter import
import { CheckCircle, CreditCard, Download, Loader2 as LoaderIcon } from "lucide-react"; // Renamed Loader2
import { useState, useEffect, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import { useAuth } from "@/contexts/AuthContext";
import { db, collection, getDocs, doc, updateDoc, query as firestoreQuery, where, orderBy, Timestamp } from "@/lib/firebase";

interface BillItem {
  id: string; // usually corresponds to a testId or serviceId
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Bill {
  id: string; // Firestore document ID
  appointmentId: string;
  date: string; // ISO Date string (YYYY-MM-DD)
  doctorName: string;
  items: BillItem[];
  subtotal: number;
  tax: number; // Store as number
  totalAmount: number; // Store as number
  status: 'Pending' | 'Paid' | 'Failed';
  patientId: string;
  createdAt?: Timestamp; // Firestore timestamp
  orderId?: string; // Razorpay order ID if payment initiated
  paymentId?: string; // Razorpay payment ID on success
}

declare global {
  interface Window { Razorpay: any; }
}

export default function BillingPage() {
  const { user, loading: authLoading } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [isPaying, setIsPaying] = useState(false);
  const [isLoadingBills, setIsLoadingBills] = useState(true);
  const { toast } = useToast();

  const fetchBills = useCallback(async (patientId: string) => {
    setIsLoadingBills(true);
    try {
      const billsRef = collection(db, "bills");
      const q = firestoreQuery(billsRef, where("patientId", "==", patientId), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const fetchedBills: Bill[] = [];
      snapshot.forEach(doc => {
        const data = doc.data();
        fetchedBills.push({
          id: doc.id,
          ...data,
          date: data.date instanceof Timestamp ? data.date.toDate().toISOString().split('T')[0] : data.date,
        } as Bill);
      });
      setBills(fetchedBills);
    } catch (error) {
      console.error("Error fetching bills:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load your bills." });
    } finally {
      setIsLoadingBills(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchBills(user.uid);
    } else if (!authLoading && !user) {
        setIsLoadingBills(false); // Not logged in, no bills to load
    }
  }, [user, authLoading, fetchBills]);

  const handlePayBill = async (bill: Bill) => {
    if (!user) {
        toast({variant: "destructive", title: "Authentication Error", description: "Please log in to proceed with payment."});
        return;
    }
    setSelectedBill(bill);
    setIsPaying(true);

    // TODO: In a real app, this order creation would be a server action call to a Firebase Function
    // This function would securely interact with Razorpay SDK to create an order and return order_id
    // For now, simulating client-side, which is NOT secure for production key management.
    // Ensure `process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID` is set in your .env.local
    const razorpayKeyId = process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID;
    if (!razorpayKeyId) {
        toast({variant: "destructive", title: "Configuration Error", description: "Razorpay Key ID is not configured."});
        setIsPaying(false);
        return;
    }

    // Simulate creating an order and getting an order_id (mocked for now)
    const mockOrderId = `order_${Date.now()}_${bill.id.substring(0,5)}`; 
    await updateDoc(doc(db, "bills", bill.id), { orderId: mockOrderId, status: 'Pending' }); // Update bill with orderId

    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => {
      const options = {
        key: razorpayKeyId,
        amount: bill.totalAmount * 100, // Amount in paise
        currency: "INR",
        name: "TokenEase Clinic",
        description: `Payment for Bill #${bill.id}`,
        image: "https://placehold.co/100x100.png?text=TE", 
        order_id: mockOrderId, 
        handler: async function (response: any) {
          try {
            await updateDoc(doc(db, "bills", bill.id), {
              status: 'Paid',
              paymentId: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id, // Store Razorpay's order_id as well
              razorpay_signature: response.razorpay_signature,
            });
            toast({
              title: "Payment Successful!",
              description: `Payment ID: ${response.razorpay_payment_id}`,
              action: <CheckCircle className="text-green-500" />
            });
            fetchBills(user.uid); // Refresh bills
          } catch (dbError) {
             console.error("Error updating bill status:", dbError);
             toast({variant: "destructive", title: "DB Update Error", description: "Payment was successful but failed to update status."});
          } finally {
            setIsPaying(false);
            setSelectedBill(null);
          }
        },
        prefill: {
          name: user.displayName || user.fullName || "Patient",
          email: user.email,
          contact: user.phoneNumber || "",
        },
        notes: {
          bill_id: bill.id,
          patient_uid: user.uid,
        },
        theme: {
          color: "#7EC4CF", 
        },
        modal: {
            ondismiss: function(){
                toast({ title: "Payment Cancelled", description: "Payment process was cancelled by user."});
                setIsPaying(false);
                setSelectedBill(null);
                // Optionally update bill status to 'Failed' or 'Cancelled' if order was created
                // updateDoc(doc(db, "bills", bill.id), { status: 'Failed' });
            }
        }
      };
      const rzp1 = new window.Razorpay(options);
      rzp1.on('payment.failed', async function (response: any){
        try {
            await updateDoc(doc(db, "bills", bill.id), { status: 'Failed', paymentError: response.error });
             toast({
                variant: "destructive",
                title: "Payment Failed",
                description: response.error.description || "An error occurred during payment.",
            });
            fetchBills(user.uid);
        } catch(dbError) {
            console.error("Error updating bill status on failure:", dbError);
        } finally {
            setIsPaying(false);
            setSelectedBill(null);
        }
      });
      rzp1.open();
    };
    script.onerror = () => {
      toast({ variant: "destructive", title: "Error", description: "Could not load payment gateway." });
      setIsPaying(false);
      setSelectedBill(null);
    };
    document.body.appendChild(script);
    // Cleanup script tag on component unmount or if error
    return () => { document.body.removeChild(script); };
  };

  if (authLoading) {
     return <div className="flex items-center justify-center h-full"><LoaderIcon className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading...</p></div>;
  }
  if (!user && !authLoading) {
    return <div className="text-center p-8">Please log in to view your bills.</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Billing & Payments" description="View your bills and make payments." />

      {isLoadingBills && (
         <Card className="text-center py-12">
            <CardContent>
                <LoaderIcon className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading your bills...</p>
            </CardContent>
        </Card>
      )}

      {!isLoadingBills && bills.length === 0 && (
        <Card className="text-center py-12">
            <CardContent>
                <CreditCard className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
                <h3 className="text-xl font-semibold mb-2">No Bills Found</h3>
                <p className="text-muted-foreground">You currently have no outstanding or past bills.</p>
            </CardContent>
        </Card>
      )}

      {!isLoadingBills && bills.map((bill) => (
        <Card key={bill.id} className="shadow-lg">
          <CardHeader>
            <div className="flex flex-col sm:flex-row justify-between sm:items-center">
              <div>
                <CardTitle>Bill #{bill.id.substring(0,8)}...</CardTitle>
                <CardDescription>
                  For appointment with {bill.doctorName} on {new Date(bill.date).toLocaleDateString()}
                </CardDescription>
              </div>
              <span className={`mt-2 sm:mt-0 px-3 py-1 text-sm font-semibold rounded-full capitalize
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
                {bill.items.map((item, index) => ( // Added index for key
                  <TableRow key={`${bill.id}-item-${index}`}>
                    <TableCell>{item.description}</TableCell>
                    <TableCell className="text-right">{item.quantity}</TableCell>
                    <TableCell className="text-right">${item.unitPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${item.total.toFixed(2)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
              <ShadTableFooter>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">Subtotal</TableCell>
                  <TableCell className="text-right">${bill.subtotal.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell colSpan={3} className="text-right font-semibold">Tax ({(bill.tax/bill.subtotal*100).toFixed(0) || 10}%)</TableCell>
                  <TableCell className="text-right">${bill.tax.toFixed(2)}</TableCell>
                </TableRow>
                <TableRow className="text-lg font-bold">
                  <TableCell colSpan={3} className="text-right text-primary">Total Amount</TableCell>
                  <TableCell className="text-right text-primary">${bill.totalAmount.toFixed(2)}</TableCell>
                </TableRow>
              </ShadTableFooter>
            </Table>
          </CardContent>
          <CardFooter className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => toast({title: "Coming Soon", description:"PDF download will be available shortly."})}>
              <Download className="mr-2 h-4 w-4" /> Download PDF
            </Button>
            {bill.status === 'Pending' && (
              <Button 
                onClick={() => handlePayBill(bill)} 
                disabled={isPaying && selectedBill?.id === bill.id}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {isPaying && selectedBill?.id === bill.id ? (
                  <LoaderIcon className="mr-2 h-4 w-4 animate-spin" />
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
                <p className="text-xs text-muted-foreground mt-1">Note: Ensure your Razorpay Key ID is correctly set up in the environment variables for payments to function.</p>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}
