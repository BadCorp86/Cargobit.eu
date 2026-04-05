'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Search,
  MoreHorizontal,
  UserCog,
  UserX,
  UserCheck,
  Shield,
  Mail,
  Phone,
  Building,
  Calendar,
  DollarSign,
  AlertTriangle,
  Eye,
  Ban,
  CheckCircle,
  XCircle,
  Clock,
  Filter,
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string | null;
  role: string;
  status: string;
  companyName: string | null;
  phone: string | null;
  membershipTier: string;
  walletBalance: number;
  isBlocked: boolean;
  blockReason: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

interface UserStats {
  total: number;
  active: number;
  pending: number;
  blocked: number;
  byRole: Record<string, number>;
}

export function UsersAdminPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');

  // Form state
  const [editForm, setEditForm] = useState({
    role: '',
    status: '',
    membershipTier: '',
    walletBalance: 0,
  });

  useEffect(() => {
    fetchUsers();
  }, [page, roleFilter, statusFilter, search]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(roleFilter !== 'all' && { role: roleFilter }),
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(search && { search }),
      });

      const response = await fetch(`/api/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.pagination?.totalPages || 1);

        // Calculate stats
        const allUsers = data.users || [];
        setStats({
          total: data.pagination?.total || allUsers.length,
          active: allUsers.filter((u: User) => u.status === 'ACTIVE').length,
          pending: allUsers.filter((u: User) => u.status === 'PENDING').length,
          blocked: allUsers.filter((u: User) => u.isBlocked).length,
          byRole: allUsers.reduce((acc: Record<string, number>, u: User) => {
            acc[u.role] = (acc[u.role] || 0) + 1;
            return acc;
          }, {}),
        });
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  };

  const openEditDialog = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      role: user.role,
      status: user.status,
      membershipTier: user.membershipTier,
      walletBalance: user.walletBalance,
    });
    setEditDialogOpen(true);
  };

  const openBlockDialog = (user: User) => {
    setSelectedUser(user);
    setBlockReason(user.blockReason || '');
    setBlockDialogOpen(true);
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          ...editForm,
        }),
      });

      if (response.ok) {
        toast.success('Benutzer erfolgreich aktualisiert');
        setEditDialogOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Fehler beim Aktualisieren');
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleBlockUser = async (block: boolean) => {
    if (!selectedUser) return;

    try {
      const response = await fetch('/api/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          isBlocked: block,
          blockReason: block ? blockReason : null,
          status: block ? 'BLOCKED' : 'ACTIVE',
        }),
      });

      if (response.ok) {
        toast.success(block ? 'Benutzer gesperrt' : 'Benutzer entsperrt');
        setBlockDialogOpen(false);
        fetchUsers();
      } else {
        const error = await response.json();
        toast.error(error.error || 'Fehler');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Fehler');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'destructive';
      case 'SUPPORT': return 'secondary';
      case 'DISPATCHER': return 'default';
      case 'SHIPPER': return 'outline';
      case 'DRIVER': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'ACTIVE':
      case 'VERIFIED': return 'success';
      case 'PENDING': return 'warning';
      case 'SUSPENDED':
      case 'BLOCKED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'ACTIVE': return 'Aktiv';
      case 'VERIFIED': return 'Verifiziert';
      case 'PENDING': return 'Ausstehend';
      case 'SUSPENDED': return 'Suspendiert';
      case 'BLOCKED': return 'Gesperrt';
      default: return status;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'ADMIN': return 'Administrator';
      case 'DISPATCHER': return 'Disponent';
      case 'DRIVER': return 'Fahrer';
      case 'SHIPPER': return 'Versender';
      case 'SUPPORT': return 'Support';
      default: return role;
    }
  };

  const getMembershipLabel = (tier: string) => {
    switch (tier) {
      case 'FREE': return 'Kostenlos';
      case 'STARTER': return 'Starter (89€)';
      case 'PROFESSIONAL': return 'Professional (499€)';
      case 'ENTERPRISE': return 'Enterprise (899€)';
      default: return tier;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Benutzerverwaltung</h1>
          <p className="text-muted-foreground">
            Verwalten Sie alle Benutzer, Rollen und Berechtigungen
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={fetchUsers}>
            Aktualisieren
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesamt</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
              <p className="text-xs text-muted-foreground">Registrierte Benutzer</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aktiv</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.active}</div>
              <p className="text-xs text-muted-foreground">Aktive Benutzer</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Ausstehend</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
              <p className="text-xs text-muted-foreground">Warten auf Bestätigung</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Gesperrt</CardTitle>
              <Ban className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.blocked}</div>
              <p className="text-xs text-muted-foreground">Gesperrte Konten</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Suche nach Name, E-Mail oder Firma..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Rolle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Rollen</SelectItem>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="DISPATCHER">Disponent</SelectItem>
                  <SelectItem value="DRIVER">Fahrer</SelectItem>
                  <SelectItem value="SHIPPER">Versender</SelectItem>
                  <SelectItem value="SUPPORT">Support</SelectItem>
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Status</SelectItem>
                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                  <SelectItem value="PENDING">Ausstehend</SelectItem>
                  <SelectItem value="BLOCKED">Gesperrt</SelectItem>
                  <SelectItem value="SUSPENDED">Suspendiert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card>
        <CardHeader>
          <CardTitle>Benutzerliste</CardTitle>
          <CardDescription>
            Klicken Sie auf einen Benutzer für Details
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Benutzer</TableHead>
                  <TableHead>Rolle</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Mitgliedschaft</TableHead>
                  <TableHead>Guthaben</TableHead>
                  <TableHead>Erstellt</TableHead>
                  <TableHead className="text-right">Aktionen</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id} className={user.isBlocked ? 'bg-red-50 dark:bg-red-950/20' : ''}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarFallback>
                            {user.name?.[0] || user.companyName?.[0] || user.email[0].toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {user.name || user.companyName || 'Unbekannt'}
                            {user.isBlocked && (
                              <AlertTriangle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getRoleBadgeVariant(user.role) as any}>
                        {getRoleLabel(user.role)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(user.status) as any}>
                        {getStatusLabel(user.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{getMembershipLabel(user.membershipTier)}</span>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium">{user.walletBalance.toFixed(2)} €</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {new Date(user.createdAt).toLocaleDateString('de-DE')}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDialog(user)}>
                            <UserCog className="mr-2 h-4 w-4" />
                            Bearbeiten
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            Details anzeigen
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {user.isBlocked ? (
                            <DropdownMenuItem
                              className="text-green-600"
                              onClick={() => handleBlockUser(false)}
                            >
                              <CheckCircle className="mr-2 h-4 w-4" />
                              Ent sperren
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => openBlockDialog(user)}
                            >
                              <Ban className="mr-2 h-4 w-4" />
                              Sperren
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
                {users.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Keine Benutzer gefunden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Benutzer bearbeiten</DialogTitle>
            <DialogDescription>
              Ändern Sie Rolle, Status und Mitgliedschaft
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="role">Rolle</Label>
              <Select
                value={editForm.role}
                onValueChange={(value) => setEditForm({ ...editForm, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ADMIN">Administrator</SelectItem>
                  <SelectItem value="DISPATCHER">Disponent</SelectItem>
                  <SelectItem value="DRIVER">Fahrer</SelectItem>
                  <SelectItem value="SHIPPER">Versender</SelectItem>
                  <SelectItem value="SUPPORT">Support</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm({ ...editForm, status: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktiv</SelectItem>
                  <SelectItem value="VERIFIED">Verifiziert</SelectItem>
                  <SelectItem value="PENDING">Ausstehend</SelectItem>
                  <SelectItem value="SUSPENDED">Suspendiert</SelectItem>
                  <SelectItem value="BLOCKED">Gesperrt</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="membership">Mitgliedschaft</Label>
              <Select
                value={editForm.membershipTier}
                onValueChange={(value) => setEditForm({ ...editForm, membershipTier: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FREE">Kostenlos</SelectItem>
                  <SelectItem value="STARTER">Starter (89€/Monat)</SelectItem>
                  <SelectItem value="PROFESSIONAL">Professional (499€/Monat)</SelectItem>
                  <SelectItem value="ENTERPRISE">Enterprise (899€/Monat)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="balance">Guthaben (€)</Label>
              <Input
                id="balance"
                type="number"
                step="0.01"
                value={editForm.walletBalance}
                onChange={(e) => setEditForm({ ...editForm, walletBalance: parseFloat(e.target.value) || 0 })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button onClick={handleUpdateUser}>
              Speichern
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block Dialog */}
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Benutzer sperren</DialogTitle>
            <DialogDescription>
              Sperren Sie den Benutzerzugang mit einer Begründung
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="reason">Sperrgrund</Label>
              <Textarea
                id="reason"
                placeholder="Geben Sie einen Grund für die Sperrung an..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockDialogOpen(false)}>
              Abbrechen
            </Button>
            <Button variant="destructive" onClick={() => handleBlockUser(true)}>
              Sperren
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default UsersAdminPage;
