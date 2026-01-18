"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/data';
import { Ticket, Building, User } from '@/lib/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Download, Save, X, Trash2, Sun, Moon, Edit2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  Legend
} from 'recharts';

type TicketStatus = Ticket['status'] | 'todos';

const STATUS_CONFIG = {
  itens_apontados: { label: 'Itens Apontados', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400', chartColor: '#3b82f6' },
  em_andamento: { label: 'Em andamento', color: 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400', chartColor: '#eab308' },
  improcedente: { label: 'Improcedente', color: 'bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400', chartColor: '#f97316' },
  aguardando_vistoria: { label: 'Aguardando vistoria', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400', chartColor: '#a855f7' },
  concluido: { label: 'Concluído', color: 'bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-400', chartColor: '#22c55e' },
  f_indevido: { label: 'F. Indevido', color: 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400', chartColor: '#ef4444' },
};

export default function ChamadosPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<TicketStatus>('todos');
  const [selectedBuilding, setSelectedBuilding] = useState<string>('todos');
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Ticket>>({});
  const [selectedTicketForGallery, setSelectedTicketForGallery] = useState<Ticket | null>(null);
  const [editingTicketNumberId, setEditingTicketNumberId] = useState<string | null>(null);
  const [editingTicketNumberValue, setEditingTicketNumberValue] = useState('');
  const [reprogrammingReason, setReprogrammingReason] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [searchTicketNumber, setSearchTicketNumber] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    if (user) {
      try {
        const [userTickets, userBuildings, allUsers] = await Promise.all([
          dataService.getTicketsForUser(user),
          dataService.getBuildingsForUser(user),
          dataService.getUsers()
        ]);

        // Debug: mostrar tickets com histórico de reprogramação
        const ticketsWithHistory = userTickets.filter(t => t.reprogrammingHistory && t.reprogrammingHistory.length > 0);
        if (ticketsWithHistory.length > 0) {
          console.log('📥 CARREGADOS do banco - Tickets com histórico:', ticketsWithHistory.map(t => ({
            id: t.externalTicketId || t.id.substring(0, 8),
            historyLength: t.reprogrammingHistory?.length,
            history: t.reprogrammingHistory
          })));
        } else {
          console.log('📥 CARREGADOS do banco - Nenhum ticket com histórico encontrado');
        }

        setTickets(userTickets);
        setBuildings(userBuildings);
        setUsers(allUsers);
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('Erro ao carregar dados.');
      }
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '--';

    // Se for formato YYYY-MM-DD, converter manualmente para evitar problemas de timezone
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }

    // Para outros formatos, usar Date
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '--';

    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const downloadPhoto = (photoUrl: string, ticketId: string, index?: number) => {
    const link = document.createElement('a');
    link.href = photoUrl;
    link.download = `chamado-${ticketId.slice(0, 8)}${index !== undefined ? `-${index + 1}` : ''}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success(`Foto ${index !== undefined ? index + 1 : ''} baixada com sucesso!`);
  };

  const downloadAllPhotos = (ticket: Ticket) => {
    ticket.photoUrls.forEach((url, index) => {
      setTimeout(() => {
        downloadPhoto(url, ticket.id, index);
      }, index * 500); // Small delay to avoid browser blocking multiple downloads
    });
    toast.success('Iniciando download de todas as fotos...');
  };

  const startEdit = (ticket: Ticket) => {
    setEditingTicketId(ticket.id);
    setEditForm({
      buildingId: ticket.buildingId,
      location: ticket.location,
      description: ticket.description,
      status: ticket.status,
      deadline: ticket.deadline,
      reprogrammingDate: ticket.reprogrammingDate,
      constructorReturn: ticket.constructorReturn,
      responsible: ticket.responsible,
    });
  };

  const cancelEdit = () => {
    setEditingTicketId(null);
    setEditForm({});
    setReprogrammingReason('');
  };

  const saveEdit = async () => {
    if (!editingTicketId) return;

    const originalTicket = tickets.find(t => t.id === editingTicketId);
    if (!originalTicket) return;

    // Verificar se mudou a data de reprogramação
    const hasReprogrammingChange = editForm.reprogrammingDate && editForm.reprogrammingDate !== originalTicket.reprogrammingDate;

    // Se mudou a reprogramação, exigir motivo
    if (hasReprogrammingChange && !reprogrammingReason.trim()) {
      toast.error('Informe o motivo da reprogramação!');
      return;
    }

    // Lógica de histórico de reprogramação
    let updatedHistory = originalTicket.reprogrammingHistory || [];
    if (hasReprogrammingChange) {
      const newEntry = {
        date: editForm.reprogrammingDate!,
        reason: reprogrammingReason.trim(),
        updatedAt: new Date().toISOString()
      };

      console.log('💾 SALVANDO Nova Entrada de Reprogramação:', {
        newEntry,
        newEntryStringified: JSON.stringify(newEntry),
        reprogrammingDate: editForm.reprogrammingDate,
        reprogrammingReason: reprogrammingReason.trim(),
        historyBefore: updatedHistory.length,
        historyAfter: updatedHistory.length + 1
      });

      updatedHistory = [...updatedHistory, newEntry];
    }

    try {
      await dataService.updateTicket(editingTicketId, {
        ...editForm,
        reprogrammingHistory: updatedHistory
      });

      await loadData();
      setEditingTicketId(null);
      setEditForm({});
      setReprogrammingReason('');
      toast.success('Chamado atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar chamado.');
    }
  };

  const deleteTicket = async (ticketId: string) => {
    if (confirm('Tem certeza que deseja excluir este chamado?')) {
      try {
        await dataService.deleteTicket(ticketId);
        await loadData();
        toast.success('Chamado excluído com sucesso!');
      } catch (error) {
        toast.error('Erro ao excluir chamado.');
      }
    }
  };

  const handleSaveTicketNumber = async (ticketId: string) => {
    if (!editingTicketNumberValue.trim()) {
      toast.error('Informe o número do chamado');
      return;
    }
    try {
      await dataService.updateTicket(ticketId, {
        externalTicketId: editingTicketNumberValue,
        isRegistered: true
      });
      setEditingTicketNumberId(null);
      setEditingTicketNumberValue('');
      await loadData();
      toast.success('Número atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar número.');
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const statusMatch = selectedStatus === 'todos' || ticket.status === selectedStatus;
    const buildingMatch = selectedBuilding === 'todos' || ticket.buildingId === selectedBuilding;

    // Filtro de data específica
    const dateMatch = selectedDate === 'todos' ||
      (ticket.createdAt && ticket.createdAt.split('T')[0] === selectedDate);

    // Filtro de mês
    const monthMatch = selectedMonth === 'todos' ||
      (ticket.createdAt && ticket.createdAt.substring(0, 7) === selectedMonth);

    // Filtro de número
    const numberMatch = !searchTicketNumber ||
      (ticket.externalTicketId && ticket.externalTicketId.toLowerCase().includes(searchTicketNumber.toLowerCase()));

    // Filtro de palavra-chave (busca em descrição e localização)
    const keywordMatch = !searchKeyword ||
      (ticket.description && ticket.description.toLowerCase().includes(searchKeyword.toLowerCase())) ||
      (ticket.location && ticket.location.toLowerCase().includes(searchKeyword.toLowerCase()));

    return statusMatch && buildingMatch && dateMatch && monthMatch && numberMatch && keywordMatch;
  });

  const ticketsByStatus = {
    todos: filteredTickets.length,
    itens_apontados: filteredTickets.filter(t => t.status === 'itens_apontados').length,
    em_andamento: filteredTickets.filter(t => t.status === 'em_andamento').length,
    improcedente: filteredTickets.filter(t => t.status === 'improcedente').length,
    aguardando_vistoria: filteredTickets.filter(t => t.status === 'aguardando_vistoria').length,
    concluido: filteredTickets.filter(t => t.status === 'concluido').length,
    f_indevido: filteredTickets.filter(t => t.status === 'f_indevido').length,
  };

  const chartData = Object.entries(STATUS_CONFIG)
    .map(([key, config]) => ({
      name: config.label,
      value: ticketsByStatus[key as keyof typeof ticketsByStatus],
      color: config.chartColor
    }))
    .filter(item => item.value > 0);

  // Gerar lista de meses disponíveis a partir dos tickets
  const availableMonths = Array.from(new Set(
    tickets
      .filter(t => t.createdAt)
      .map(t => t.createdAt.substring(0, 7))
  )).sort((a, b) => b.localeCompare(a)); // Ordem decrescente (mais recente primeiro)

  const isAdmin = user?.role === 'admin';

  if (isLoading || !user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 pt-6 space-y-4 pb-24">
      <header className="grid grid-cols-3 items-center mb-6">
        <div className="text-left">
          <h1 className="text-2xl font-bold text-foreground">Meus Chamados</h1>
        </div>

        <div className="text-center">
          <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-tighter">
            {selectedBuilding === 'todos'
              ? 'Todos os Prédios'
              : buildings.find(b => b.id === selectedBuilding)?.name || 'N/A'}
          </h2>
        </div>

        <div className="flex items-center justify-end gap-3">
          <div className="flex items-center gap-2 pr-2 border-r border-border mr-1">
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-black uppercase text-foreground leading-none">{user.name}</span>
              <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">{user.role}</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-background">
              {user.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <ThemeToggle />
          <Button onClick={loadData} variant="outline" size="sm" className="h-8 w-8 p-0">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Dashboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo de Chamados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Status List */}
            <div className="space-y-3">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = key === 'itens_apontados' ? ticketsByStatus.todos : ticketsByStatus[key as keyof typeof ticketsByStatus];
                const percentage = ticketsByStatus.todos > 0 ? (count / ticketsByStatus.todos) * 100 : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-foreground">{config.label}</span>
                      <span className="text-sm font-bold text-foreground">{count}</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all duration-300"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: config.chartColor
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie Chart */}
            <div className="h-[250px] w-full">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip />
                    <Legend verticalAlign="bottom" height={36} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                  Sem dados para o gráfico
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-2">
        <Select value={selectedStatus} onValueChange={(value) => setSelectedStatus(value as TicketStatus)}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos ({ticketsByStatus.todos})</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
              <SelectItem key={key} value={key}>
                {config.label} ({ticketsByStatus[key as keyof typeof ticketsByStatus]})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {buildings.length > 1 && (
          <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Prédio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os prédios</SelectItem>
              {buildings.map(b => (
                <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Month Filter */}
        <Select value={selectedMonth} onValueChange={setSelectedMonth}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Filtrar por mês" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os meses</SelectItem>
            {availableMonths.map(month => {
              const [year, monthNum] = month.split('-');
              const monthName = new Date(parseInt(year), parseInt(monthNum) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
              return (
                <SelectItem key={month} value={month}>
                  {monthName.charAt(0).toUpperCase() + monthName.slice(1)}
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>

        {/* Data Filter */}
        <div className="flex gap-1">
          <Input
            type="date"
            value={selectedDate === 'todos' ? '' : selectedDate}
            onChange={(e) => setSelectedDate(e.target.value || 'todos')}
            className="flex-1"
            placeholder="Data específica"
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSelectedDate('todos')}
            disabled={selectedDate === 'todos'}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Number Filter */}
        <Input
          type="text"
          value={searchTicketNumber}
          onChange={(e) => setSearchTicketNumber(e.target.value)}
          placeholder="Buscar nº chamado..."
          className="flex-1"
        />

        {/* Keyword Filter */}
        <Input
          type="text"
          value={searchKeyword}
          onChange={(e) => setSearchKeyword(e.target.value)}
          placeholder="Buscar palavra-chave..."
          className="flex-1"
        />
      </div>

      {/* Table */}
      {filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum chamado encontrado</p>
          </CardContent>
        </Card>
      ) : (
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
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider text-blue-600 dark:text-blue-400 border-x border-border/50">Prazo</th>
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider text-orange-600 dark:text-orange-400 border-x border-border/50">Reprogramação</th>
                  <th className="px-3 py-4 text-left font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Retorno</th>
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Responsável</th>
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Foto</th>
                  {isAdmin && <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Ações</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredTickets.map(ticket => {
                  const building = buildings.find(b => b.id === ticket.buildingId);
                  const isEditing = editingTicketId === ticket.id;
                  const statusConfig = STATUS_CONFIG[ticket.status];

                  return (
                    <tr
                      key={ticket.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors border-b border-border bg-background cursor-pointer",
                        isEditing && "bg-accent/50"
                      )}
                      onClick={() => {
                        if (isAdmin && !isEditing && !editingTicketNumberId) {
                          startEdit(ticket);
                        } else if (!isAdmin) {
                          setViewingTicket(ticket);
                        }
                      }}
                    >
                      <td className="px-3 py-4 font-bold text-xs border-x border-border/50" onClick={(e) => e.stopPropagation()}>
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
                              <span className="text-blue-600 dark:text-blue-400">{ticket.externalTicketId}</span>
                            ) : (
                              <span className="text-red-600 dark:text-red-500 tracking-widest font-black text-[10px]">SEM Nº</span>
                            )}
                            {isAdmin && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingTicketNumberId(ticket.id);
                                  setEditingTicketNumberValue(ticket.externalTicketId || '');
                                }}
                                className="text-muted-foreground hover:text-blue-600 transition-colors"
                                title={ticket.externalTicketId ? "Editar número" : "Adicionar número"}
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 border-x border-border/50" onClick={(e) => isAdmin && isEditing && e.stopPropagation()}>
                        {isAdmin && isEditing ? (
                          <Input
                            value={editForm.location || ''}
                            onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                            className="h-8 text-xs bg-background"
                          />
                        ) : (
                          <div className="text-foreground text-xs truncate max-w-[120px]" title={ticket.location}>{ticket.location}</div>
                        )}
                      </td>

                      <td className="px-3 py-4 border-x border-border/50" onClick={(e) => isAdmin && isEditing && e.stopPropagation()}>
                        {isAdmin && isEditing ? (
                          <Textarea
                            value={editForm.description || ''}
                            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                            className="min-h-[60px] text-xs bg-background"
                          />
                        ) : (
                          <div className="text-muted-foreground text-xs line-clamp-2 cursor-help" title={ticket.description}>
                            {ticket.description}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 text-center border-x border-border/50" onClick={(e) => isAdmin && isEditing && e.stopPropagation()}>
                        {isAdmin && isEditing ? (
                          <Select
                            value={editForm.status}
                            onValueChange={(value) => setEditForm({ ...editForm, status: value as Ticket['status'] })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <SelectItem key={key} value={key}>{config.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <span className={cn(
                            "inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                            statusConfig.color
                          )}>
                            {statusConfig.label}
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-4 text-center text-muted-foreground text-xs border-x border-border/50">
                        {formatDate(ticket.createdAt)}
                      </td>

                      <td className="px-3 py-4 text-center border-x border-border/50" onClick={(e) => isAdmin && isEditing && e.stopPropagation()}>
                        {isAdmin && isEditing ? (
                          <Input
                            type="date"
                            value={editForm.deadline?.split('T')[0] || ''}
                            onChange={(e) => setEditForm({ ...editForm, deadline: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                            className="h-8 text-xs bg-background w-32 mx-auto"
                          />
                        ) : (
                          <div className="text-blue-600 dark:text-blue-400 font-medium">
                            {ticket.deadline ? formatDate(ticket.deadline) : '--'}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 text-center border-x border-border/50" onClick={(e) => isAdmin && isEditing && e.stopPropagation()}>
                        {isAdmin && isEditing ? (
                          <div className="space-y-2">
                            <Input
                              type="date"
                              value={editForm.reprogrammingDate?.split('T')[0] || ''}
                              onChange={(e) => setEditForm({ ...editForm, reprogrammingDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                              className="h-8 text-xs bg-background w-32 mx-auto"
                            />
                            {editForm.reprogrammingDate && editForm.reprogrammingDate !== ticket.reprogrammingDate && (
                              <Textarea
                                value={reprogrammingReason}
                                onChange={(e) => setReprogrammingReason(e.target.value)}
                                className="min-h-[50px] text-xs bg-background"
                                placeholder="Motivo da reprogramação..."
                              />
                            )}
                          </div>
                        ) : (
                          <div className="space-y-1">
                            {ticket.reprogrammingDate && (
                              <div className="text-orange-600 dark:text-orange-400 font-bold">
                                {formatDate(ticket.reprogrammingDate)}
                              </div>
                            )}
                            {ticket.reprogrammingHistory && ticket.reprogrammingHistory.length > 0 && (
                              <div
                                className="flex justify-center items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 font-medium cursor-help relative group"
                                title="Ver histórico de reprogramações"
                              >
                                <span className="w-4 h-4 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center font-bold text-[10px]">!</span>
                                Reprogramado {ticket.reprogrammingHistory.length}x

                                {/* Tooltip com histórico */}
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-64 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                                  <div className="text-xs font-bold mb-2 text-gray-900 dark:text-gray-100">Histórico de Reprogramações:</div>
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {ticket.reprogrammingHistory.map((entry: any, index: number) => {
                                      const isObject = typeof entry === 'object' && entry.date;
                                      const date = isObject ? entry.date : entry;
                                      const reason = isObject ? entry.reason : '';

                                      // Debug no console com detalhes completos
                                      console.log(`🔍 DEBUG Entry [${index}]:`);
                                      console.log(`   - Type: ${typeof entry}`);
                                      console.log(`   - Keys: ${entry && typeof entry === 'object' ? Object.keys(entry).join(', ') : 'N/A'}`);
                                      console.log(`   - Full JSON: ${JSON.stringify(entry)}`);
                                      console.log(`   - isObject: ${isObject}`);
                                      console.log(`   - date extracted: ${date}`);
                                      console.log(`   - reason extracted: ${reason}`);
                                      console.log(`   - formatted: ${formatDate(date)}`);

                                      return (
                                        <div key={index} className="text-amber-700 dark:text-amber-300 pb-2 border-b border-gray-200 dark:border-gray-700 last:border-0">
                                          <div className="font-semibold">{formatDate(date)}</div>
                                          {reason && <div className="text-[10px] mt-1 text-gray-600 dark:text-gray-400">{reason}</div>}
                                        </div>
                                      );
                                    })}
                                  </div>
                                  {/* Seta do tooltip */}
                                  <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-8 border-l-transparent border-r-8 border-r-transparent border-t-8 border-t-white dark:border-t-gray-800"></div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 text-muted-foreground text-xs border-x border-border/50" onClick={(e) => isAdmin && isEditing && e.stopPropagation()}>
                        {isAdmin && isEditing ? (
                          <Textarea
                            value={editForm.constructorReturn || ''}
                            onChange={(e) => setEditForm({ ...editForm, constructorReturn: e.target.value })}
                            className="min-h-[60px] text-xs bg-background"
                            placeholder="Retorno da construtora..."
                          />
                        ) : (
                          <div className="max-w-[250px] text-xs">
                            {/* Retorno da construtora */}
                            <div className="truncate cursor-help" title={ticket.constructorReturn || ''}>
                              {ticket.constructorReturn || '--'}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 text-center border-x border-border/50" onClick={(e) => isAdmin && isEditing && e.stopPropagation()}>
                        {isAdmin && isEditing ? (
                          <Select
                            value={editForm.responsible || 'none'}
                            onValueChange={(value) => setEditForm({ ...editForm, responsible: value === 'none' ? undefined : value as 'Condomínio' | 'Construtora' })}
                          >
                            <SelectTrigger className="h-8 text-xs bg-background">
                              <SelectValue placeholder="Selecione..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">--</SelectItem>
                              <SelectItem value="Condomínio">Condomínio</SelectItem>
                              <SelectItem value="Construtora">Construtora</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <div className="text-xs font-medium">
                            {ticket.responsible || '--'}
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-4 border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        {ticket.photoUrls && ticket.photoUrls.length > 0 && (
                          <div className="flex flex-col items-center gap-1">
                            <div
                              className="relative w-16 h-16 rounded-md overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all group"
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
                                <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-[10px] font-bold">
                                  +{ticket.photoUrls.length - 1}
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </td>

                      {isAdmin && (
                        <td className="px-3 py-4 border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                          {isEditing ? (
                            <div className="flex gap-1 justify-center">
                              <button
                                onClick={saveEdit}
                                className="p-1.5 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                                title="Salvar"
                              >
                                <Save className="w-4 h-4" />
                              </button>
                              <button
                                onClick={cancelEdit}
                                className="p-1.5 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors dark:bg-muted dark:text-foreground"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <button
                                onClick={() => deleteTicket(ticket.id)}
                                className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {/* View Ticket Modal (Read-only for non-admin users) */}
      {viewingTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  Detalhes do Chamado
                  {viewingTicket.externalTicketId && (
                    <span className="text-sm bg-blue-600 text-white px-2 py-0.5 rounded-full font-bold">
                      Nº {viewingTicket.externalTicketId}
                    </span>
                  )}
                </CardTitle>
                <p className="text-muted-foreground text-xs mt-1">
                  {buildings.find(b => b.id === viewingTicket.buildingId)?.name || 'Prédio não encontrado'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setViewingTicket(null)}
                className="hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 overflow-y-auto space-y-4">
              {/* Localização */}
              <div>
                <label className="text-sm font-semibold text-foreground">Localização</label>
                <p className="text-sm text-muted-foreground mt-1">{viewingTicket.location || '--'}</p>
              </div>

              {/* Descrição */}
              <div>
                <label className="text-sm font-semibold text-foreground">Descrição</label>
                <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{viewingTicket.description || '--'}</p>
              </div>

              {/* Status */}
              <div>
                <label className="text-sm font-semibold text-foreground">Status</label>
                <div className="mt-1">
                  <span className={cn(
                    "inline-block px-3 py-1 rounded-full text-xs font-medium",
                    STATUS_CONFIG[viewingTicket.status].color
                  )}>
                    {STATUS_CONFIG[viewingTicket.status].label}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Data de Criação */}
                <div>
                  <label className="text-sm font-semibold text-foreground">Data de Criação</label>
                  <p className="text-sm text-muted-foreground mt-1">{formatDate(viewingTicket.createdAt)}</p>
                </div>

                {/* Prazo */}
                <div>
                  <label className="text-sm font-semibold text-foreground">Prazo</label>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">
                    {viewingTicket.deadline ? formatDate(viewingTicket.deadline) : '--'}
                  </p>
                </div>

                {/* Data de Reprogramação */}
                {viewingTicket.reprogrammingDate && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Reprogramado para</label>
                    <p className="text-sm text-orange-600 dark:text-orange-400 mt-1 font-medium">
                      {formatDate(viewingTicket.reprogrammingDate)}
                    </p>
                  </div>
                )}

                {/* Responsável */}
                {viewingTicket.responsible && (
                  <div>
                    <label className="text-sm font-semibold text-foreground">Responsável</label>
                    <p className="text-sm text-muted-foreground mt-1">{viewingTicket.responsible}</p>
                  </div>
                )}
              </div>

              {/* Retorno da Construtora */}
              {viewingTicket.constructorReturn && (
                <div>
                  <label className="text-sm font-semibold text-foreground">Retorno da Construtora</label>
                  <p className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{viewingTicket.constructorReturn}</p>
                </div>
              )}

              {/* Histórico de Reprogramações */}
              {viewingTicket.reprogrammingHistory && viewingTicket.reprogrammingHistory.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-foreground">Histórico de Reprogramações</label>
                  <div className="mt-2 space-y-2">
                    {viewingTicket.reprogrammingHistory.map((item, index) => (
                      <Card key={index} className="p-3 bg-muted/50">
                        <div className="flex justify-between items-start gap-2">
                          <div className="flex-1">
                            <p className="text-xs text-muted-foreground">
                              <span className="font-semibold">Data:</span> {formatDate(item.date)}
                            </p>
                            {item.reason && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-semibold">Motivo:</span> {item.reason}
                              </p>
                            )}
                          </div>
                          <span className="text-[10px] bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">
                            #{index + 1}
                          </span>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Fotos */}
              {viewingTicket.photoUrls && viewingTicket.photoUrls.length > 0 && (
                <div>
                  <label className="text-sm font-semibold text-foreground">Evidências ({viewingTicket.photoUrls.length} fotos)</label>
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {viewingTicket.photoUrls.map((url, index) => (
                      <div
                        key={index}
                        className="relative aspect-square rounded-md overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        onClick={() => {
                          setViewingTicket(null);
                          setSelectedTicketForGallery(viewingTicket);
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`Evidência ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-[10px] text-center py-1">
                          Foto {index + 1}
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 text-center">
                    Clique em uma foto para ver todas em tamanho maior
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Gallery Modal */}
      {selectedTicketForGallery && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border-white/10 bg-zinc-950">
            <CardHeader className="p-4 border-b border-white/10 flex flex-row items-center justify-between bg-zinc-900">
              <div>
                <CardTitle className="text-white text-lg flex items-center gap-2">
                  Evidências do Chamado
                  <span className="text-xs bg-blue-600 px-2 py-0.5 rounded-full font-bold">
                    {selectedTicketForGallery.photoUrls.length} FOTOS
                  </span>
                </CardTitle>
                <p className="text-zinc-400 text-xs mt-1">{selectedTicketForGallery.location}</p>
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

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <Button variant="outline" size="sm" className="w-9 px-0"><Sun className="w-4 h-4" /></Button>;

  return (
    <Button
      variant="outline"
      size="sm"
      className="w-9 px-0"
      onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
      title={theme === 'dark' ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
    >
      {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </Button>
  );
}
