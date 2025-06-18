
"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, User, MessageSquare as MessageSquareIcon, Loader2 } from "lucide-react"; // Renamed MessageSquare
import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { db, collection, addDoc, serverTimestamp, query, where, orderBy, onSnapshot, doc, getDoc, getDocs, Timestamp, limit } from "@/lib/firebase";
import type { Unsubscribe } from "firebase/firestore";

interface Message {
  id: string; // Firestore document ID
  chatRoomId: string;
  senderId: string; // UID of sender (patient or doctor)
  senderName: string; // Display name of sender
  receiverId: string; // UID of receiver
  text: string;
  timestamp: Timestamp;
  fileUrl?: string;
  fileName?: string;
}

interface ChatContact {
  id: string; // Doctor's UID
  name: string; // Doctor's name
  avatarUrl?: string;
  lastMessage?: string;
  lastMessageTimestamp?: Timestamp;
  unreadCount?: number; // This would require more complex logic to track read receipts
}

export default function ChatPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [contacts, setContacts] = useState<ChatContact[]>([]);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isLoadingContacts, setIsLoadingContacts] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Fetch doctors the patient has had appointments with as contacts
  const fetchContacts = useCallback(async (patientId: string) => {
    setIsLoadingContacts(true);
    try {
      const appointmentsRef = collection(db, "appointments");
      const q = query(appointmentsRef, where("patientId", "==", patientId), orderBy("date", "desc"));
      const appointmentSnap = await getDocs(q);
      
      const doctorIds = new Set<string>();
      appointmentSnap.forEach(apptDoc => doctorIds.add(apptDoc.data().doctorId));

      if (doctorIds.size === 0) {
        setContacts([]);
        setIsLoadingContacts(false);
        return;
      }

      const fetchedContacts: ChatContact[] = [];
      for (const doctorId of Array.from(doctorIds)) {
        const doctorDocRef = doc(db, "doctors", doctorId); // Assuming doctors are in 'doctors' collection
        const doctorSnap = await getDoc(doctorDocRef);
        if (doctorSnap.exists()) {
          const doctorData = doctorSnap.data();
          // Fetch last message for this contact (simplified)
          // A proper solution would be a 'chatRooms' collection with lastMessage metadata
          const chatRoomId = getChatRoomId(patientId, doctorId);
          const messagesRef = collection(db, "messages", chatRoomId, "chatMessages");
          const lastMsgQuery = query(messagesRef, orderBy("timestamp", "desc"), limit(1));
          const lastMsgSnap = await getDocs(lastMsgQuery);
          let lastMessageText = "No messages yet.";
          let lastMessageTs = undefined;
          if (!lastMsgSnap.empty) {
            const lastMsgData = lastMsgSnap.docs[0].data();
            lastMessageText = lastMsgData.text || (lastMsgData.fileName ? `File: ${lastMsgData.fileName}` : "Attachment");
            lastMessageTs = lastMsgData.timestamp;
          }

          fetchedContacts.push({
            id: doctorId,
            name: doctorData.name || `Doctor ${doctorId.substring(0,5)}`,
            avatarUrl: doctorData.avatarUrl, // Assuming doctors collection has avatarUrl
            lastMessage: lastMessageText,
            lastMessageTimestamp: lastMessageTs,
          });
        }
      }
      // Sort contacts by last message timestamp (most recent first)
      fetchedContacts.sort((a,b) => (b.lastMessageTimestamp?.toMillis() || 0) - (a.lastMessageTimestamp?.toMillis() || 0));
      setContacts(fetchedContacts);
      if (fetchedContacts.length > 0 && !selectedContact) {
        setSelectedContact(fetchedContacts[0]);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not load chat contacts." });
    } finally {
      setIsLoadingContacts(false);
    }
  }, [toast, selectedContact]);

  useEffect(() => {
    if (user && !authLoading) {
      fetchContacts(user.uid);
    }
  }, [user, authLoading, fetchContacts]);

  // Firestore listener for messages in the selected chat room
  useEffect(() => {
    if (!selectedContact || !user) {
      setMessages([]);
      return;
    }
    setIsLoadingMessages(true);
    const chatRoomId = getChatRoomId(user.uid, selectedContact.id);
    const messagesRef = collection(db, "messages", chatRoomId, "chatMessages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages: Message[] = [];
      querySnapshot.forEach((doc) => {
        fetchedMessages.push({ id: doc.id, ...doc.data() } as Message);
      });
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, (error) => {
      console.error("Error fetching messages:", error);
      toast({variant: "destructive", title: "Chat Error", description: "Could not load messages."});
      setIsLoadingMessages(false);
    });

    return () => unsubscribe(); // Cleanup listener
  }, [selectedContact, user, toast]);

  useEffect(() => {
    if (!isLoadingMessages) {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoadingMessages]);

  const getChatRoomId = (uid1: string, uid2: string) => {
    return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
  };

  const handleSendMessage = async () => {
    if (newMessage.trim() === "" || !selectedContact || !user || isSending) return;
    setIsSending(true);
    const chatRoomId = getChatRoomId(user.uid, selectedContact.id);
    const messageData = {
      chatRoomId,
      senderId: user.uid,
      senderName: user.displayName || user.fullName || "Patient",
      receiverId: selectedContact.id,
      text: newMessage,
      timestamp: serverTimestamp(),
    };
    try {
      await addDoc(collection(db, "messages", chatRoomId, "chatMessages"), messageData);
      setNewMessage("");
      // Update last message on contact (optimistic or via backend trigger)
      setContacts(prev => prev.map(c => c.id === selectedContact.id ? {...c, lastMessage: newMessage, lastMessageTimestamp: Timestamp.now()} : c)
        .sort((a,b) => (b.lastMessageTimestamp?.toMillis() || 0) - (a.lastMessageTimestamp?.toMillis() || 0))
      );
    } catch (error) {
        console.error("Error sending message:", error);
        toast({variant: "destructive", title: "Send Error", description: "Message could not be sent."});
    } finally {
        setIsSending(false);
    }
  };
  
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedContact && user && !isSending) {
      setIsSending(true);
      toast({ title: "Uploading...", description: `Sending ${file.name}` });
      // TODO: Implement Firebase Storage upload here
      // 1. Upload file to Firebase Storage (e.g., in a path like `chatFiles/${chatRoomId}/${file.name_timestamp}`)
      // 2. Get the downloadURL
      // 3. Send a message with fileUrl and fileName
      
      // Simulating for now:
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate upload
      const chatRoomId = getChatRoomId(user.uid, selectedContact.id);
      const messageData = {
        chatRoomId,
        senderId: user.uid,
        senderName: user.displayName || user.fullName || "Patient",
        receiverId: selectedContact.id,
        text: `Shared a file.`, // Or empty if only showing file name
        timestamp: serverTimestamp(),
        fileUrl: "https://placehold.co/200x150.png", // Replace with actual downloadURL
        fileName: file.name,
      };
       try {
        await addDoc(collection(db, "messages", chatRoomId, "chatMessages"), messageData);
        toast({ title: "File Sent", description: `${file.name} uploaded.` });
         setContacts(prev => prev.map(c => c.id === selectedContact.id ? {...c, lastMessage: `File: ${file.name}`, lastMessageTimestamp: Timestamp.now()} : c)
          .sort((a,b) => (b.lastMessageTimestamp?.toMillis() || 0) - (a.lastMessageTimestamp?.toMillis() || 0))
        );
      } catch (error) {
          console.error("Error sending file message:", error);
          toast({variant: "destructive", title: "Send Error", description: "File message could not be sent."});
      } finally {
          setIsSending(false);
          if(fileInputRef.current) fileInputRef.current.value = ""; // Reset file input
      }
    }
  };

  if (authLoading) {
    return <div className="flex items-center justify-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /><p className="ml-2">Loading chat...</p></div>;
  }
   if (!user && !authLoading) {
    return <div className="text-center p-8">Please log in to use the chat.</div>;
  }

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.24))]"> {/* Adjusted height */}
      <PageHeader title="Chat" description="Communicate with your Gynecologists." />
      
      <div className="flex-grow grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 overflow-hidden mt-4">
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-lg">Contacts</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-grow">
            <CardContent className="p-0">
              {isLoadingContacts ? (
                 <div className="p-4 text-center text-muted-foreground"><Loader2 className="inline mr-2 h-4 w-4 animate-spin"/>Loading contacts...</div>
              ) : contacts.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground">No contacts available. Contacts appear after appointments.</div>
              ) : (
                contacts.map(contact => (
                  <Button
                    key={contact.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start h-auto p-3 rounded-none border-b",
                      selectedContact?.id === contact.id && "bg-accent text-accent-foreground"
                    )}
                    onClick={() => setSelectedContact(contact)}
                  >
                    <Avatar className="h-10 w-10 mr-3">
                      <AvatarImage src={contact.avatarUrl} data-ai-hint="doctor person" />
                      <AvatarFallback>{contact.name.substring(0,2).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-grow text-left overflow-hidden">
                      <p className="font-semibold truncate">{contact.name}</p>
                      <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                    </div>
                  </Button>
                ))
              )}
            </CardContent>
          </ScrollArea>
        </Card>

        <Card className="flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center space-x-3">
                 <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedContact.avatarUrl} data-ai-hint="doctor person"/>
                    <AvatarFallback>{selectedContact.name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedContact.name}</CardTitle>
                  {/* <CardDescription>Online</CardDescription>  Actual online status is complex */}
                </div>
              </CardHeader>
              <ScrollArea className="flex-grow p-4 space-y-4 bg-secondary/20">
                {isLoadingMessages && messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8"><Loader2 className="inline mr-2 h-4 w-4 animate-spin"/>Loading messages...</div>
                )}
                {!isLoadingMessages && messages.length === 0 && (
                     <div className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</div>
                )}
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex", msg.senderId === user.uid ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] p-3 rounded-xl shadow",
                      msg.senderId === user.uid ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
                    )}>
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      {msg.fileUrl && (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs underline hover:opacity-80">
                           <Paperclip className="inline h-3 w-3 mr-1"/> {msg.fileName || "View Attachment"}
                        </a>
                      )}
                      <p className="text-xs mt-1 opacity-70 text-right">{msg.timestamp?.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) || 'Sending...'}</p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </ScrollArea>
              <CardFooter className="p-4 border-t">
                <div className="flex w-full items-center space-x-2">
                  <Input 
                    type="text" 
                    placeholder="Type a message..." 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-grow"
                    disabled={isSending}
                  />
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" disabled={isSending}/>
                  <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()} disabled={isSending}>
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim() || isSending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isSending ? <Loader2 className="h-5 w-5 animate-spin"/> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </CardFooter>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <MessageSquareIcon className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Select a contact to start chatting</p>
              <p className="text-sm">Your conversations will appear here.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
