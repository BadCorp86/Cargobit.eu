'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCargoBitStore } from '@/lib/store';
import { t } from '@/lib/i18n';
import { tickets, getPriorityColor } from '@/lib/mock-data';
import type { TicketPriority, TicketStatus } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  Plus,
  Send,
  Clock,
  User,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  Reply,
  ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const statusLabels: Record<TicketStatus, string> = {
  open: 'open',
  in_progress: 'inProgress',
  resolved: 'resolved',
  closed: 'closed',
};

const statusIcons: Record<TicketStatus, React.ElementType> = {
  open: AlertCircle,
  in_progress: Clock,
  resolved: CheckCircle2,
  closed: XCircle,
};

const statusColors: Record<TicketStatus, string> = {
  open: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  in_progress: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  resolved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  closed: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400',
};

export function SupportPage() {
  const { language, currentRole, showCreateTicket, setShowCreateTicket, selectedTicketId, setSelectedTicketId } = useCargoBitStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [replyText, setReplyText] = useState('');

  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (tk) => tk.subject.toLowerCase().includes(q) || tk.customer.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== 'all') result = result.filter((tk) => tk.status === statusFilter);
    if (priorityFilter !== 'all') result = result.filter((tk) => tk.priority === priorityFilter);
    return result;
  }, [searchQuery, statusFilter, priorityFilter]);

  const selectedTicket = tickets.find((tk) => tk.id === selectedTicketId);

  const openCount = tickets.filter((tk) => tk.status === 'open').length;
  const urgentCount = tickets.filter((tk) => tk.priority === 'urgent').length;

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t('support', language)}</h1>
          <div className="flex items-center gap-3 mt-1">
            <Badge variant="secondary" className="bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 border-0">
              {openCount} {t('open', language).toLowerCase()}
            </Badge>
            <Badge variant="secondary" className="bg-red-50 text-red-600 dark:bg-red-900/30 dark:text-red-400 border-0">
              {urgentCount} {t('urgent', language).toLowerCase()}
            </Badge>
          </div>
        </div>
        <Button
          onClick={() => setShowCreateTicket(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25"
        >
          <Plus className="w-4 h-4 mr-2" />
          {t('newTicket', language)}
        </Button>
      </div>

      {/* Info Banner - Support nur für Zwischenfälle (for all roles except admin/support) */}
      {currentRole !== 'admin' && currentRole !== 'support' && (
        <Card className="bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {language === 'de' 
                    ? '⚠️ Support nur für Zwischenfälle' 
                    : '⚠️ Support for Incidents Only'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {language === 'de'
                    ? 'Dieses Support-System ist ausschließlich für Zwischenfälle während eines aktiven Transports gedacht (z.B. Unfälle, beschädigte Ware, Lieferprobleme). Für allgemeine Kommunikation nutzen Sie bitte den Transport-Chat.'
                    : 'This support system is exclusively for incidents during an active transport (e.g., accidents, damaged goods, delivery issues). For general communication, please use the transport chat.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder={t('search', language)}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10">
                <SelectValue placeholder={t('status', language)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all', language)}</SelectItem>
                {(Object.keys(statusLabels) as TicketStatus[]).map((status) => (
                  <SelectItem key={status} value={status}>{t(statusLabels[status], language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-full sm:w-40 h-10">
                <SelectValue placeholder={t('priority', language)} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('all', language)}</SelectItem>
                {(['low', 'medium', 'high', 'urgent'] as TicketPriority[]).map((p) => (
                  <SelectItem key={p} value={p}>{t(p, language)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Ticket List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          {filteredTickets.map((ticket, index) => {
            const StatusIcon = statusIcons[ticket.status];
            return (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <Card
                  className={cn(
                    'bg-card/50 backdrop-blur-sm border-border/50 hover:border-orange-300/50 dark:hover:border-orange-700/30 transition-all cursor-pointer',
                    selectedTicketId === ticket.id && 'ring-2 ring-orange-500/30 border-orange-300/50'
                  )}
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5', statusColors[ticket.status])}>
                        <StatusIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate">{ticket.subject}</p>
                          <Badge className={cn('text-[10px] border-0 shrink-0', getPriorityColor(ticket.priority))}>
                            {t(ticket.priority, language)}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{ticket.description}</p>
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <User className="w-3 h-3" />{ticket.customer}
                          </span>
                          <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />{ticket.messages.length}
                          </span>
                          {ticket.assignedTo && (
                            <span className="text-[10px] text-muted-foreground">
                              → {ticket.assignedTo}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-2" />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
          {filteredTickets.length === 0 && (
            <Card className="bg-card/50 backdrop-blur-sm border-border/50">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t('noData', language)}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Ticket Detail / Chat */}
        <div className="hidden lg:block">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50 sticky top-20">
            {selectedTicket ? (
              <>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <Badge className={cn('text-[10px] border-0', statusColors[selectedTicket.status])}>
                      {t(statusLabels[selectedTicket.status], language)}
                    </Badge>
                    <Badge className={cn('text-[10px] border-0', getPriorityColor(selectedTicket.priority))}>
                      {t(selectedTicket.priority, language)}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-semibold">{selectedTicket.subject}</CardTitle>
                  <p className="text-xs text-muted-foreground">{selectedTicket.customer}</p>
                </CardHeader>
                <Separator className="mx-6 w-auto" />
                <CardContent className="p-0">
                  <ScrollArea className="h-72 p-4">
                    <div className="space-y-4">
                      {selectedTicket.messages.map((msg) => (
                        <div key={msg.id} className={cn('flex gap-2', msg.isAgent && 'flex-row-reverse')}>
                          <Avatar className="w-7 h-7 shrink-0">
                            <AvatarFallback className={cn('text-[10px]', msg.isAgent ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-muted text-muted-foreground')}>
                              {msg.sender.slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <div className={cn('max-w-[80%]', msg.isAgent && 'text-right')}>
                            <div className={cn(
                              'rounded-xl px-3 py-2 text-xs',
                              msg.isAgent
                                ? 'bg-orange-500 text-white rounded-tr-sm'
                                : 'bg-muted rounded-tl-sm'
                            )}>
                              <p>{msg.content}</p>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 px-1">
                              {msg.sender} • {new Date(msg.timestamp).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t border-border/50">
                    <div className="flex gap-2">
                      <Input
                        placeholder={t('reply', language) + '...'}
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="h-9 text-sm"
                      />
                      <Button size="icon" className="h-9 w-9 bg-orange-500 hover:bg-orange-600 shrink-0">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </>
            ) : (
              <CardContent className="py-16 text-center">
                <MessageSquare className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">
                  {language === 'de' ? 'Wählen Sie ein Ticket aus' : 'Select a ticket'}
                </p>
              </CardContent>
            )}
          </Card>
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={showCreateTicket} onOpenChange={setShowCreateTicket}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-orange-500" />
              {t('newTicket', language)}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t('subject', language)}</Label>
              <Input placeholder={t('subject', language)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t('priority', language)}</Label>
                <Select defaultValue="medium">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(['low', 'medium', 'high', 'urgent'] as TicketPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>{t(p, language)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('assignTo', language)}</Label>
                <Select defaultValue="">
                  <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="maria">Maria Schneider</SelectItem>
                    <SelectItem value="thomas">Thomas Meier</SelectItem>
                    <SelectItem value="lisa">Lisa Klein</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>{t('description', language)}</Label>
              <Textarea rows={4} placeholder={t('description', language)} />
            </div>
            <Button
              className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white shadow-lg shadow-orange-500/25"
              onClick={() => setShowCreateTicket(false)}
            >
              {t('newTicket', language)}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
