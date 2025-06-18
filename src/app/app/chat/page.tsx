"use client";

import { PageHeader } from "@/components/shared/PageHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Paperclip, Send, User } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
  isMe: boolean;
  fileUrl?: string;
  fileName?: string;
}

interface ChatContact {
  id: string;
  name: string;
  avatarUrl?: string;
  lastMessage: string;
  unreadCount: number;
}

const mockContacts: ChatContact[] = [
  { id: "doc1", name: "Dr. Alice Smith", avatarUrl: "https://placehold.co/100x100.png?text=AS", lastMessage: "Yes, that's fine.", unreadCount: 2 },
  { id: "doc2", name: "Dr. Bob Johnson", avatarUrl: "https://placehold.co/100x100.png?text=BJ", lastMessage: "Please upload the report.", unreadCount: 0 },
  { id: "support", name: "TokenEase Support", avatarUrl: "https://placehold.co/100x100.png?text=TS", lastMessage: "How can I help you?", unreadCount: 0 },
];

const mockMessages: { [contactId: string]: Message[] } = {
  doc1: [
    { id: "m1", senderId: "doc1", text: "Hello! How are you feeling today?", timestamp: new Date(Date.now() - 1000 * 60 * 5), isMe: false },
    { id: "m2", senderId: "user1", text: "I'm feeling a bit better, thank you.", timestamp: new Date(Date.now() - 1000 * 60 * 3), isMe: true },
    { id: "m3", senderId: "doc1", text: "That's good to hear. Did you take the medication?", timestamp: new Date(Date.now() - 1000 * 60 * 2), isMe: false },
    { id: "m4", senderId: "doc1", text: "Yes, that's fine.", timestamp: new Date(Date.now() - 1000 * 60 * 1), isMe: false, fileUrl: "https://placehold.co/200x150.png", fileName: "prescription_scan.pdf" },
  ],
  doc2: [
    { id: "m5", senderId: "doc2", text: "Please upload the report.", timestamp: new Date(Date.now() - 1000 * 60 * 10), isMe: false },
  ],
  support: [
     { id: "m6", senderId: "support", text: "Welcome to TokenEase support. How can I help you today?", timestamp: new Date(Date.now() - 1000 * 60 * 15), isMe: false },
  ]
};


export default function ChatPage() {
  const { user } = useAuth();
  const [contacts, setContacts] = useState<ChatContact[]>(mockContacts);
  const [selectedContact, setSelectedContact] = useState<ChatContact | null>(mockContacts[0] || null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (selectedContact) {
      setMessages(mockMessages[selectedContact.id] || []);
    } else {
      setMessages([]);
    }
  }, [selectedContact]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === "" || !selectedContact || !user) return;
    const message: Message = {
      id: `msg${Date.now()}`,
      senderId: user.uid,
      text: newMessage,
      timestamp: new Date(),
      isMe: true,
    };
    setMessages(prev => [...prev, message]);
    
    // Simulate receiving a reply
    setTimeout(() => {
        const reply : Message = {
            id: `reply${Date.now()}`,
            senderId: selectedContact.id,
            text: `Thanks for your message: "${newMessage.substring(0,20)}..."`,
            timestamp: new Date(),
            isMe: false,
        };
        setMessages(prev => [...prev, reply]);
    }, 1000);

    setNewMessage("");
  };
  
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && selectedContact && user) {
      // Simulate file upload
      const message: Message = {
        id: `file${Date.now()}`,
        senderId: user.uid,
        text: `Shared a file: ${file.name}`,
        timestamp: new Date(),
        isMe: true,
        fileUrl: URL.createObjectURL(file), // Temporary URL for display
        fileName: file.name,
      };
      setMessages(prev => [...prev, message]);
      toast({ title: "File Uploaded", description: `${file.name} sent.` });
    }
  };


  const { toast } = useToast(); // If you need toasts

  return (
    <div className="flex flex-col h-[calc(100vh-theme(spacing.32))]"> {/* Adjust height based on your layout */}
      <PageHeader title="Chat" description="Communicate with doctors and support." />
      
      <div className="flex-grow grid grid-cols-1 md:grid-cols-[300px_1fr] gap-4 overflow-hidden">
        {/* Contacts List */}
        <Card className="flex flex-col overflow-hidden">
          <CardHeader className="p-4 border-b">
            <CardTitle className="text-lg">Contacts</CardTitle>
          </CardHeader>
          <ScrollArea className="flex-grow">
            <CardContent className="p-0">
              {contacts.map(contact => (
                <Button
                  key={contact.id}
                  variant="ghost"
                  className={cn(
                    "w-full justify-start h-auto p-3 rounded-none border-b",
                    selectedContact?.id === contact.id && "bg-accent/50"
                  )}
                  onClick={() => setSelectedContact(contact)}
                >
                  <Avatar className="h-10 w-10 mr-3">
                    <AvatarImage src={contact.avatarUrl} />
                    <AvatarFallback>{contact.name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-grow text-left">
                    <p className="font-semibold">{contact.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{contact.lastMessage}</p>
                  </div>
                  {contact.unreadCount > 0 && (
                    <span className="ml-auto bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
                      {contact.unreadCount}
                    </span>
                  )}
                </Button>
              ))}
            </CardContent>
          </ScrollArea>
        </Card>

        {/* Chat Area */}
        <Card className="flex flex-col overflow-hidden">
          {selectedContact ? (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center space-x-3">
                 <Avatar className="h-10 w-10">
                    <AvatarImage src={selectedContact.avatarUrl} />
                    <AvatarFallback>{selectedContact.name.substring(0,2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                <div>
                  <CardTitle className="text-lg">{selectedContact.name}</CardTitle>
                  <CardDescription>Online</CardDescription> {/* Or last seen */}
                </div>
              </CardHeader>
              <ScrollArea className="flex-grow p-4 space-y-4 bg-secondary/20">
                {messages.map(msg => (
                  <div key={msg.id} className={cn("flex", msg.isMe ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[70%] p-3 rounded-xl shadow",
                      msg.isMe ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground"
                    )}>
                      <p className="text-sm">{msg.text}</p>
                      {msg.fileUrl && (
                        <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block text-xs underline hover:opacity-80">
                           {msg.fileName || "View Attachment"}
                        </a>
                      )}
                      <p className="text-xs mt-1 opacity-70 text-right">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
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
                  />
                  <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                  <Button variant="ghost" size="icon" onClick={() => fileInputRef.current?.click()}>
                    <Paperclip className="h-5 w-5" />
                  </Button>
                  <Button onClick={handleSendMessage} disabled={!newMessage.trim()} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    <Send className="h-5 w-5" />
                  </Button>
                </div>
              </CardFooter>
            </>
          ) : (
            <div className="flex-grow flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
              <MessageSquare className="h-16 w-16 mb-4" />
              <p className="text-lg font-medium">Select a contact to start chatting</p>
              <p className="text-sm">Your conversations will appear here.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
