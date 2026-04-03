'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare,
  Send,
  Truck,
  Package,
  CheckCircle2,
  AlertCircle,
  User,
  Users,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock transport chats
const mockTransportChats = [
  {
    id: 'chat-1',
    shipmentId: 'SHP-001',
    trackingNumber: 'CB-2024-001234',
    status: 'active',
    driver: { id: 'd1', name: 'Max Mustermann' },
    shipper: { id: 's1', name: 'Logistik GmbH' },
    receiver: { id: 'r1', name: 'Empfänger AG' },
    route: 'Berlin → München',
    messages: [
      { id: 'm1', sender: 'Logistik GmbH', content: 'Hallo, der Transport ist bestätigt. Abholung morgen um 8:00 Uhr.', timestamp: new Date(Date.now() - 3600000 * 24), isDriver: false },
      { id: 'm2', sender: 'Max Mustermann', content: 'Alles klar, ich bin pünktlich da. Gibt es Besonderheiten bei der Ladung?', timestamp: new Date(Date.now() - 3600000 * 23), isDriver: true },
      { id: 'm3', sender: 'Logistik GmbH', content: 'Ja, es sind empfindliche Elektronik-Komponenten. Bitte vorsichtig fahren.', timestamp: new Date(Date.now() - 3600000 * 22), isDriver: true },
      { id: 'm4', sender: 'Empfänger AG', content: 'Wir erwarten die Lieferung zwischen 14:00 und 16:00 Uhr. Ist das machbar?', timestamp: new Date(Date.now() - 3600000 * 12), isDriver: false },
      { id: 'm5', sender: 'Max Mustermann', content: 'Ja, ich werde gegen 15:00 Uhr eintreffen. Werde Sie benachrichtigen.', timestamp: new Date(Date.now() - 3600000 * 11), isDriver: true },
    ],
    createdAt: new Date(Date.now() - 3600000 * 25),
  },
  {
    id: 'chat-2',
    shipmentId: 'SHP-002',
    trackingNumber: 'CB-2024-001235',
    status: 'active',
    driver: { id: 'd2', name: 'Anna Schmidt' },
    shipper: { id: 's2', name: 'Spedition Müller' },
    receiver: { id: 'r2', name: 'Handel KG' },
    route: 'Hamburg → Frankfurt',
    messages: [
      { id: 'm6', sender: 'Spedition Müller', content: 'Transport startet in 2 Stunden. Bitte Ladeliste bestätigen.', timestamp: new Date(Date.now() - 3600000 * 5), isDriver: false },
      { id: 'm7', sender: 'Anna Schmidt', content: 'Ladeliste erhalten, alles korrekt. Starte jetzt.', timestamp: new Date(Date.now() - 3600000 * 4), isDriver: true },
    ],
    createdAt: new Date(Date.now() - 3600000 * 6),
  },
  {
    id: 'chat-3',
    shipmentId: 'SHP-003',
    trackingNumber: 'CB-2024-001230',
    status: 'completed',
    driver: { id: 'd3', name: 'Thomas Weber' },
    shipper: { id: 's3', name: 'Express Logistik' },
    receiver: { id: 'r3', name: 'Technik GmbH' },
    route: 'Köln → Stuttgart',
    messages: [
      { id: 'm8', sender: 'Express Logistik', content: 'Transport erfolgreich abgeschlossen. Vielen Dank!', timestamp: new Date(Date.now() - 3600000 * 48), isDriver: false },
      { id: 'm9', sender: 'Thomas Weber', content: 'Gerne! Alles gut angekommen.', timestamp: new Date(Date.now() - 3600000 * 47), isDriver: true },
    ],
    createdAt: new Date(Date.now() - 3600000 * 72),
    deletedAt: new Date(Date.now() - 3600000 * 24), // Auto-deleted after completion
  },
];

