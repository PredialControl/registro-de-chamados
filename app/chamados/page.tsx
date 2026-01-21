"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/data';
import { Ticket, Building, User } from '@/lib/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Download, Save, X, Trash2, Sun, Moon, Edit2, FileSpreadsheet } from 'lucide-react';
import * as XLSX from 'xlsx';
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
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid
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
  const [selectedTicketForGallery, setSelectedTicketForGallery] = useState<Ticket | null>(null);
  const [editingTicketNumberId, setEditingTicketNumberId] = useState<string | null>(null);
  const [editingTicketNumberValue, setEditingTicketNumberValue] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [searchTicketNumber, setSearchTicketNumber] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Edição em lote - SEMPRE ATIVO para edição rápida tipo planilha
  const [batchEdits, setBatchEdits] = useState<Map<string, Partial<Ticket>>>(new Map());
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);

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
      setIsLoadingData(true);
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
      } finally {
        setIsLoadingData(false);
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

  const exportToExcel = () => {
    try {
      // Preparar dados para exportação
      const exportData = filteredTickets.map(ticket => {
        const building = buildings.find(b => b.id === ticket.buildingId);
        const statusLabel = STATUS_CONFIG[ticket.status]?.label || ticket.status;

        return {
          'Nº Chamado': ticket.externalTicketId || 'SEM Nº',
          'Prédio': building?.name || 'N/A',
          'Local': ticket.location || '',
          'Descrição': ticket.description || '',
          'Situação': statusLabel,
          'Abertura': ticket.createdAt ? formatDate(ticket.createdAt) : '--',
          'Prazo': ticket.deadline ? formatDate(ticket.deadline) : '--',
          'Reprogramação': ticket.reprogrammingDate ? formatDate(ticket.reprogrammingDate) : '--',
          'Retorno Construtora': ticket.constructorReturn || '--',
          'Responsável': ticket.responsible || '--',
        };
      });

      // Criar workbook
      const ws = XLSX.utils.json_to_sheet(exportData);

      // Definir largura das colunas
      const colWidths = [
        { wch: 15 }, // Nº Chamado
        { wch: 25 }, // Prédio
        { wch: 20 }, // Local
        { wch: 50 }, // Descrição
        { wch: 18 }, // Situação
        { wch: 12 }, // Abertura
        { wch: 12 }, // Prazo
        { wch: 15 }, // Reprogramação
        { wch: 40 }, // Retorno
        { wch: 15 }, // Responsável
      ];
      ws['!cols'] = colWidths;

      // Criar workbook e adicionar worksheet
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Chamados');

      // Gerar nome do arquivo
      const buildingName = selectedBuilding === 'todos'
        ? 'Todos_Predios'
        : buildings.find(b => b.id === selectedBuilding)?.name.replace(/\s/g, '_') || 'Chamados';
      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `Chamados_${buildingName}_${date}.xlsx`;

      // Fazer download
      XLSX.writeFile(wb, fileName);

      toast.success(`Planilha "${fileName}" baixada com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar:', error);
      toast.error('Erro ao gerar planilha');
    }
  };

  const downloadAllPhotos = (ticket: Ticket) => {
    ticket.photoUrls.forEach((url, index) => {
      setTimeout(() => {
        downloadPhoto(url, ticket.id, index);
      }, index * 500); // Small delay to avoid browser blocking multiple downloads
    });
    toast.success('Iniciando download de todas as fotos...');
  };

  const cancelAllBatchEdits = () => {
    if (confirm('Descartar TODAS as alterações não salvas?')) {
      setBatchEdits(new Map());
    }
  };

  const saveBatchEdits = async () => {
    if (batchEdits.size === 0) {
      toast.error('Nenhuma alteração para salvar');
      return;
    }

    setIsSavingBatch(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Salvar todas as alterações em paralelo (RÁPIDO!)
      const savePromises = Array.from(batchEdits.entries()).map(async ([ticketId, editData]) => {
        try {
          await dataService.updateTicket(ticketId, editData);
          successCount++;
        } catch (error) {
          errorCount++;
          console.error(`Erro ao salvar chamado ${ticketId}:`, error);
        }
      });

      await Promise.all(savePromises);

      // Recarregar dados
      await loadData();

      // Limpar edições
      setBatchEdits(new Map());

      if (errorCount === 0) {
        toast.success(`✅ ${successCount} chamado(s) salvos!`);
      } else {
        toast.warning(`${successCount} salvos, ${errorCount} com erro`);
      }
    } catch (error) {
      console.error('Erro ao salvar edições:', error);
      toast.error('Erro ao salvar alterações');
    } finally {
      setIsSavingBatch(false);
    }
  };


  const deleteTicket = async (ticketId: string) => {
    if (confirm('Tem certeza que deseja excluir este chamado?')) {
      try {
        console.log('🗑️ Tentando excluir chamado:', ticketId);
        await dataService.deleteTicket(ticketId);
        console.log('✅ Chamado excluído com sucesso!');
        await loadData();
        toast.success('Chamado excluído com sucesso!');
      } catch (error: any) {
        console.error('❌ Erro ao excluir chamado:', error);
        const errorMessage = error?.message || 'Erro desconhecido ao excluir chamado.';
        toast.error(errorMessage);
        alert(`ERRO AO EXCLUIR:\n\n${errorMessage}\n\nVerifique o console (F12) para mais detalhes.`);
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

  // Paginação
  const totalPages = Math.ceil(filteredTickets.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTickets = filteredTickets.slice(startIndex, endIndex);

  // Reset para página 1 quando filtros mudarem
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 0);
    return () => clearTimeout(timer);
  }, [selectedStatus, selectedBuilding, selectedDate, selectedMonth, searchTicketNumber, searchKeyword]);

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

  // Dados por responsável
  const ticketsByResponsible = {
    construtora: filteredTickets.filter(t => t.responsible === 'Construtora').length,
    condominio: filteredTickets.filter(t => t.responsible === 'Condomínio').length,
    naoDefinido: filteredTickets.filter(t => !t.responsible).length,
  };

  const responsibleChartData = [
    {
      name: 'Construtora',
      value: ticketsByResponsible.construtora,
      color: '#ef4444' // vermelho
    },
    {
      name: 'Condomínio',
      value: ticketsByResponsible.condominio,
      color: '#3b82f6' // azul
    },
    ...(ticketsByResponsible.naoDefinido > 0 ? [{
      name: 'Não Definido',
      value: ticketsByResponsible.naoDefinido,
      color: '#9ca3af' // cinza
    }] : [])
  ];

  // Gerar lista de meses disponíveis a partir dos tickets
  const availableMonths = Array.from(new Set(
    tickets
      .filter(t => t.createdAt)
      .map(t => t.createdAt.substring(0, 7))
  )).sort((a, b) => b.localeCompare(a)); // Ordem decrescente (mais recente primeiro)

  const isAdmin = user?.role === 'admin';

  if (isLoading || !user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="relative">
          <div className="absolute inset-0 bg-blue-600 rounded-full blur-xl opacity-20 animate-pulse"></div>
          <Loader2 className="animate-spin w-16 h-16 text-blue-600 relative z-10" />
        </div>
        <div className="text-center space-y-2">
          <p className="text-xl font-bold text-foreground">Carregando chamados...</p>
          <p className="text-sm text-muted-foreground">Por favor, aguarde</p>
        </div>
      </div>
    );
  }

  if (isLoadingData) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-6 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="relative">
          {/* Círculo externo pulsante */}
          <div className="absolute inset-0 bg-blue-600 rounded-full blur-2xl opacity-30 animate-pulse"></div>

          {/* Círculo do meio */}
          <div className="absolute inset-2 bg-blue-500 rounded-full blur-lg opacity-20 animate-ping"></div>

          {/* Ícone de loading */}
          <Loader2 className="animate-spin w-20 h-20 text-blue-600 relative z-10" strokeWidth={2.5} />
        </div>

        <div className="text-center space-y-3 max-w-md px-4">
          <h2 className="text-2xl font-bold text-foreground">Carregando Chamados</h2>
          <p className="text-base text-muted-foreground">Estamos buscando todos os chamados do sistema...</p>

          {/* Barra de progresso animada */}
          <div className="w-64 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-4">
            <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full animate-loading-bar"></div>
          </div>
        </div>

        <style jsx>{`
          @keyframes loading-bar {
            0% {
              width: 0%;
              margin-left: 0%;
            }
            50% {
              width: 75%;
              margin-left: 0%;
            }
            100% {
              width: 0%;
              margin-left: 100%;
            }
          }
          .animate-loading-bar {
            animation: loading-bar 2s ease-in-out infinite;
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="p-4 pt-6 space-y-4 pb-24">
      <header className="mb-6 space-y-3">
        {/* Linha 1: Logo/Título + Controles no mobile e desktop */}
        <div className="flex items-center justify-between gap-4">
          {/* Logo e Título */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center shadow-lg">
              <svg className="w-6 h-6 md:w-7 md:h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg md:text-2xl font-bold text-foreground leading-none">Chamados</h1>
              <p className="text-[10px] md:text-xs text-muted-foreground leading-none mt-0.5">Sistema de Gestão</p>
            </div>
          </div>

          {/* Controles do usuário */}
          <div className="flex items-center gap-2 md:gap-3">
            <div className="hidden md:flex items-center gap-2 pr-2 border-r border-border mr-1">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black uppercase text-foreground leading-none">{user.name}</span>
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">{user.role}</span>
              </div>
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-background">
                {user.name.charAt(0).toUpperCase()}
              </div>
            </div>
            <div className="md:hidden w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-sm shadow-sm ring-2 ring-background">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <ThemeToggle />
            <Button
              onClick={exportToExcel}
              variant="outline"
              size="sm"
              className="h-8 gap-2 px-3 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 border-green-300 dark:border-green-700"
              title="Exportar para Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-green-600 dark:text-green-400" />
              <span className="hidden md:inline text-green-700 dark:text-green-300 font-semibold text-xs">Excel</span>
            </Button>
            <Button onClick={loadData} variant="outline" size="sm" className="h-8 w-8 p-0">
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Linha 2: Nome do Prédio */}
        <div className="text-center md:text-center">
          <h2 className="text-base md:text-2xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight md:tracking-tighter truncate">
            {selectedBuilding === 'todos'
              ? 'Todos os Prédios'
              : buildings.find(b => b.id === selectedBuilding)?.name || 'N/A'}
          </h2>
        </div>

        {/* Barra de Alterações Não Salvas (apenas para admin) */}
        {isAdmin && batchEdits.size > 0 && (
          <div className="flex items-center justify-center gap-3 p-4 bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-900/20 dark:to-red-900/20 rounded-lg border-2 border-orange-400 dark:border-orange-600 shadow-lg animate-pulse">
            <div className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 rounded-full border-2 border-orange-500 dark:border-orange-400">
              <span className="text-sm font-black text-orange-600 dark:text-orange-400">
                ⚠️ {batchEdits.size} alteraç{batchEdits.size > 1 ? 'ões' : 'ão'} não salva{batchEdits.size > 1 ? 's' : ''}
              </span>
            </div>
            <Button
              onClick={saveBatchEdits}
              disabled={isSavingBatch}
              size="lg"
              className="bg-green-600 hover:bg-green-700 font-black gap-2 text-base px-6 py-6 shadow-xl"
            >
              {isSavingBatch ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  SALVANDO...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  SALVAR TUDO
                </>
              )}
            </Button>
            <Button
              onClick={cancelAllBatchEdits}
              disabled={isSavingBatch}
              variant="outline"
              size="lg"
              className="font-bold gap-2 border-2 px-6 py-6"
            >
              <X className="w-5 h-5" />
              DESCARTAR
            </Button>
          </div>
        )}
      </header>

      {/* Dashboard */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Resumo de Chamados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-[1fr_2fr] gap-8 items-start">
            {/* Status List */}
            <div className="space-y-2.5">
              {Object.entries(STATUS_CONFIG).map(([key, config]) => {
                const count = key === 'itens_apontados' ? ticketsByStatus.todos : ticketsByStatus[key as keyof typeof ticketsByStatus];
                const percentage = ticketsByStatus.todos > 0 ? (count / ticketsByStatus.todos) * 100 : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-medium text-foreground">{config.label}</span>
                      <span className="text-xs font-bold text-foreground">{count}</span>
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

            {/* Charts - Lado a lado no desktop, empilhados no mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pie Chart - Status */}
              <div className="h-[350px] md:h-[420px] w-full">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="45%"
                        innerRadius={85}
                        outerRadius={120}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend verticalAlign="bottom" height={50} iconSize={10} wrapperStyle={{ fontSize: '12px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                    Sem dados
                  </div>
                )}
              </div>

              {/* Bar Chart - Responsáveis */}
              <div className="h-[350px] md:h-[420px] w-full">
                {responsibleChartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={responsibleChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.3} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 13 }}
                        angle={-15}
                        textAnchor="end"
                        height={80}
                      />
                      <YAxis tick={{ fontSize: 13 }} width={55} />
                      <RechartsTooltip />
                      <Bar dataKey="value" radius={[10, 10, 0, 0]} barSize={80}>
                        {responsibleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-muted-foreground text-sm italic">
                    Sem dados
                  </div>
                )}
              </div>
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

      {/* Paginação e Controles */}
      {filteredTickets.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border border-border">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{filteredTickets.length}</span>
              {filteredTickets.length === 1 ? 'chamado encontrado' : 'chamados encontrados'}
              <span className="hidden sm:inline">•</span>
              <span className="hidden sm:inline">
                Mostrando {startIndex + 1}-{Math.min(endIndex, filteredTickets.length)}
              </span>
            </div>
            <Button
              onClick={exportToExcel}
              size="sm"
              className="bg-green-600 hover:bg-green-700 font-bold gap-2 text-xs"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Baixar Planilha
            </Button>
          </div>

          <div className="flex items-center gap-3">
            {/* Itens por página */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Por página:</span>
              <Select value={itemsPerPage.toString()} onValueChange={(value) => {
                setItemsPerPage(Number(value));
                setCurrentPage(1);
              }}>
                <SelectTrigger className="h-8 w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="200">200</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Navegação de páginas */}
            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  title="Primeira página"
                >
                  «
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="h-8 w-8 p-0"
                  title="Página anterior"
                >
                  ‹
                </Button>
                <div className="flex items-center gap-1 px-2">
                  <span className="text-sm font-medium">{currentPage}</span>
                  <span className="text-xs text-muted-foreground">de</span>
                  <span className="text-sm font-medium">{totalPages}</span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                  title="Próxima página"
                >
                  ›
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="h-8 w-8 p-0"
                  title="Última página"
                >
                  »
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

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
                {paginatedTickets.map(ticket => {
                  const building = buildings.find(b => b.id === ticket.buildingId);
                  const hasUnsavedChanges = batchEdits.has(ticket.id);
                  const statusConfig = STATUS_CONFIG[ticket.status];

                  return (
                    <tr
                      key={ticket.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors border-b border-border bg-background",
                        hasUnsavedChanges && "border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/20"
                      )}
                      onClick={() => {
                        // Apenas para não-admin visualizar
                        if (!isAdmin) {
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

                      <td className="px-3 py-4 border-x border-border/50">
                        <div className="text-foreground text-xs truncate max-w-[120px]" title={ticket.location}>{ticket.location}</div>
                      </td>

                      <td className="px-3 py-4 border-x border-border/50">
                        <div className="text-muted-foreground text-xs line-clamp-2 cursor-help" title={ticket.description}>
                          {ticket.description}
                        </div>
                      </td>

                      <td className="px-3 py-4 text-center border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <Select
                            value={batchEdits.get(ticket.id)?.status || ticket.status}
                            onValueChange={(value) => {
                              const currentEdit = batchEdits.get(ticket.id) || {
                                buildingId: ticket.buildingId,
                                location: ticket.location,
                                description: ticket.description,
                                status: ticket.status,
                                deadline: ticket.deadline,
                                reprogrammingDate: ticket.reprogrammingDate,
                                constructorReturn: ticket.constructorReturn,
                                responsible: ticket.responsible,
                              };
                              const newEdits = new Map(batchEdits);
                              newEdits.set(ticket.id, { ...currentEdit, status: value as Ticket['status'] });
                              setBatchEdits(newEdits);
                            }}
                          >
                            <SelectTrigger className={cn(
                              "h-8 text-xs border-none shadow-none",
                              statusConfig.color,
                              "hover:brightness-95 transition-all"
                            )}>
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

                      <td className="px-3 py-4 text-center border-x border-border/50">
                        <div className="text-blue-600 dark:text-blue-400 font-medium">
                          {ticket.deadline ? formatDate(ticket.deadline) : '--'}
                        </div>
                      </td>

                      <td className="px-3 py-4 text-center border-x border-border/50">
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

                              {/* Tooltip com histórico - apenas datas */}
                              <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 hidden group-hover:block z-50 w-48 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl">
                                <div className="text-xs font-bold mb-2 text-gray-900 dark:text-gray-100">Datas de Reprogramação:</div>
                                <div className="space-y-1 max-h-60 overflow-y-auto">
                                  {ticket.reprogrammingHistory.map((entry: any, index: number) => {
                                    const isObject = typeof entry === 'object' && entry.date;
                                    const date = isObject ? entry.date : entry;

                                    return (
                                      <div key={index} className="text-amber-700 dark:text-amber-300 text-sm font-semibold">
                                        {formatDate(date)}
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
                      </td>

                      <td className="px-3 py-4 text-muted-foreground text-xs border-x border-border/50">
                        <div className="max-w-[250px] text-xs">
                          <div className="truncate cursor-help" title={ticket.constructorReturn || ''}>
                            {ticket.constructorReturn || '--'}
                          </div>
                        </div>
                      </td>

                      <td className="px-3 py-4 text-center border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <Select
                            value={batchEdits.get(ticket.id)?.responsible || ticket.responsible || 'none'}
                            onValueChange={(value) => {
                              const currentEdit = batchEdits.get(ticket.id) || {
                                buildingId: ticket.buildingId,
                                location: ticket.location,
                                description: ticket.description,
                                status: ticket.status,
                                deadline: ticket.deadline,
                                reprogrammingDate: ticket.reprogrammingDate,
                                constructorReturn: ticket.constructorReturn,
                                responsible: ticket.responsible,
                              };
                              const newEdits = new Map(batchEdits);
                              newEdits.set(ticket.id, { ...currentEdit, responsible: value === 'none' ? undefined : value as 'Condomínio' | 'Construtora' });
                              setBatchEdits(newEdits);
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs border border-border/50 hover:border-blue-400 transition-colors">
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
                          <div className="flex justify-center">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteTicket(ticket.id);
                              }}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
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

