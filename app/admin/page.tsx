"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/data';
import { Ticket, Building, User, UserRole } from '@/lib/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Plus, Trash2, Edit2, CheckCircle, Clock, AlertCircle, X, Save, ArrowLeft, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ImportTickets } from '@/components/ImportTickets';

export default function AdminPage() {
  const { user, isLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [activeTab, setActiveTab] = useState('chamados');
  const [isLoadingData, setIsLoadingData] = useState(false);

  // Navigation & Filter States
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [registrationFilter, setRegistrationFilter] = useState<'pending' | 'all'>('pending');
  const [registeringTicketId, setRegisteringTicketId] = useState<string | null>(null);
  const [externalIdInput, setExternalIdInput] = useState('');
  const [editingTicketNumberId, setEditingTicketNumberId] = useState<string | null>(null);
  const [editingTicketNumberValue, setEditingTicketNumberValue] = useState('');
  const [pendingCounts, setPendingCounts] = useState<Map<string, number>>(new Map());

  // Form states
  const [showBuildingForm, setShowBuildingForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingBuilding, setEditingBuilding] = useState<Building | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedTicketForGallery, setSelectedTicketForGallery] = useState<Ticket | null>(null);

  // Building form
  const [buildingName, setBuildingName] = useState('');
  const [buildingAddress, setBuildingAddress] = useState('');

  // User form
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [userTurma, setUserTurma] = useState('');
  const [userAllowedBuildings, setUserAllowedBuildings] = useState<string[]>([]);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    } else if (!isLoading && user && user.role !== 'admin') {
      router.push('/');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user, selectedBuildingId, registrationFilter]);

  // Limpar contagem de pendentes quando selecionar/desselecionar prédio
  useEffect(() => {
    if (selectedBuildingId) {
      setPendingCounts(new Map());
    }
  }, [selectedBuildingId]);

  const loadData = async () => {
    setIsLoadingData(true);
    try {
      // Buscar prédios e usuários
      const [buildingsData, usersData] = await Promise.all([
        dataService.getBuildings(),
        dataService.getUsers()
      ]);

      setBuildings(buildingsData);
      setUsers(usersData);

      // Se tem prédio selecionado, buscar tickets desse prédio
      if (selectedBuildingId) {
        const ticketsData = await dataService.getTicketsByBuilding(
          selectedBuildingId,
          registrationFilter === 'pending'
        );
        setTickets(ticketsData);
      } else {
        // Na tela inicial, buscar contagem otimizada de pendentes por prédio
        const pendingCounts = await dataService.getPendingCountsByBuilding();

        // Criar um mapa de contagem para acesso rápido
        const pendingMap = new Map<string, number>();
        pendingCounts.forEach(({ buildingId, count }) => {
          pendingMap.set(buildingId, count);
        });

        // Buscar TODOS os tickets usando o método que carrega em lotes
        const ticketsData = await dataService.getTicketsForUser(user!);
        setTickets(ticketsData);

        // Armazenar contagem de pendentes para uso na renderização
        setPendingCounts(pendingMap);
      }
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleUpdateTicketStatus = async (ticketId: string, status: Ticket['status']) => {
    await dataService.updateTicket(ticketId, { status });
    await loadData();
    toast.success('Status atualizado!');
  };

  const handleRegisterExternalId = async (ticketId: string) => {
    if (!externalIdInput) {
      toast.error('Informe o número do chamado da construtora');
      return;
    }
    await dataService.updateTicket(ticketId, {
      externalTicketId: externalIdInput,
      isRegistered: true
    });
    setRegisteringTicketId(null);
    setExternalIdInput('');
    await loadData();
    toast.success('Chamado registrado!');
  };

  const handleSaveTicketNumber = async (ticketId: string) => {
    if (!editingTicketNumberValue.trim()) {
      toast.error('Informe o número do chamado');
      return;
    }
    await dataService.updateTicket(ticketId, {
      externalTicketId: editingTicketNumberValue,
      isRegistered: true
    });
    setEditingTicketNumberId(null);
    setEditingTicketNumberValue('');
    await loadData();
    toast.success('Número atualizado!');
  };

  const handleDeleteBuilding = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este prédio?')) {
      await dataService.deleteBuilding(id);
      await loadData();
      toast.success('Prédio excluído!');
    }
  };
  const handleDeleteUser = async (userId: string) => {
    if (userId === user?.id) {
      toast.error('Você não pode excluir seu próprio usuário!');
      return;
    }
    if (confirm('Tem certeza que deseja excluir este usuário?')) {
      await dataService.deleteUser(userId);
      await loadData();
      toast.success('Usuário excluído!');
    }
  };

  const downloadPhoto = (photoUrl: string, ticketId: string, index?: number) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `chamado-${ticketId.slice(0, 8)}${index !== undefined ? `-${index + 1}` : ''}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Foto ${index !== undefined ? index + 1 : ''} baixada!`);
  };

  const downloadAllPhotos = (ticket: Ticket) => {
    ticket.photoUrls.forEach((url, index) => {
      setTimeout(() => {
        downloadPhoto(url, ticket.id, index);
      }, index * 500);
    });
    toast.success('Baixando todas as fotos...');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '--';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const handleBuildingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!buildingName || !buildingAddress) {
      toast.error('Preencha todos os campos');
      return;
    }

    if (editingBuilding) {
      await dataService.updateBuilding(editingBuilding.id, {
        name: buildingName,
        address: buildingAddress
      });
      toast.success('Prédio atualizado!');
    } else {
      await dataService.createBuilding({
        name: buildingName,
        address: buildingAddress
      });
      toast.success('Prédio criado!');
    }

    cancelForm();
    await loadData();
  };

  const handleUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName || !userEmail) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }

    if (editingUser) {
      await dataService.updateUser(editingUser.id, {
        name: userName,
        email: userEmail,
        role: userRole,
        turma: userTurma,
        allowedBuildings: userAllowedBuildings
      });
      if (editingUser.id === user?.id) {
        refreshUser();
      }
      toast.success('Usuário atualizado!');
    } else {
      if (users.some(u => u.email.toLowerCase() === userEmail.toLowerCase())) {
        toast.error('Este e-mail já está em uso');
        return;
      }
      await dataService.createUser({
        name: userName,
        email: userEmail,
        role: userRole,
        turma: userTurma,
        allowedBuildings: userAllowedBuildings
      });
      toast.success('Usuário criado!');
    }

    cancelForm();
    loadData();
  };

  const startEditBuilding = (building: Building) => {
    setEditingBuilding(building);
    setBuildingName(building.name);
    setBuildingAddress(building.address);
    setShowBuildingForm(true);
  };

  const startEditUser = (userToEdit: User) => {
    setEditingUser(userToEdit);
    setUserName(userToEdit.name);
    setUserEmail(userToEdit.email);
    setUserRole(userToEdit.role);
    setUserTurma(userToEdit.turma || '');
    setUserAllowedBuildings([...userToEdit.allowedBuildings]);
    setShowUserForm(true);
  };

  const cancelForm = () => {
    setShowBuildingForm(false);
    setShowUserForm(false);
    setEditingBuilding(null);
    setEditingUser(null);
    setBuildingName('');
    setBuildingAddress('');
    setUserName('');
    setUserEmail('');
    setUserRole('user');
    setUserTurma('');
    setUserAllowedBuildings([]);
  };

  const toggleBuildingSelection = (buildingId: string) => {
    setUserAllowedBuildings(prev =>
      prev.includes(buildingId)
        ? prev.filter(id => id !== buildingId)
        : [...prev, buildingId]
    );
  };

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  if (user.role !== 'admin') return null;

  return (
    <div className="p-4 pt-6 space-y-4 pb-24">
      <header className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Painel Admin</h1>
          <p className="text-muted-foreground text-sm">Gerencie o sistema e os chamados</p>
        </div>
        {isLoadingData && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Carregando...</span>
          </div>
        )}
      </header>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4 mb-4">
          <TabsTrigger value="chamados">Chamados</TabsTrigger>
          <TabsTrigger value="usuarios">Usuários</TabsTrigger>
          <TabsTrigger value="predios">Prédios</TabsTrigger>
          <TabsTrigger value="importar">Importar</TabsTrigger>
        </TabsList>

        {/* CHAMADOS TAB */}
        <TabsContent value="chamados" className="space-y-4">
          {!selectedBuildingId ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {buildings.map(b => {
                // Usar contagem otimizada quando disponível, senão calcular local
                const pendingCount = pendingCounts.get(b.id) ?? 
                  tickets.filter(t => t.buildingId === b.id && !t.isRegistered).length;
                return (
                  <Card
                    key={b.id}
                    className="hover:border-primary cursor-pointer transition-all group overflow-hidden"
                    onClick={() => setSelectedBuildingId(b.id)}
                  >
                    <div className="p-5 flex flex-col h-full">
                      <div className="flex justify-between items-start mb-6">
                        <div className="p-2 bg-muted rounded-lg group-hover:bg-primary/10 transition-colors">
                          <ExternalLink className="w-6 h-6 text-muted-foreground group-hover:text-primary" />
                        </div>
                      </div>

                      {pendingCount > 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center py-4 animate-in zoom-in duration-300">
                          <div className="flex items-center gap-2 px-6 py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-2xl border-2 border-red-200 dark:border-red-800 shadow-lg shadow-red-200/50 dark:shadow-none animate-pulse">
                            <AlertCircle className="w-6 h-6" />
                            <span className="text-2xl font-black uppercase tracking-tighter italic">{pendingCount} PENDENTES</span>
                          </div>
                        </div>
                      )}
                      <h3 className="text-lg font-bold text-foreground line-clamp-1">{b.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{b.address}</p>
                      <div className="mt-auto pt-4 flex justify-between items-center">
                        <span className="text-[10px] font-medium text-muted-foreground">Chamados totais: {tickets.filter(t => t.buildingId === b.id).length}</span>
                        <Button size="sm" variant="ghost" className="h-7 text-[10px] font-bold py-0">ABRIR →</Button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-card p-4 rounded-lg border border-border shadow-sm">
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setSelectedBuildingId(null)} className="h-8 w-8 p-0">
                    <ArrowLeft className="w-4 h-4" />
                  </Button>
                  <div>
                    <h2 className="text-lg font-bold leading-none">{buildings.find(b => b.id === selectedBuildingId)?.name}</h2>
                    <p className="text-[10px] text-muted-foreground mt-1">Gerenciando chamados do prédio</p>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <Button
                    variant={registrationFilter === 'pending' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRegistrationFilter('pending')}
                    className="h-8 text-[10px] font-bold"
                  >
                    Pendentes
                  </Button>
                  <Button
                    variant={registrationFilter === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRegistrationFilter('all')}
                    className="h-8 text-[10px] font-bold"
                  >
                    Todos
                  </Button>
                </div>
              </div>

              <Card className="overflow-hidden border border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm min-w-[1100px] border-collapse">
                    <thead>
                      <tr className="bg-muted/50 border-b border-border">
                        <th className="px-3 py-4 text-left font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Chamado</th>
                        <th className="px-3 py-4 text-left font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Local</th>
                        <th className="px-3 py-4 text-left font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Descrição</th>
                        <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Situação</th>
                        <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Abertura</th>
                        <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Prazo</th>
                        <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50 font-medium">Foto</th>
                        <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {tickets
                        .filter(t => t.buildingId === selectedBuildingId && (registrationFilter === 'all' || !t.isRegistered))
                        .map(ticket => {
                          const ticketUser = users.find(u => u.id === ticket.userId);
                          return (
                            <tr key={ticket.id} className="hover:bg-muted/30 transition-colors bg-background">
                              <td className="px-3 py-4 text-xs font-bold border-x border-border/50">
                                {editingTicketNumberId === ticket.id ? (
                                  <div className="flex items-center gap-1">
                                    <Input
                                      value={editingTicketNumberValue}
                                      onChange={e => setEditingTicketNumberValue(e.target.value)}
                                      placeholder="Número..."
                                      className="h-7 text-xs w-24 px-1.5"
                                      autoFocus
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter') handleSaveTicketNumber(ticket.id);
                                        if (e.key === 'Escape') {
                                          setEditingTicketNumberId(null);
                                          setEditingTicketNumberValue('');
                                        }
                                      }}
                                    />
                                    <Button
                                      size="icon-sm"
                                      onClick={() => handleSaveTicketNumber(ticket.id)}
                                      className="h-7 w-7 bg-green-600 hover:bg-green-700"
                                    >
                                      <Save className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      size="icon-sm"
                                      variant="ghost"
                                      onClick={() => {
                                        setEditingTicketNumberId(null);
                                        setEditingTicketNumberValue('');
                                      }}
                                      className="h-7 w-7"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </Button>
                                  </div>
                                ) : (
                                  <div className="flex items-center gap-1">
                                    {ticket.externalTicketId ? (
                                      <div className="text-blue-600">{ticket.externalTicketId}</div>
                                    ) : (
                                      <div className="text-red-600 tracking-widest font-black text-[10px]">SEM Nº</div>
                                    )}
                                    <button
                                      onClick={() => {
                                        setEditingTicketNumberId(ticket.id);
                                        setEditingTicketNumberValue(ticket.externalTicketId || '');
                                      }}
                                      className="text-muted-foreground hover:text-blue-600 transition-colors"
                                      title={ticket.externalTicketId ? "Editar número" : "Adicionar número"}
                                    >
                                      <Edit2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                )}
                                <div className="text-[9px] text-muted-foreground font-normal mt-0.5">{ticketUser?.name}</div>
                              </td>
                              <td className="px-3 py-4 text-xs border-x border-border/50">{ticket.location}</td>
                              <td className="px-3 py-4 text-xs border-x border-border/50 max-w-[200px]">
                                <p className="line-clamp-2" title={ticket.description}>{ticket.description}</p>
                              </td>
                              <td className="px-3 py-4 text-center border-x border-border/50">
                                <span className={cn(
                                  "px-2 py-0.5 rounded-full text-[10px] font-bold whitespace-nowrap border",
                                  ticket.status === 'itens_apontados' && "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400",
                                  ticket.status === 'em_andamento' && "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/20 dark:text-yellow-400",
                                  ticket.status === 'concluido' && "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-400",
                                  ticket.status === 'improcedente' && "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400",
                                  ticket.status === 'aguardando_vistoria' && "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/20 dark:text-purple-400",
                                  ticket.status === 'f_indevido' && "bg-red-50 text-red-700 border-red-200 dark:bg-red-900/20 dark:text-red-400"
                                )}>
                                  {ticket.status.replace('_', ' ').toUpperCase()}
                                </span>
                              </td>
                              <td className="px-3 py-4 text-center text-[10px] text-muted-foreground border-x border-border/50 font-medium">
                                {formatDate(ticket.createdAt)}
                              </td>
                              <td className="px-3 py-4 text-center border-x border-border/50 font-medium text-xs text-blue-600">
                                {ticket.deadline ? formatDate(ticket.deadline) : '--'}
                              </td>
                              <td className="px-3 py-4 text-center border-x border-border/50">
                                {ticket.photoUrls && ticket.photoUrls.length > 0 && (
                                  <div className="flex flex-col items-center gap-1">
                                    <div
                                      className="relative w-10 h-10 rounded overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
                                      onClick={() => setSelectedTicketForGallery(ticket)}
                                      title={`Clique para ver as ${ticket.photoUrls.length} fotos`}
                                    >
                                      {/* eslint-disable-next-line @next/next/no-img-element */}
                                      <img
                                        src={ticket.photoUrls[0]}
                                        alt="Preview"
                                        className="w-full h-full object-cover group-hover:opacity-75"
                                      />
                                      {ticket.photoUrls.length > 1 && (
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[8px] font-bold">
                                          +{ticket.photoUrls.length - 1}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                              </td>
                              <td className="px-3 py-4 text-center border-x border-border/50">
                                <div className="flex justify-center gap-1">
                                  <Select onValueChange={(val) => handleUpdateTicketStatus(ticket.id, val as Ticket['status'])}>
                                    <SelectTrigger className="h-7 text-[9px] w-24 font-bold bg-muted/50 border-none">
                                      <SelectValue placeholder="STATUS" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="itens_apontados">APONTADOS</SelectItem>
                                      <SelectItem value="em_andamento">ANDAMENTO</SelectItem>
                                      <SelectItem value="concluido">CONCLUÍDO</SelectItem>
                                      <SelectItem value="aguardando_vistoria">VISTORIA</SelectItem>
                                      <SelectItem value="improcedente">IMPROCEDENTE</SelectItem>
                                      <SelectItem value="f_indevido">F.INDEVIDO</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* USUÁRIOS TAB */}
        <TabsContent value="usuarios" className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-lg font-bold">Gerenciar Usuários</h2>
            <Button onClick={() => { setShowUserForm(true); setEditingUser(null); }} size="sm" className="font-bold">
              <Plus className="w-4 h-4 mr-1" /> NOVO USUÁRIO
            </Button>
          </div>

          {showUserForm && (
            <Card className="animate-in slide-in-from-right-4 border-primary/20">
              <CardHeader className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base">{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={cancelForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleUserSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Nome Completo</Label>
                      <Input value={userName} onChange={e => setUserName(e.target.value)} required className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">E-mail de Acesso</Label>
                      <Input type="email" value={userEmail} onChange={e => setUserEmail(e.target.value)} required className="h-9" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Perfil de Acesso</Label>
                      <Select value={userRole} onValueChange={(v) => setUserRole(v as UserRole)}>
                        <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">USUÁRIO COMUM</SelectItem>
                          <SelectItem value="admin">ADMINISTRADOR</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs uppercase font-bold text-muted-foreground">Turma / Equipe</Label>
                      <Input value={userTurma} onChange={e => setUserTurma(e.target.value)} placeholder="Ex: TURMA A" className="h-9" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Prédios Permitidos</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-md p-2 bg-muted/20">
                      {buildings.map(b => (
                        <label key={b.id} className="flex items-center space-x-2 cursor-pointer p-1.5 hover:bg-muted rounded text-xs">
                          <input type="checkbox" checked={userAllowedBuildings.includes(b.id)} onChange={() => toggleBuildingSelection(b.id)} className="rounded" />
                          <span className="truncate">{b.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 font-bold bg-green-600 hover:bg-green-700 text-white">{editingUser ? 'SALVAR ALTERAÇÕES' : 'CRIAR USUÁRIO'}</Button>
                    <Button type="button" variant="outline" onClick={cancelForm} className="font-bold">CANCELAR</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {users.map(u => (
              <Card key={u.id} className="hover:shadow-md transition-shadow">
                <div className="p-4 flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm leading-tight">{u.name}</h3>
                    <p className="text-[11px] text-muted-foreground">{u.email}</p>
                    <div className="flex gap-1.5 mt-2">
                      <span className={cn(
                        "text-[9px] px-1.5 py-0.5 rounded font-black",
                        u.role === 'admin' ? "bg-red-50 text-red-600 dark:bg-red-900/20" : "bg-blue-50 text-blue-600 dark:bg-blue-900/20"
                      )}>{u.role.toUpperCase()}</span>
                      <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded font-black">{u.allowedBuildings.length} PRÉDIOS</span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEditUser(u)} className="h-8 w-8"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteUser(u.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* PRÉDIOS TAB */}
        <TabsContent value="predios" className="space-y-4">
          <div className="flex justify-between items-center px-1">
            <h2 className="text-lg font-bold">Gerenciar Prédios</h2>
            <Button onClick={() => { setShowBuildingForm(true); setEditingBuilding(null); }} size="sm" className="font-bold">
              <Plus className="w-4 h-4 mr-1" /> NOVO PRÉDIO
            </Button>
          </div>

          {showBuildingForm && (
            <Card className="animate-in slide-in-from-right-4 border-primary/20">
              <CardHeader className="p-4 border-b">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-base font-bold">{editingBuilding ? 'Editar Prédio' : 'Novo Prédio'}</CardTitle>
                  <Button variant="ghost" size="sm" onClick={cancelForm}><X className="w-4 h-4" /></Button>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <form onSubmit={handleBuildingSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Nome do Empreendimento</Label>
                    <Input value={buildingName} onChange={e => setBuildingName(e.target.value)} required className="h-9" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs uppercase font-bold text-muted-foreground">Endereço Completo</Label>
                    <Input value={buildingAddress} onChange={e => setBuildingAddress(e.target.value)} required className="h-9" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button type="submit" className="flex-1 font-bold">{editingBuilding ? 'SALVAR ALTERAÇÕES' : 'CRIAR PRÉDIO'}</Button>
                    <Button type="button" variant="outline" onClick={cancelForm} className="font-bold">CANCELAR</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {buildings.map(b => (
              <Card key={b.id} className="hover:shadow-md transition-shadow">
                <div className="p-4 flex justify-between items-start">
                  <div className="space-y-1">
                    <h3 className="font-bold text-sm leading-tight">{b.name}</h3>
                    <p className="text-[11px] text-muted-foreground line-clamp-2">{b.address}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => startEditBuilding(b)} className="h-8 w-8"><Edit2 className="w-4 h-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDeleteBuilding(b.id)} className="h-8 w-8 text-red-500"><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* IMPORTAR TAB */}
        <TabsContent value="importar" className="space-y-4">
          <ImportTickets
            buildings={buildings}
            userId={user?.id || ''}
            onImportComplete={loadData}
          />
        </TabsContent>
      </Tabs>
      {/* Gallery Modal */}
      {selectedTicketForGallery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-white/10 bg-zinc-950 text-white">
            <CardHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between bg-zinc-900">
              <div>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  Galeria de Evidências
                  <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full font-bold uppercase">
                    {selectedTicketForGallery.photoUrls.length} Fotos
                  </span>
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider">Local:</span>
                  <p className="text-zinc-400 text-[11px]">{selectedTicketForGallery.location}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => downloadAllPhotos(selectedTicketForGallery)}
                  variant="outline"
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white border-none font-bold gap-2 hidden sm:flex"
                >
                  <Download className="w-4 h-4" /> BAIXAR TODAS
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSelectedTicketForGallery(null)}
                  className="text-white hover:bg-white/10"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto bg-zinc-950">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {selectedTicketForGallery.photoUrls.map((url, index) => (
                  <Card key={index} className="overflow-hidden border-white/5 bg-zinc-900 group">
                    <div className="relative aspect-square">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={url}
                        alt={`Evidência ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Button
                          onClick={() => downloadPhoto(url, selectedTicketForGallery.id, index)}
                          size="sm"
                          className="font-bold gap-2"
                        >
                          <Download className="w-4 h-4" /> BAIXAR ESTA
                        </Button>
                      </div>
                    </div>
                    <div className="p-2 text-center border-t border-white/5">
                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Foto {index + 1}</span>
                    </div>
                  </Card>
                ))}
              </div>

              <div className="mt-8 flex justify-center sm:hidden">
                <Button
                  onClick={() => downloadAllPhotos(selectedTicketForGallery)}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold gap-2"
                >
                  <Download className="w-4 h-4" /> BAIXAR TODAS AS FOTOS
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