// Chat list item
function ChatListItem({
  chat,
  isSelected,
  onClick,
  language,
}: {
  chat: typeof mockTransportChats[0];
  isSelected: boolean;
  onClick: () => void;
  language: string;
}) {
  const lastMessage = chat.messages[chat.messages.length - 1];
  const isActive = chat.status === 'active';

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'p-3 rounded-xl cursor-pointer transition-all duration-200',
        isSelected
          ? 'bg-orange-500/10 border border-orange-300/50 dark:border-orange-700/30'
          : 'bg-card/50 hover:bg-muted/50 border border-transparent'
      )}
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold truncate">{chat.trackingNumber}</p>
            {isActive ? (
              <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-[10px] border-0">
                {language === 'de' ? 'Aktiv' : 'Active'}
              </Badge>
            ) : (
              <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400 text-[10px] border-0">
                {language === 'de' ? 'Abgeschlossen' : 'Completed'}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">{chat.route}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Truck className="w-3 h-3" />
              {chat.driver.name}
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[10px] text-muted-foreground">
            {new Date(lastMessage.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
          </p>
          <div className="w-6 h-6 rounded-full bg-orange-500/10 flex items-center justify-center mt-1">
            <MessageSquare className="w-3 h-3 text-orange-500" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Chat message
function ChatMessage({
  message,
  isOwn,
}: {
  message: typeof mockTransportChats[0]['messages'][0];
  isOwn: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex gap-2', isOwn ? 'flex-row-reverse' : 'flex-row')}
    >
      <Avatar className="w-7 h-7 shrink-0">
        <AvatarFallback className={cn('text-[10px]', isOwn ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-muted text-muted-foreground')}>
          {message.sender.slice(0, 2)}
        </AvatarFallback>
      </Avatar>
      <div className={cn('max-w-[75%]', isOwn && 'text-right')}>
        <div className={cn(
          'rounded-xl px-3 py-2 text-sm',
          isOwn
            ? 'bg-orange-500 text-white rounded-tr-sm'
            : 'bg-muted rounded-tl-sm'
        )}>
          <p>{message.content}</p>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 px-1">
          {message.sender} • {new Date(message.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </motion.div>
  );
}

export function TransportChatPage() {
  const { language, currentRole } = useCargoBitStore();
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messageInput, setMessageInput] = useState('');

  // Filter chats based on role and status
  const visibleChats = useMemo(() => {
    // For demo: show all active chats, completed chats are auto-deleted after 24h
    return mockTransportChats.filter(chat => {
      if (chat.status === 'completed' && chat.deletedAt) {
        const hoursSinceDeleted = (Date.now() - chat.deletedAt.getTime()) / (1000 * 60 * 60);
        return hoursSinceDeleted < 24; // Show deleted chats for demo purposes
      }
      return true;
    });
  }, []);

  const selectedChat = visibleChats.find(c => c.id === selectedChatId);

  const handleSendMessage = () => {
    if (!messageInput.trim()) return;
    // In a real app, this would send the message to the backend
    console.log('Sending message:', messageInput);
    setMessageInput('');
  };

  const getRoleLabel = () => {
    if (currentRole === 'driver') return language === 'de' ? 'Fahrer' : 'Driver';
    if (currentRole === 'shipper') return language === 'de' ? 'Verlader' : 'Shipper';
    if (currentRole === 'admin' || currentRole === 'support') return language === 'de' ? 'Admin/Support' : 'Admin/Support';
    return '';
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-orange-500" />
            {language === 'de' ? 'Transport-Chat' : 'Transport Chat'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {language === 'de'
              ? 'Kommunikation während aktiver Transporte'
              : 'Communication during active transports'}
          </p>
        </div>
        {currentRole === 'admin' || currentRole === 'support' ? (
          <Badge className="bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-0">
            <Shield className="w-3 h-3 mr-1" />
            {language === 'de' ? 'Konfliktlösung-Zugang' : 'Conflict Resolution Access'}
          </Badge>
        ) : null}
      </div>

      {/* Info Banner */}
      <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-800 dark:text-blue-200">
              <p className="font-medium">{language === 'de' ? 'Automatische Löschung' : 'Auto-Deletion'}</p>
              <p className="text-xs mt-1">
                {language === 'de'
                  ? 'Chats werden nach Abschluss des Transports automatisch nach 24 Stunden gelöscht. Admin/Support können bei Konflikten jederzeit beitreten.'
                  : 'Chats are automatically deleted 24 hours after transport completion. Admin/Support can join anytime for conflict resolution.'}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chat List */}
        <div className="lg:col-span-1">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-4 h-4 text-orange-500" />
                {language === 'de' ? 'Aktive Chats' : 'Active Chats'}
                <Badge variant="secondary" className="ml-auto text-xs">
                  {visibleChats.filter(c => c.status === 'active').length}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {visibleChats.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground">
                  <MessageSquare className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">{language === 'de' ? 'Keine aktiven Chats' : 'No active chats'}</p>
                </div>
              ) : (
                visibleChats.map(chat => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    isSelected={selectedChatId === chat.id}
                    onClick={() => setSelectedChatId(chat.id)}
                    language={language}
                  />
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Chat Detail */}
        <div className="lg:col-span-2">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 h-[600px] flex flex-col">
            {selectedChat ? (
              <>
                {/* Chat Header */}
                <CardHeader className="pb-3 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500/10 to-amber-500/10 flex items-center justify-center">
                        <Package className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <CardTitle className="text-sm">{selectedChat.trackingNumber}</CardTitle>
                        <p className="text-xs text-muted-foreground">{selectedChat.route}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn(
                        'text-[10px] border-0',
                        selectedChat.status === 'active'
                          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                      )}>
                        {selectedChat.status === 'active' 
                          ? (language === 'de' ? 'Aktiv' : 'Active')
                          : (language === 'de' ? 'Abgeschlossen' : 'Completed')}
                      </Badge>
                    </div>
                  </div>
                  {/* Participants */}
                  <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Truck className="w-3 h-3" />
                      <span>{language === 'de' ? 'Fahrer:' : 'Driver:'} {selectedChat.driver.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      <span>{language === 'de' ? 'Verlader:' : 'Shipper:'} {selectedChat.shipper.name}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Package className="w-3 h-3" />
                      <span>{language === 'de' ? 'Empfänger:' : 'Receiver:'} {selectedChat.receiver.name}</span>
                    </div>
                  </div>
                </CardHeader>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-4">
                    {selectedChat.messages.map(msg => (
                      <ChatMessage
                        key={msg.id}
                        message={msg}
                        isOwn={currentRole === 'driver' ? msg.isDriver : !msg.isDriver}
                      />
                    ))}
                  </div>
                </ScrollArea>

                {/* Input */}
                {selectedChat.status === 'active' ? (
                  <div className="p-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Input
                        value={messageInput}
                        onChange={(e) => setMessageInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                        placeholder={language === 'de' ? 'Nachricht eingeben...' : 'Type a message...'}
                        className="flex-1"
                      />
                      <Button
                        onClick={handleSendMessage}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {language === 'de'
                        ? `Sie schreiben als: ${getRoleLabel()}`
                        : `You are writing as: ${getRoleLabel()}`}
                    </p>
                  </div>
                ) : (
                  <div className="p-4 border-t border-border/50 bg-muted/30">
                    <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      {language === 'de'
                        ? 'Transport abgeschlossen – Chat ist schreibgeschützt'
                        : 'Transport completed – Chat is read-only'}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <CardContent className="flex-1 flex flex-col items-center justify-center">
                <MessageSquare className="w-12 h-12 text-muted-foreground/30 mb-3" />
                <p className="text-muted-foreground text-sm">
                  {language === 'de' ? 'Wählen Sie einen Chat aus' : 'Select a chat to view'}
                </p>
                <p className="text-muted-foreground/60 text-xs mt-1">
                  {language === 'de'
                    ? 'Nur aktive Transporte werden angezeigt'
                    : 'Only active transports are shown'}
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
