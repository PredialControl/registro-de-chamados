"use client";

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/data';
import { Ticket, Building, User, TicketUpdate, UpdateType } from '@/lib/mockData';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, RefreshCw, Download, Save, X, Trash2, Sun, Moon, Edit2, FileSpreadsheet, Camera, Eye, Plus, MessageSquare, Clock, Building2, Wrench, HardHat } from 'lucide-react';
import ExcelJS from 'exceljs';
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

const UPDATE_TYPE_CONFIG: Record<UpdateType, { label: string; color: string; bgColor: string; icon: string }> = {
  construtora: { label: 'Construtora', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', icon: '🏗️' },
  condominio: { label: 'Condomínio', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', icon: '🏢' },
  engenharia: { label: 'Engenharia', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', icon: '⚙️' },
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
  const [editingCreatedAtId, setEditingCreatedAtId] = useState<string | null>(null);
  const [editingCreatedAtValue, setEditingCreatedAtValue] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('todos');
  const [selectedMonth, setSelectedMonth] = useState<string>('todos');
  const [searchTicketNumber, setSearchTicketNumber] = useState<string>('');
  const [searchKeyword, setSearchKeyword] = useState<string>('');
  const [selectedResponsible, setSelectedResponsible] = useState<string>('todos');
  const [showOnlyExpired, setShowOnlyExpired] = useState<boolean>(false);
  const [viewingTicket, setViewingTicket] = useState<Ticket | null>(null);
  const [viewingTicketPhotos, setViewingTicketPhotos] = useState<string[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState<boolean>(false);
  const [originalDeadline, setOriginalDeadline] = useState<string | undefined>(undefined);
  const [deadlineChangeReason, setDeadlineChangeReason] = useState<string>('');
  const [originalResponsible, setOriginalResponsible] = useState<string | undefined>(undefined);
  const [responsibleChangeReason, setResponsibleChangeReason] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(50);
  const [isLoadingData, setIsLoadingData] = useState<boolean>(false);

  // Edição em lote - SEMPRE ATIVO para edição rápida tipo planilha
  const [batchEdits, setBatchEdits] = useState<Map<string, Partial<Ticket>>>(new Map());
  const [isSavingBatch, setIsSavingBatch] = useState<boolean>(false);

  // Modal de reprogramação
  const [reprogrammingTicket, setReprogrammingTicket] = useState<Ticket | null>(null);
  const [reprogrammingDate, setReprogrammingDate] = useState<string>('');
  const [reprogrammingReason, setReprogrammingReason] = useState<string>('');
  const [viewingHistoryTicket, setViewingHistoryTicket] = useState<Ticket | null>(null);

  // Modal de mudança de responsável (Construtora -> Condomínio)
  const [responsibleChangeTicket, setResponsibleChangeTicket] = useState<Ticket | null>(null);
  const [responsibleChangeNewValue, setResponsibleChangeNewValue] = useState<'Construtora' | 'Condomínio'>('Condomínio');
  const [responsibleChangeReasonModal, setResponsibleChangeReasonModal] = useState<string>('');

  // Modal de adicionar atualização/parecer
  const [addingUpdateToTicket, setAddingUpdateToTicket] = useState<Ticket | null>(null);
  const [newUpdateType, setNewUpdateType] = useState<UpdateType | null>(null);
  const [newUpdateMessage, setNewUpdateMessage] = useState<string>('');
  const [isSavingUpdate, setIsSavingUpdate] = useState<boolean>(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  // Carregar prédios e usuários ao iniciar, mas não tickets
  useEffect(() => {
    if (user) {
      loadBuildingsAndUsers();
    }
  }, [user]);

  // Carregar tickets quando selecionar um prédio
  useEffect(() => {
    if (user && buildings.length > 0 && selectedBuilding !== 'todos') {
      loadTicketsForBuilding();
    }
  }, [selectedBuilding]);

  // Carregar fotos quando abrir o modal de visualização
  useEffect(() => {
    const loadPhotos = async () => {
      if (viewingTicket && viewingTicket.id) {
        setLoadingPhotos(true);
        // Salvar valores originais quando abre o modal
        setOriginalDeadline(viewingTicket.deadline);
        setDeadlineChangeReason('');
        setOriginalResponsible(viewingTicket.responsible);
        setResponsibleChangeReason('');
        try {
          const photos = await dataService.getTicketPhotos(viewingTicket.id);
          setViewingTicketPhotos(photos);
        } catch (error) {
          console.error('Erro ao carregar fotos:', error);
          setViewingTicketPhotos([]);
        } finally {
          setLoadingPhotos(false);
        }
      } else {
        setViewingTicketPhotos([]);
        setOriginalDeadline(undefined);
        setDeadlineChangeReason('');
        setOriginalResponsible(undefined);
        setResponsibleChangeReason('');
      }
    };
    loadPhotos();
  }, [viewingTicket?.id]);

  const loadBuildingsAndUsers = async () => {
    if (!user) return;

    setIsLoadingData(true);
    try {
      const [userBuildings, allUsers] = await Promise.all([
        dataService.getBuildingsForUser(user),
        dataService.getUsers()
      ]);

      setBuildings(userBuildings);
      setUsers(allUsers);

      // Se usuário comum tem apenas 1 prédio, selecionar automaticamente
      if (user.role !== 'admin' && userBuildings.length === 1) {
        setSelectedBuilding(userBuildings[0].id);
      }
    } catch (error) {
      console.error('Error loading buildings:', error);
      toast.error('Erro ao carregar prédios.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadTicketsForBuilding = async () => {
    if (!user || selectedBuilding === 'todos') return;

    setIsLoadingData(true);
    try {
      console.log(`🔄 Carregando TODOS os tickets do prédio: ${selectedBuilding}`);
      // Buscar TODOS os tickets em lotes de 50 (sem limite)
      const buildingTickets = await dataService.getTicketsByBuilding(selectedBuilding, false);
      setTickets(buildingTickets);

      const buildingName = buildings.find(b => b.id === selectedBuilding)?.name || 'Prédio';
      toast.success(`✅ ${buildingTickets.length} chamados de "${buildingName}" carregados!`);
    } catch (error) {
      console.error('Error loading tickets:', error);
      toast.error('Erro ao carregar chamados.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const loadAllTickets = async () => {
    if (!user) return;

    if (user.role === 'admin' && selectedBuilding === 'todos') {
      const confirm = window.confirm(
        '⚠️ Carregar TODOS os chamados pode demorar.\n\n' +
        'Recomendamos selecionar um prédio específico.\n\n' +
        'Deseja continuar?'
      );
      if (!confirm) return;
    }

    setIsLoadingData(true);
    try {
      if (selectedBuilding === 'todos') {
        console.log('⚠️ Carregando TODOS os chamados...');
        const allTickets = await dataService.getTicketsForUser(user);
        setTickets(allTickets);
      } else {
        await loadTicketsForBuilding();
      }
    } catch (error) {
      console.error('Error loading all tickets:', error);
      toast.error('Erro ao carregar chamados.');
    } finally {
      setIsLoadingData(false);
    }
  };

  const refreshData = async () => {
    await loadBuildingsAndUsers();
    if (selectedBuilding !== 'todos') {
      await loadTicketsForBuilding();
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

  // Função para verificar se o prazo está vencido
  const isDeadlineExpired = (ticket: Ticket): boolean => {
    // Se tem reprogramação, considerar a data de reprogramação ao invés do prazo original
    const effectiveDeadline = ticket.reprogrammingDate || ticket.deadline;

    if (!effectiveDeadline) return false;

    // Status que não devem ser marcados como vencidos
    const completedStatuses: Ticket['status'][] = ['concluido', 'f_indevido', 'improcedente'];
    if (completedStatuses.includes(ticket.status)) return false;

    // Comparar data
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let deadlineDate: Date;

    // Se for formato YYYY-MM-DD
    if (effectiveDeadline.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = effectiveDeadline.split('-');
      deadlineDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    } else {
      deadlineDate = new Date(effectiveDeadline);
    }

    deadlineDate.setHours(0, 0, 0, 0);

    return deadlineDate < today;
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

  const exportToExcel = async () => {
    try {
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Sistema de Chamados';
      workbook.created = new Date();

      // === ABA 1: DASHBOARD ===
      const dashboard = workbook.addWorksheet('Dashboard', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }]
      });

      // Título principal
      dashboard.mergeCells('A1:F1');
      const titleCell = dashboard.getCell('A1');
      titleCell.value = '📊 RELATÓRIO DE CHAMADOS';
      titleCell.font = { size: 20, bold: true, color: { argb: 'FFFFFFFF' } };
      titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
      titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
      dashboard.getRow(1).height = 35;

      // Subtítulo com data
      dashboard.mergeCells('A2:F2');
      const subtitleCell = dashboard.getCell('A2');
      const buildingName = selectedBuilding === 'todos'
        ? 'Todos os Prédios'
        : buildings.find(b => b.id === selectedBuilding)?.name || 'Chamados';
      subtitleCell.value = `${buildingName} - Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`;
      subtitleCell.font = { size: 12, italic: true };
      subtitleCell.alignment = { horizontal: 'center' };
      dashboard.getRow(2).height = 20;

      dashboard.addRow([]);

      // Métricas principais (cards)
      const statusCounts = filteredTickets.reduce((acc, ticket) => {
        acc[ticket.status] = (acc[ticket.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      dashboard.addRow(['RESUMO GERAL']).font = { size: 14, bold: true };
      dashboard.mergeCells(`A${dashboard.rowCount}:F${dashboard.rowCount}`);
      dashboard.getCell(`A${dashboard.rowCount}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

      dashboard.addRow([]);

      const metricsRow = dashboard.addRow(['Total de Chamados', filteredTickets.length, '', 'Prédios', new Set(filteredTickets.map(t => t.buildingId)).size]);
      metricsRow.font = { bold: true };
      metricsRow.eachCell((cell, colNumber) => {
        if (colNumber % 3 === 2) {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDBEAFE' } };
          cell.font = { size: 16, bold: true, color: { argb: 'FF7C3AED' } };
        }
      });

      dashboard.addRow([]);
      dashboard.addRow(['DISTRIBUIÇÃO POR STATUS']).font = { size: 14, bold: true };
      dashboard.mergeCells(`A${dashboard.rowCount}:F${dashboard.rowCount}`);
      dashboard.getCell(`A${dashboard.rowCount}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE5E7EB' } };

      dashboard.addRow([]);
      dashboard.addRow(['Status', 'Quantidade', 'Percentual']).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      dashboard.getRow(dashboard.rowCount).eachCell((cell) => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
        cell.alignment = { horizontal: 'center' };
      });

      Object.entries(STATUS_CONFIG).forEach(([status, config]) => {
        // "Itens Apontados" mostra o total de chamados
        const count = status === 'itens_apontados' ? filteredTickets.length : (statusCounts[status] || 0);
        const percentage = filteredTickets.length > 0 ? ((count / filteredTickets.length) * 100).toFixed(1) : '0.0';
        const row = dashboard.addRow([config.label, count, `${percentage}%`]);
        row.getCell(2).alignment = { horizontal: 'center' };
        row.getCell(3).alignment = { horizontal: 'center' };
        row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: config.chartColor.replace('#', 'FF') } };
        row.getCell(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      });

      // Ajustar larguras
      dashboard.getColumn(1).width = 25;
      dashboard.getColumn(2).width = 15;
      dashboard.getColumn(3).width = 15;
      dashboard.getColumn(4).width = 25;
      dashboard.getColumn(5).width = 15;
      dashboard.getColumn(6).width = 15;

      // === ABA 2: CHAMADOS (Dados detalhados) ===
      const chamadosSheet = workbook.addWorksheet('Chamados Detalhados');

      // Cabeçalho
      const headerRow = chamadosSheet.addRow([
        'Nº Chamado',
        'Local',
        'Prédio',
        'Criado Por',
        'Descrição',
        'Status',
        'Abertura',
        'Histórico de Atualizações',
        'Responsável',
        'Fotos'
      ]);

      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1F2937' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
      headerRow.height = 30;

      // Dados
      filteredTickets.forEach((ticket, index) => {
        const building = buildings.find(b => b.id === ticket.buildingId);
        const ticketUser = users.find(u => u.id === ticket.userId);
        const statusLabel = STATUS_CONFIG[ticket.status]?.label || ticket.status;

        // Links das fotos
        const photoLinks = ticket.photoUrls && ticket.photoUrls.length > 0
          ? ticket.photoUrls.map((url, i) => `Foto ${i + 1}: ${url}`).join('\n')
          : 'Sem fotos';

        // Montar histórico de atualizações formatado
        const updateTypeLabels: Record<string, string> = {
          construtora: 'CONSTRUTORA',
          condominio: 'CONDOMÍNIO',
          engenharia: 'ENGENHARIA'
        };

        let historicoTexto = `[${formatDate(ticket.createdAt)}] ABERTURA - ${ticketUser?.name || 'Usuário'} solicitou abertura de chamado`;

        // Adicionar reprogramações ao histórico
        if (ticket.reprogrammingHistory && ticket.reprogrammingHistory.length > 0) {
          ticket.reprogrammingHistory.forEach(item => {
            const dataReprog = item.updatedAt ? formatDate(item.updatedAt) : formatDate(item.date);
            historicoTexto += `\n\n[${dataReprog}] REPROGRAMAÇÃO - Para ${formatDate(item.date)}${item.reason ? `: ${item.reason}` : ''}`;
          });
        }

        // Adicionar atualizações/pareceres ao histórico
        if (ticket.updates && ticket.updates.length > 0) {
          // Ordenar por data
          const sortedUpdates = [...ticket.updates].sort((a, b) =>
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          sortedUpdates.forEach(update => {
            const dataUpdate = new Date(update.createdAt).toLocaleDateString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            });
            const tipoLabel = updateTypeLabels[update.type] || update.type.toUpperCase();
            historicoTexto += `\n\n[${dataUpdate}] ${tipoLabel} - ${update.message} (Por: ${update.createdBy})`;
          });
        }

        const row = chamadosSheet.addRow([
          ticket.externalTicketId || 'SEM Nº',
          ticket.location || '',
          building?.name || 'N/A',
          ticketUser?.name || 'N/A',
          ticket.description || '',
          statusLabel,
          ticket.createdAt ? formatDate(ticket.createdAt) : '--',
          historicoTexto,
          ticket.responsible || 'Construtora',
          photoLinks
        ]);

        // Altura fixa pequena para todas as linhas
        row.height = 20;

        // Zebrar linhas
        if (index % 2 === 0) {
          row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF9FAFB' } };
        }

        // Colorir coluna de status (coluna 6)
        const statusColor = STATUS_CONFIG[ticket.status]?.chartColor.replace('#', 'FF') || 'FFCCCCCC';
        row.getCell(6).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusColor } };
        row.getCell(6).font = { bold: true, color: { argb: 'FFFFFFFF' } };
        row.getCell(6).alignment = { horizontal: 'center' };

        // Alinhamento vertical centralizado (sem wrap text)
        row.eachCell((cell) => {
          const colNum = typeof cell.col === 'number' ? cell.col : parseInt(cell.col as string);
          cell.alignment = { vertical: 'middle', horizontal: colNum === 6 ? 'center' : 'left' };
        });
      });

      // Largura das colunas
      chamadosSheet.getColumn(1).width = 15;  // Nº Chamado
      chamadosSheet.getColumn(2).width = 20;  // Local
      chamadosSheet.getColumn(3).width = 25;  // Prédio
      chamadosSheet.getColumn(4).width = 20;  // Criado Por
      chamadosSheet.getColumn(5).width = 50;  // Descrição
      chamadosSheet.getColumn(6).width = 18;  // Status
      chamadosSheet.getColumn(7).width = 12;  // Abertura
      chamadosSheet.getColumn(8).width = 80;  // Histórico de Atualizações
      chamadosSheet.getColumn(9).width = 15;  // Responsável
      chamadosSheet.getColumn(10).width = 80; // Fotos

      // Filtros automáticos
      chamadosSheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: 10 }
      };

      // Congelar primeira linha
      chamadosSheet.views = [
        { state: 'frozen', ySplit: 1 }
      ];

      // Bordas em todas as células com dados
      chamadosSheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
          };
        });
      });

      // Gerar arquivo
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const date = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      const fileName = `Chamados_${buildingName.replace(/\s/g, '_')}_${date}.xlsx`;
      link.download = fileName;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

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
      if (selectedBuilding !== 'todos') {
        await loadTicketsForBuilding();
      } else {
        await loadAllTickets();
      }

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


  const saveReprogramming = async () => {
    if (!reprogrammingTicket || !reprogrammingDate || !reprogrammingReason.trim()) {
      toast.error('Preencha a data e o motivo da reprogramação');
      return;
    }

    try {
      // Atualizar histórico
      const newHistory = [
        ...(reprogrammingTicket.reprogrammingHistory || []),
        {
          date: reprogrammingDate,
          reason: reprogrammingReason
        }
      ];

      // Formatar mensagem para o retorno
      const reprogrammingMessage = `📅 REPROGRAMADO para ${formatDate(reprogrammingDate)}\n💬 Motivo: ${reprogrammingReason}`;

      // Adicionar ao retorno existente (se houver)
      const updatedReturn = reprogrammingTicket.constructorReturn
        ? `${reprogrammingTicket.constructorReturn}\n\n${reprogrammingMessage}`
        : reprogrammingMessage;

      await dataService.updateTicket(reprogrammingTicket.id, {
        reprogrammingDate: reprogrammingDate,
        reprogrammingHistory: newHistory,
        constructorReturn: updatedReturn
      });

      // Fechar modal e limpar
      setReprogrammingTicket(null);
      setReprogrammingDate('');
      setReprogrammingReason('');

      // Recarregar dados
      if (selectedBuilding !== 'todos') {
        await loadTicketsForBuilding();
      } else {
        await loadAllTickets();
      }

      toast.success('Reprogramação adicionada com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar reprogramação:', error);
      toast.error('Erro ao salvar reprogramação');
    }
  };

  const removeReprogramming = async (ticketId: string) => {
    if (!confirm('⚠️ ATENÇÃO: Isso vai remover TODAS as reprogramações deste chamado.\n\nPara remover apenas uma, use o botão 🗑️ ao lado de cada reprogramação no histórico.\n\nDeseja continuar?')) {
      return;
    }

    try {
      await dataService.updateTicket(ticketId, {
        reprogrammingDate: undefined,
        reprogrammingHistory: []
      });

      // Recarregar dados
      if (selectedBuilding !== 'todos') {
        await loadTicketsForBuilding();
      } else {
        await loadAllTickets();
      }

      toast.success('Todas as reprogramações foram removidas!');
    } catch (error) {
      console.error('Erro ao remover reprogramação:', error);
      toast.error('Erro ao remover reprogramação');
    }
  };

  const removeSingleReprogramming = async (ticket: Ticket, indexToRemove: number) => {
    if (!confirm(`Tem certeza que deseja remover esta reprogramação?`)) {
      return;
    }

    try {
      const newHistory = ticket.reprogrammingHistory?.filter((_, index) => index !== indexToRemove) || [];

      // Se removeu a última, limpar a data de reprogramação também
      const newDate = newHistory.length > 0 ? newHistory[newHistory.length - 1].date : undefined;

      await dataService.updateTicket(ticket.id, {
        reprogrammingDate: newDate,
        reprogrammingHistory: newHistory
      });

      // Recarregar dados
      if (selectedBuilding !== 'todos') {
        await loadTicketsForBuilding();
      } else {
        await loadAllTickets();
      }

      // Se estava no modal, atualizar
      if (reprogrammingTicket?.id === ticket.id) {
        setReprogrammingTicket(null);
      }

      toast.success('Reprogramação removida com sucesso!');
    } catch (error) {
      console.error('Erro ao remover reprogramação:', error);
      toast.error('Erro ao remover reprogramação');
    }
  };

  // Função para salvar mudança de responsável via modal
  const saveResponsibleChange = async () => {
    if (!responsibleChangeTicket || !responsibleChangeReasonModal.trim()) {
      toast.error('Por favor, informe o motivo da mudança de responsável!');
      return;
    }

    try {
      const now = new Date().toLocaleString('pt-BR');
      const previousResponsible = responsibleChangeTicket.responsible || 'Construtora';

      // Criar log da mudança para o parecer da engenharia
      const changeLog = `--- Mudança de Responsável [${now}] ---\nResponsável anterior: ${previousResponsible}\nNovo responsável: ${responsibleChangeNewValue}\nMotivo: ${responsibleChangeReasonModal}\n----------------------------`;

      // Adicionar ao parecer existente (se houver)
      const updatedEngineeringOpinion = responsibleChangeTicket.engineeringOpinion
        ? `${responsibleChangeTicket.engineeringOpinion}\n\n${changeLog}`
        : changeLog;

      await dataService.updateTicket(responsibleChangeTicket.id, {
        responsible: responsibleChangeNewValue,
        engineeringOpinion: updatedEngineeringOpinion
      });

      // Fechar modal e limpar
      setResponsibleChangeTicket(null);
      setResponsibleChangeNewValue('Condomínio');
      setResponsibleChangeReasonModal('');

      // Atualizar também o viewingTicket se estiver aberto
      if (viewingTicket?.id === responsibleChangeTicket.id) {
        setViewingTicket({
          ...viewingTicket,
          responsible: responsibleChangeNewValue,
          engineeringOpinion: updatedEngineeringOpinion
        });
        setOriginalResponsible(responsibleChangeNewValue);
      }

      // Recarregar dados
      if (selectedBuilding !== 'todos') {
        await loadTicketsForBuilding();
      } else {
        await loadAllTickets();
      }

      toast.success('Responsável alterado com sucesso!');
    } catch (error) {
      console.error('Erro ao alterar responsável:', error);
      toast.error('Erro ao alterar responsável');
    }
  };

  const deleteTicket = async (ticketId: string) => {
    if (confirm('Tem certeza que deseja excluir este chamado?')) {
      try {
        console.log('🗑️ Tentando excluir chamado:', ticketId);
        await dataService.deleteTicket(ticketId);
        console.log('✅ Chamado excluído com sucesso!');
        if (selectedBuilding !== 'todos') {
          await loadTicketsForBuilding();
        } else {
          await loadAllTickets();
        }
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

      // Atualizar apenas o ticket específico no estado (sem recarregar tudo)
      setTickets(prev => prev.map(t =>
        t.id === ticketId
          ? { ...t, externalTicketId: editingTicketNumberValue, isRegistered: true }
          : t
      ));

      setEditingTicketNumberId(null);
      setEditingTicketNumberValue('');
      toast.success('Número atualizado!');
    } catch (error) {
      toast.error('Erro ao atualizar número.');
    }
  };

  const handleSaveCreatedAt = async (ticketId: string) => {
    if (!editingCreatedAtValue.trim()) {
      toast.error('Informe a data de abertura');
      return;
    }
    try {
      await dataService.updateTicket(ticketId, {
        createdAt: editingCreatedAtValue
      });

      // Atualizar apenas o ticket específico no estado (sem recarregar tudo)
      setTickets(prev => prev.map(t =>
        t.id === ticketId
          ? { ...t, createdAt: editingCreatedAtValue }
          : t
      ));

      setEditingCreatedAtId(null);
      setEditingCreatedAtValue('');
      toast.success('Data de abertura atualizada!');
    } catch (error) {
      toast.error('Erro ao atualizar data de abertura.');
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

    // Filtro de responsável (não definido = Construtora)
    const responsibleMatch = selectedResponsible === 'todos' ||
      (selectedResponsible === 'Construtora' && (!ticket.responsible || ticket.responsible === 'Construtora')) ||
      (selectedResponsible === 'Condomínio' && ticket.responsible === 'Condomínio');

    // Filtro de prazo vencido
    const expiredMatch = !showOnlyExpired || isDeadlineExpired(ticket);

    return statusMatch && buildingMatch && dateMatch && monthMatch && numberMatch && keywordMatch && responsibleMatch && expiredMatch;
  }).sort((a, b) => {
    // Ordenar por data de criação: mais novo primeiro
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
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
  }, [selectedStatus, selectedBuilding, selectedDate, selectedMonth, searchTicketNumber, searchKeyword, selectedResponsible, showOnlyExpired]);

  // Contadores para o GRÁFICO (sempre todos os tickets, sem filtro)
  const allTicketsByStatus = {
    todos: tickets.length,
    itens_apontados: tickets.filter(t => t.status === 'itens_apontados').length,
    em_andamento: tickets.filter(t => t.status === 'em_andamento').length,
    improcedente: tickets.filter(t => t.status === 'improcedente').length,
    aguardando_vistoria: tickets.filter(t => t.status === 'aguardando_vistoria').length,
    concluido: tickets.filter(t => t.status === 'concluido').length,
    f_indevido: tickets.filter(t => t.status === 'f_indevido').length,
  };

  // Contadores para os FILTROS da tabela (tickets filtrados)
  const ticketsByStatus = {
    todos: filteredTickets.length,
    itens_apontados: filteredTickets.filter(t => t.status === 'itens_apontados').length,
    em_andamento: filteredTickets.filter(t => t.status === 'em_andamento').length,
    improcedente: filteredTickets.filter(t => t.status === 'improcedente').length,
    aguardando_vistoria: filteredTickets.filter(t => t.status === 'aguardando_vistoria').length,
    concluido: filteredTickets.filter(t => t.status === 'concluido').length,
    f_indevido: filteredTickets.filter(t => t.status === 'f_indevido').length,
  };

  // Gráfico usa os tickets FILTRADOS (responde aos filtros)
  const chartData = Object.entries(STATUS_CONFIG)
    .map(([key, config]) => ({
      key: key,
      name: config.label,
      value: ticketsByStatus[key as keyof typeof ticketsByStatus], // Usar ticketsByStatus (filtrados)
      color: config.chartColor
    }))
    .filter(item => item.value > 0);

  // Dados por responsável para o GRÁFICO (usa tickets filtrados)
  const filteredTicketsByResponsible = {
    construtora: filteredTickets.filter(t => !t.responsible || t.responsible === 'Construtora').length,
    condominio: filteredTickets.filter(t => t.responsible === 'Condomínio').length,
  };

  // Gráfico de responsáveis usa os tickets FILTRADOS
  const responsibleChartData = [
    {
      name: 'Construtora',
      value: filteredTicketsByResponsible.construtora,
      color: '#ef4444' // vermelho
    },
    {
      name: 'Condomínio',
      value: filteredTicketsByResponsible.condominio,
      color: '#3b82f6' // azul
    }
  ].filter(item => item.value > 0);

  // Gerar lista de meses disponíveis a partir dos tickets
  const availableMonths = Array.from(new Set(
    tickets
      .filter(t => t.createdAt)
      .map(t => t.createdAt.substring(0, 7))
  )).sort((a, b) => b.localeCompare(a)); // Ordem decrescente (mais recente primeiro)

  const isAdmin = user?.role === 'admin' || user?.role === 'building_admin';

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
                <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">
                  {user.role === 'building_admin' ? 'ADMIN PRÉDIO' : user.role}
                </span>
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
            <Button onClick={refreshData} variant="outline" size="sm" className="h-8 w-8 p-0">
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
                        onClick={(data) => {
                          // Filtrar automaticamente pelo status clicado
                          if (data && data.key) {
                            setSelectedStatus(data.key as TicketStatus);
                            toast.success(`Filtrando por: ${data.name}`);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: 'pointer' }} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                      <Legend
                        verticalAlign="bottom"
                        height={50}
                        iconSize={10}
                        wrapperStyle={{ fontSize: '12px', cursor: 'pointer' }}
                        onClick={(data) => {
                          // Também permitir clicar na legenda
                          const entry = chartData.find(e => e.name === data.value);
                          if (entry && entry.key) {
                            setSelectedStatus(entry.key as TicketStatus);
                            toast.success(`Filtrando por: ${entry.name}`);
                          }
                        }}
                      />
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
                      <Bar
                        dataKey="value"
                        radius={[10, 10, 0, 0]}
                        barSize={80}
                        onClick={(data) => {
                          // Filtrar por responsável ao clicar na barra
                          if (data && data.name) {
                            setSelectedResponsible(data.name);
                            toast.success(`Filtrando por: ${data.name}`);
                          }
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        {responsibleChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} style={{ cursor: 'pointer' }} />
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

        <Select value={selectedResponsible} onValueChange={setSelectedResponsible}>
          <SelectTrigger className="flex-1">
            <SelectValue placeholder="Responsável" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos Responsáveis</SelectItem>
            <SelectItem value="Construtora">Construtora</SelectItem>
            <SelectItem value="Condomínio">Condomínio</SelectItem>
          </SelectContent>
        </Select>

        {/* Botão de filtro de prazo vencido */}
        <Button
          variant={showOnlyExpired ? "default" : "outline"}
          onClick={() => setShowOnlyExpired(!showOnlyExpired)}
          className={cn(
            "flex-1 font-semibold",
            showOnlyExpired && "bg-red-600 hover:bg-red-700 text-white"
          )}
        >
          {showOnlyExpired ? "✓ Prazo Vencido" : "Prazo Vencido"}
        </Button>

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
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1 sm:gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <span className="font-medium text-foreground">{filteredTickets.length}</span>
                {filteredTickets.length === 1 ? 'chamado encontrado' : 'chamados encontrados'}
                <span className="hidden sm:inline">•</span>
                <span className="hidden sm:inline">
                  Mostrando {startIndex + 1}-{Math.min(endIndex, filteredTickets.length)}
                </span>
              </div>
              {tickets.length > 0 && selectedBuilding !== 'todos' && (
                <span className="text-[10px] sm:text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                  ✅ Total: {tickets.length} chamados
                </span>
              )}
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
      {selectedBuilding === 'todos' && tickets.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-4">
            <div className="text-6xl">🏢</div>
            <div className="space-y-4">
              <div>
                <p className="text-xl font-bold text-foreground mb-2">Selecione um Prédio</p>
                <p className="text-muted-foreground">Escolha um prédio acima para visualizar os chamados</p>
              </div>
              {isAdmin && (
                <>
                  <div className="border-t border-border pt-4 mt-4">
                    <p className="text-sm text-muted-foreground mb-3">
                      Ou clique no botão abaixo para carregar TODOS os chamados
                    </p>
                    <Button
                      onClick={loadAllTickets}
                      size="lg"
                      className="bg-blue-600 hover:bg-blue-700 font-bold gap-2"
                    >
                      <RefreshCw className="w-5 h-5" />
                      Carregar Todos os Chamados
                    </Button>
                    <p className="text-xs text-muted-foreground mt-2 italic">
                      ⚠️ Atenção: Pode demorar se houver muitos chamados
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : filteredTickets.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Nenhum chamado encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden border border-border">
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-muted/50 border-b border-border">
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Nº</th>
                  <th className="px-3 py-4 text-left font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Local</th>
                  <th className="px-3 py-4 text-left font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Descrição</th>
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Foto</th>
                  <th className="px-3 py-4 text-left font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Criado Por</th>
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Abertura</th>
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Responsável</th>
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Status</th>
                  <th className="px-3 py-4 text-center font-bold text-foreground uppercase text-xs tracking-wider border-x border-border/50">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedTickets.map(ticket => {
                  const building = buildings.find(b => b.id === ticket.buildingId);
                  const ticketUser = users.find(u => u.id === ticket.userId);
                  const hasUnsavedChanges = batchEdits.has(ticket.id);
                  const statusConfig = STATUS_CONFIG[ticket.status];
                  const isExpired = isDeadlineExpired(ticket);

                  return (
                    <tr
                      key={ticket.id}
                      className={cn(
                        "hover:bg-muted/30 transition-colors border-b border-border bg-background",
                        hasUnsavedChanges && "border-l-4 border-l-orange-500 bg-orange-50/50 dark:bg-orange-900/20",
                        isExpired && !hasUnsavedChanges && "border-l-4 border-l-red-600 bg-red-50/30 dark:bg-red-900/10"
                      )}
                    >
                      {/* COLUNA: Nº CHAMADO */}
                      <td className="px-3 py-4 text-center border-x border-border/50">
                        <div className="text-foreground text-xs font-bold">
                          {ticket.externalTicketId || '-'}
                        </div>
                      </td>

                      {/* COLUNA: LOCAL */}
                      <td className="px-3 py-4 border-x border-border/50">
                        <div className="text-foreground text-xs truncate max-w-[150px]" title={ticket.location}>
                          {ticket.location}
                        </div>
                      </td>

                      {/* COLUNA: DESCRIÇÃO */}
                      <td className="px-3 py-4 border-x border-border/50">
                        <div className="text-muted-foreground text-xs line-clamp-2 cursor-help max-w-[250px]" title={ticket.description}>
                          {ticket.description}
                        </div>
                      </td>

                      {/* COLUNA: FOTO */}
                      <td className="px-3 py-4 text-center border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center">
                          <button
                            className="relative w-12 h-12 rounded-md border border-border cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all flex items-center justify-center bg-muted hover:bg-muted/80"
                            onClick={async () => {
                              const photos = await dataService.getTicketPhotos(ticket.id);
                              const ticketWithPhotos = { ...ticket, photoUrls: photos };
                              setSelectedTicketForGallery(ticketWithPhotos);
                            }}
                            title="Clique para ver as fotos"
                          >
                            <Camera className="w-5 h-5 text-muted-foreground" />
                          </button>
                        </div>
                      </td>

                      {/* COLUNA: CRIADO POR */}
                      <td className="px-3 py-4 text-xs border-x border-border/50">
                        <div className="text-foreground font-medium truncate max-w-[120px]" title={ticketUser?.name || 'Desconhecido'}>
                          {ticketUser?.name || 'N/A'}
                        </div>
                      </td>

                      {/* COLUNA: ABERTURA */}
                      <td className="px-3 py-4 text-center text-muted-foreground text-xs border-x border-border/50">
                        <span>{formatDate(ticket.createdAt)}</span>
                      </td>

                      {/* COLUNA: RESPONSÁVEL */}
                      <td className="px-3 py-4 text-center border-x border-border/50">
                        <div className="text-xs font-medium">
                          {ticket.responsible || 'Construtora'}
                        </div>
                      </td>

                      {/* COLUNA: SITUAÇÃO */}
                      <td className="px-3 py-4 text-center border-x border-border/50">
                        <span className={cn(
                          "inline-block px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap",
                          statusConfig.color
                        )}>
                          {statusConfig.label}
                        </span>
                      </td>

                      {/* COLUNA: AÇÕES */}
                      <td className="px-3 py-4 border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        <div className="flex justify-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingTicket(ticket);
                            }}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title="Ver detalhes"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {isAdmin && (
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
                          )}
                        </div>
                      </td>
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

              <div className="grid grid-cols-2 gap-4">
                {/* Número do Chamado */}
                <div>
                  <label className="text-sm font-semibold text-foreground">Número do Chamado</label>
                  <p className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-bold">
                    {viewingTicket.externalTicketId || 'SEM Nº'}
                  </p>
                </div>

                {/* Criado Por */}
                <div>
                  <label className="text-sm font-semibold text-foreground">Criado Por</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {users.find(u => u.id === viewingTicket.userId)?.name || 'N/A'}
                  </p>
                </div>
              </div>

              {isAdmin && (
                <div className="border-t border-border pt-4 mt-4">
                  <h3 className="text-sm font-bold text-foreground mb-3">📝 Editar Chamado</h3>

                  <div className="space-y-4">
                    {/* Responsável */}
                    <div>
                      <label className="text-sm font-semibold text-foreground">Responsável</label>
                      <Select
                        value={viewingTicket.responsible || 'Construtora'}
                        onValueChange={(value) => {
                          const currentResponsible = viewingTicket.responsible || 'Construtora';
                          const newValue = value as 'Condomínio' | 'Construtora';

                          // Se está mudando de um valor para outro diferente, abre o modal
                          if (currentResponsible !== newValue) {
                            console.log('🔄 DEBUG - Abrindo modal de mudança de responsável de', currentResponsible, 'para', newValue);
                            setResponsibleChangeTicket(viewingTicket);
                            setResponsibleChangeNewValue(newValue);
                            setResponsibleChangeReasonModal('');
                          }
                        }}
                      >
                        <SelectTrigger className="h-10 text-sm mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          <SelectItem value="Construtora">Construtora</SelectItem>
                          <SelectItem value="Condomínio">Condomínio</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Prazo */}
                    <div>
                      <label className="text-sm font-semibold text-foreground">Prazo de Conclusão</label>
                      <Input
                        type="date"
                        value={viewingTicket.deadline || ''}
                        onChange={(e) => {
                          setViewingTicket({ ...viewingTicket, deadline: e.target.value });
                        }}
                        className={cn(
                          "h-10 text-sm mt-1",
                          isDeadlineExpired(viewingTicket)
                            ? "border-red-500 text-red-600 dark:text-red-400"
                            : "border-blue-300 text-blue-600 dark:text-blue-400"
                        )}
                      />
                      {isDeadlineExpired(viewingTicket) && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">⚠️ Prazo vencido!</p>
                      )}
                    </div>

                    {/* Motivo da mudança de prazo */}
                    {originalDeadline !== viewingTicket.deadline && viewingTicket.deadline && (
                      <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-md border border-yellow-300 dark:border-yellow-700">
                        <label className="text-sm font-semibold text-yellow-800 dark:text-yellow-400">
                          ⚠️ Motivo da Mudança de Prazo (Obrigatório)
                        </label>
                        <Textarea
                          value={deadlineChangeReason}
                          onChange={(e) => setDeadlineChangeReason(e.target.value)}
                          placeholder={`Prazo anterior: ${originalDeadline ? formatDate(originalDeadline) : 'Não definido'}\nNovo prazo: ${formatDate(viewingTicket.deadline)}\n\nExplique o motivo da mudança...`}
                          className="min-h-[80px] text-sm mt-2"
                        />
                      </div>
                    )}

                    {/* Status - muda conforme responsável */}
                    <div>
                      <label className="text-sm font-semibold text-foreground">Status</label>
                      <Select
                        value={viewingTicket.status}
                        onValueChange={(value) => {
                          setViewingTicket({ ...viewingTicket, status: value as Ticket['status'] });
                        }}
                      >
                        <SelectTrigger className={cn("h-10 text-sm mt-1", STATUS_CONFIG[viewingTicket.status].color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="z-[9999]">
                          {viewingTicket.responsible === 'Condomínio' ? (
                            <>
                              <SelectItem value="aguardando_vistoria">Aguardando</SelectItem>
                              <SelectItem value="em_andamento">Programado</SelectItem>
                              <SelectItem value="concluido">Executado</SelectItem>
                            </>
                          ) : (
                            <>
                              <SelectItem value="aguardando_vistoria">Aguardando Vistoria</SelectItem>
                              <SelectItem value="em_andamento">Programado</SelectItem>
                              <SelectItem value="concluido">Executado</SelectItem>
                              <SelectItem value="improcedente">Improcedente</SelectItem>
                              <SelectItem value="f_indevido">Fechado Indevido</SelectItem>
                            </>
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Retorno da Construtora */}
                    <div>
                      <label className="text-sm font-semibold text-foreground">Retorno da Construtora</label>
                      <Textarea
                        value={viewingTicket.constructorReturn || ''}
                        onChange={(e) => setViewingTicket({ ...viewingTicket, constructorReturn: e.target.value })}
                        placeholder="Resposta/retorno da construtora sobre o chamado..."
                        className="min-h-[100px] text-sm mt-1"
                      />
                    </div>

                    {/* Parecer da Engenharia */}
                    <div>
                      <label className="text-sm font-semibold text-foreground">Parecer da Engenharia</label>
                      <Textarea
                        value={viewingTicket.engineeringOpinion || ''}
                        onChange={(e) => setViewingTicket({ ...viewingTicket, engineeringOpinion: e.target.value })}
                        placeholder="Parecer técnico da engenharia sobre o chamado..."
                        className="min-h-[100px] text-sm mt-1"
                      />
                    </div>

                    {/* Botão Salvar */}
                    <Button
                      onClick={async () => {
                        // LOG DE DEBUG
                        console.log('🔍 DEBUG - Estado atual do viewingTicket:', {
                          id: viewingTicket.id,
                          responsible: viewingTicket.responsible,
                          status: viewingTicket.status,
                          deadline: viewingTicket.deadline
                        });

                        // Validar se mudou o prazo e tem motivo
                        if (originalDeadline !== viewingTicket.deadline && viewingTicket.deadline && !deadlineChangeReason.trim()) {
                          toast.error('Por favor, informe o motivo da mudança de prazo!');
                          return;
                        }

                        // Preparar o retorno da construtora com histórico de mudanças de prazo
                        let updatedConstructorReturn = viewingTicket.constructorReturn || '';

                        if (originalDeadline !== viewingTicket.deadline && viewingTicket.deadline && deadlineChangeReason.trim()) {
                          const now = new Date().toLocaleString('pt-BR');
                          const changeLog = `\n\n--- Mudança de Prazo [${now}] ---\nPrazo anterior: ${originalDeadline ? formatDate(originalDeadline) : 'Não definido'}\nNovo prazo: ${formatDate(viewingTicket.deadline)}\nMotivo: ${deadlineChangeReason}\n----------------------------`;
                          updatedConstructorReturn = updatedConstructorReturn + changeLog;
                        }

                        const updatePayload = {
                          status: viewingTicket.status,
                          deadline: viewingTicket.deadline,
                          constructorReturn: updatedConstructorReturn,
                          engineeringOpinion: viewingTicket.engineeringOpinion,
                        };

                        console.log('📤 DEBUG - Payload de atualização:', updatePayload);

                        try {
                          await dataService.updateTicket(viewingTicket.id, updatePayload);
                          toast.success('Chamado atualizado com sucesso!');
                          setViewingTicket(null);
                          setOriginalDeadline(undefined);
                          setDeadlineChangeReason('');
                          setOriginalResponsible(undefined);
                          setResponsibleChangeReason('');
                          loadTicketsForBuilding();
                        } catch (error) {
                          console.error('Erro ao atualizar:', error);
                          toast.error('Erro ao atualizar chamado. Tente novamente.');
                        }
                      }}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Alterações
                    </Button>
                  </div>
                </div>
              )}

              {!isAdmin && (
                <>
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
                    {/* Data de Abertura */}
                    <div>
                      <label className="text-sm font-semibold text-foreground">Data de Abertura</label>
                      <p className="text-sm text-muted-foreground mt-1">{formatDate(viewingTicket.createdAt)}</p>
                    </div>

                    {/* Responsável */}
                    <div>
                      <label className="text-sm font-semibold text-foreground">Responsável</label>
                      <p className="text-sm text-muted-foreground mt-1">{viewingTicket.responsible || 'Construtora'}</p>
                    </div>
                  </div>

                </>
              )}

              {/* LINHA DO TEMPO DO CHAMADO */}
              <div className="border-t border-border pt-4 mt-4">
                <div className="flex items-center justify-between mb-4">
                  <label className="text-sm font-bold text-foreground flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Linha do Tempo do Chamado
                  </label>
                  {isAdmin && (
                    <Button
                      size="sm"
                      onClick={() => setAddingUpdateToTicket(viewingTicket)}
                      className="bg-green-600 hover:bg-green-700 gap-1 h-8"
                    >
                      <Plus className="w-4 h-4" />
                      Adicionar Atualização
                    </Button>
                  )}
                </div>

                <div className="space-y-0 max-h-[400px] overflow-y-auto pr-2">
                  {/* Monta a linha do tempo completa */}
                  {(() => {
                    const ticketUser = users.find(u => u.id === viewingTicket.userId);

                    // Criar array de todos os eventos
                    type TimelineEvent = {
                      id: string;
                      date: string;
                      type: 'abertura' | 'reprogramacao' | 'construtora' | 'condominio' | 'engenharia';
                      message: string;
                      author: string;
                    };

                    const events: TimelineEvent[] = [];

                    // 1. Evento de abertura do chamado
                    events.push({
                      id: 'abertura',
                      date: viewingTicket.createdAt,
                      type: 'abertura',
                      message: `Solicitou abertura de chamado`,
                      author: ticketUser?.name || 'Usuário'
                    });

                    // 2. Histórico de reprogramações
                    if (viewingTicket.reprogrammingHistory) {
                      viewingTicket.reprogrammingHistory.forEach((item, index) => {
                        events.push({
                          id: `reprog-${index}`,
                          date: item.updatedAt || item.date,
                          type: 'reprogramacao',
                          message: `Reprogramação para ${formatDate(item.date)}${item.reason ? `: ${item.reason}` : ''}`,
                          author: 'Sistema'
                        });
                      });
                    }

                    // 3. Atualizações/Pareceres
                    if (viewingTicket.updates) {
                      viewingTicket.updates.forEach(update => {
                        events.push({
                          id: update.id,
                          date: update.createdAt,
                          type: update.type,
                          message: update.message,
                          author: update.createdBy
                        });
                      });
                    }

                    // Ordenar por data (mais antigo primeiro - abertura no topo)
                    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

                    // Configuração visual para cada tipo
                    const eventConfig: Record<string, { icon: string; color: string; bgColor: string; label: string }> = {
                      abertura: { icon: '📋', color: 'text-green-600 dark:text-green-400', bgColor: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800', label: 'Abertura' },
                      reprogramacao: { icon: '📅', color: 'text-amber-600 dark:text-amber-400', bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800', label: 'Reprogramação' },
                      construtora: { icon: '🏗️', color: 'text-orange-600 dark:text-orange-400', bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800', label: 'Construtora' },
                      condominio: { icon: '🏢', color: 'text-blue-600 dark:text-blue-400', bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800', label: 'Condomínio' },
                      engenharia: { icon: '⚙️', color: 'text-purple-600 dark:text-purple-400', bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800', label: 'Engenharia' },
                    };

                    return events.map((event, index) => {
                      const config = eventConfig[event.type];
                      const isLast = index === events.length - 1;
                      const isAbertura = event.type === 'abertura';

                      return (
                        <div key={event.id} className="relative flex gap-3">
                          {/* Linha vertical conectando os eventos */}
                          {!isLast && (
                            <div className="absolute left-[19px] top-10 bottom-0 w-0.5 bg-border" />
                          )}

                          {/* Ícone do evento */}
                          <div className={cn(
                            "flex-shrink-0 rounded-full flex items-center justify-center border-2 bg-background z-10",
                            isAbertura ? "w-12 h-12 text-2xl" : "w-10 h-10 text-lg",
                            config.bgColor
                          )}>
                            {config.icon}
                          </div>

                          {/* Conteúdo do evento */}
                          <div className={cn("flex-1 pb-4 min-w-0")}>
                            <Card className={cn("border", isAbertura ? "p-4" : "p-3", config.bgColor)}>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className={cn("font-bold uppercase", isAbertura ? "text-sm" : "text-xs", config.color)}>
                                  {config.label}
                                </span>
                                <span className={cn("text-muted-foreground", isAbertura ? "text-xs" : "text-[10px]")}>
                                  {new Date(event.date).toLocaleDateString('pt-BR', {
                                    day: '2-digit',
                                    month: '2-digit',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </span>
                              </div>

                              {isAbertura ? (
                                <p className="text-base text-foreground">
                                  <span className="font-bold">{event.author}</span> solicitou abertura de chamado
                                </p>
                              ) : (
                                <>
                                  <p className="text-sm text-foreground whitespace-pre-wrap">{event.message}</p>
                                  <p className="text-xs text-muted-foreground mt-2 font-medium">
                                    Por: {event.author}
                                  </p>
                                </>
                              )}
                            </Card>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Fotos */}
              <div>
                <label className="text-sm font-semibold text-foreground">
                  Evidências
                  {loadingPhotos ? ' (Carregando...)' : viewingTicketPhotos.length > 0 ? ` (${viewingTicketPhotos.length} fotos)` : ' (Nenhuma foto)'}
                </label>
                {loadingPhotos ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                  </div>
                ) : viewingTicketPhotos.length > 0 ? (
                  <>
                    <div className="mt-2 grid grid-cols-3 gap-2">
                      {viewingTicketPhotos.map((url, index) => (
                        <div
                          key={index}
                          className="relative aspect-square rounded-md overflow-hidden border border-border cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                          onClick={() => {
                            // Criar ticket temporário com as fotos carregadas para a galeria
                            const ticketWithPhotos = { ...viewingTicket, photoUrls: viewingTicketPhotos };
                            setViewingTicket(null);
                            setSelectedTicketForGallery(ticketWithPhotos);
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
                  </>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Reprogramação */}
      {reprogrammingTicket && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  📅 Adicionar Reprogramação
                  {reprogrammingTicket.externalTicketId && (
                    <span className="text-sm bg-orange-600 text-white px-2 py-0.5 rounded-full font-bold">
                      Nº {reprogrammingTicket.externalTicketId}
                    </span>
                  )}
                </CardTitle>
                <p className="text-muted-foreground text-xs mt-1">
                  {buildings.find(b => b.id === reprogrammingTicket.buildingId)?.name || 'Prédio não encontrado'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setReprogrammingTicket(null);
                  setReprogrammingDate('');
                  setReprogrammingReason('');
                }}
                className="hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Data de Reprogramação */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Nova Data de Reprogramação *
                </label>
                <Input
                  type="date"
                  value={reprogrammingDate}
                  onChange={(e) => setReprogrammingDate(e.target.value)}
                  className="text-orange-600 dark:text-orange-400 font-bold"
                  required
                />
              </div>

              {/* Motivo da Reprogramação */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Motivo da Reprogramação *
                </label>
                <Textarea
                  value={reprogrammingReason}
                  onChange={(e) => setReprogrammingReason(e.target.value)}
                  placeholder="Descreva o motivo da reprogramação..."
                  className="min-h-[120px] resize-none"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Este motivo será automaticamente adicionado ao campo "Retorno da Construtora"
                </p>
              </div>

              {/* Histórico Atual */}
              {reprogrammingTicket.reprogrammingHistory && reprogrammingTicket.reprogrammingHistory.length > 0 && (
                <div className="pt-4 border-t">
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Histórico de Reprogramações ({reprogrammingTicket.reprogrammingHistory.length})
                  </label>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {reprogrammingTicket.reprogrammingHistory.map((item: any, index: number) => (
                      <div key={index} className="text-xs bg-muted/50 p-3 rounded flex items-start justify-between gap-2 group hover:bg-muted transition-colors">
                        <div className="flex-1">
                          <div className="font-semibold text-amber-600 dark:text-amber-400">
                            #{index + 1} - {formatDate(item.date)}
                          </div>
                          {item.reason && (
                            <div className="text-muted-foreground mt-1">{item.reason}</div>
                          )}
                        </div>
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSingleReprogramming(reprogrammingTicket, index);
                          }}
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                          title="Remover esta reprogramação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 italic">
                    💡 Passe o mouse sobre cada item para ver o botão de exclusão
                  </p>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={saveReprogramming}
                  className="flex-1 bg-orange-600 hover:bg-orange-700 font-bold gap-2"
                >
                  <Save className="w-4 h-4" />
                  Salvar Reprogramação
                </Button>
                <Button
                  onClick={() => {
                    setReprogrammingTicket(null);
                    setReprogrammingDate('');
                    setReprogrammingReason('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Mudança de Responsável */}
      {responsibleChangeTicket && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  🔄 Mudança de Responsável
                  {responsibleChangeTicket.externalTicketId && (
                    <span className="text-sm bg-purple-600 text-white px-2 py-0.5 rounded-full font-bold">
                      Nº {responsibleChangeTicket.externalTicketId}
                    </span>
                  )}
                </CardTitle>
                <p className="text-muted-foreground text-xs mt-1">
                  {buildings.find(b => b.id === responsibleChangeTicket.buildingId)?.name || 'Prédio não encontrado'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setResponsibleChangeTicket(null);
                  setResponsibleChangeNewValue('Condomínio');
                  setResponsibleChangeReasonModal('');
                }}
                className="hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Informação da mudança */}
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                <div className="flex items-center justify-between">
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground mb-1">De</p>
                    <p className="text-lg font-bold text-red-600 dark:text-red-400">
                      {responsibleChangeTicket.responsible || 'Construtora'}
                    </p>
                  </div>
                  <div className="px-4">
                    <span className="text-2xl">➔</span>
                  </div>
                  <div className="text-center flex-1">
                    <p className="text-xs text-muted-foreground mb-1">Para</p>
                    <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                      {responsibleChangeNewValue}
                    </p>
                  </div>
                </div>
              </div>

              {/* Motivo da Mudança */}
              <div>
                <label className="text-sm font-semibold text-foreground mb-2 block">
                  Motivo da Mudança de Responsável *
                </label>
                <Textarea
                  value={responsibleChangeReasonModal}
                  onChange={(e) => setResponsibleChangeReasonModal(e.target.value)}
                  placeholder="Descreva o motivo da mudança de responsável..."
                  className="min-h-[120px] resize-none"
                  required
                />
                <p className="text-xs text-muted-foreground mt-2">
                  💡 Este motivo será automaticamente adicionado ao campo "Parecer da Engenharia" com data e hora
                </p>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4">
                <Button
                  onClick={saveResponsibleChange}
                  className="flex-1 bg-purple-600 hover:bg-purple-700 font-bold gap-2"
                >
                  <Save className="w-4 h-4" />
                  Confirmar Mudança
                </Button>
                <Button
                  onClick={() => {
                    setResponsibleChangeTicket(null);
                    setResponsibleChangeNewValue('Condomínio');
                    setResponsibleChangeReasonModal('');
                  }}
                  variant="outline"
                  className="flex-1"
                >
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Adicionar Atualização/Parecer */}
      {addingUpdateToTicket && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="w-full max-w-lg shadow-2xl border">
            <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
              <div className="flex-1">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Plus className="w-5 h-5" />
                  Adicionar Atualização
                  {addingUpdateToTicket.externalTicketId && (
                    <span className="text-sm bg-green-600 text-white px-2 py-0.5 rounded-full font-bold">
                      Nº {addingUpdateToTicket.externalTicketId}
                    </span>
                  )}
                </CardTitle>
                <p className="text-muted-foreground text-xs mt-1">
                  {buildings.find(b => b.id === addingUpdateToTicket.buildingId)?.name || 'Prédio não encontrado'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setAddingUpdateToTicket(null);
                  setNewUpdateType(null);
                  setNewUpdateMessage('');
                }}
                className="hover:bg-muted"
              >
                <X className="w-5 h-5" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              {/* Seleção do tipo de parecer */}
              {!newUpdateType ? (
                <div className="space-y-3">
                  <label className="text-sm font-semibold text-foreground mb-2 block">
                    Selecione o tipo de atualização:
                  </label>
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant="outline"
                      className="h-16 flex items-center justify-start gap-4 px-4 border-2 hover:border-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/20"
                      onClick={() => setNewUpdateType('construtora')}
                    >
                      <span className="text-3xl">🏗️</span>
                      <div className="text-left">
                        <p className="font-bold text-orange-600 dark:text-orange-400">Parecer da Construtora</p>
                        <p className="text-xs text-muted-foreground">Retorno ou alegação da construtora</p>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex items-center justify-start gap-4 px-4 border-2 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => setNewUpdateType('condominio')}
                    >
                      <span className="text-3xl">🏢</span>
                      <div className="text-left">
                        <p className="font-bold text-blue-600 dark:text-blue-400">Parecer do Condomínio</p>
                        <p className="text-xs text-muted-foreground">Observação ou resposta do condomínio</p>
                      </div>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-16 flex items-center justify-start gap-4 px-4 border-2 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/20"
                      onClick={() => setNewUpdateType('engenharia')}
                    >
                      <span className="text-3xl">⚙️</span>
                      <div className="text-left">
                        <p className="font-bold text-purple-600 dark:text-purple-400">Parecer da Engenharia</p>
                        <p className="text-xs text-muted-foreground">Análise técnica ou avaliação</p>
                      </div>
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Tipo selecionado */}
                  <div className={cn("p-3 rounded-lg border-2", UPDATE_TYPE_CONFIG[newUpdateType].bgColor)}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{UPDATE_TYPE_CONFIG[newUpdateType].icon}</span>
                      <div>
                        <p className={cn("font-bold", UPDATE_TYPE_CONFIG[newUpdateType].color)}>
                          {UPDATE_TYPE_CONFIG[newUpdateType].label}
                        </p>
                        <button
                          className="text-xs text-muted-foreground hover:underline"
                          onClick={() => setNewUpdateType(null)}
                        >
                          ← Trocar tipo
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Campo de texto */}
                  <div>
                    <label className="text-sm font-semibold text-foreground mb-2 block">
                      Descrição da atualização *
                    </label>
                    <Textarea
                      value={newUpdateMessage}
                      onChange={(e) => setNewUpdateMessage(e.target.value)}
                      placeholder="Digite o parecer ou atualização..."
                      className="min-h-[150px] resize-none"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      ⚠️ Após salvar, esta atualização não poderá ser apagada. Se errar, adicione uma nova com errata.
                    </p>
                  </div>

                  {/* Botões */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      onClick={async () => {
                        if (!newUpdateMessage.trim()) {
                          toast.error('Por favor, digite a descrição da atualização!');
                          return;
                        }

                        setIsSavingUpdate(true);
                        try {
                          const newUpdate: TicketUpdate = {
                            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                            type: newUpdateType,
                            message: newUpdateMessage.trim(),
                            createdAt: new Date().toISOString(),
                            createdBy: user?.name || 'Usuário'
                          };

                          const currentUpdates = addingUpdateToTicket.updates || [];
                          const updatedUpdates = [...currentUpdates, newUpdate];

                          await dataService.updateTicket(addingUpdateToTicket.id, {
                            updates: updatedUpdates
                          });

                          // Atualizar o ticket local
                          setTickets(prev => prev.map(t =>
                            t.id === addingUpdateToTicket.id
                              ? { ...t, updates: updatedUpdates }
                              : t
                          ));

                          // Atualizar o modal de visualização se estiver aberto
                          if (viewingTicket && viewingTicket.id === addingUpdateToTicket.id) {
                            setViewingTicket({ ...viewingTicket, updates: updatedUpdates });
                          }

                          toast.success('Atualização adicionada com sucesso!');
                          setAddingUpdateToTicket(null);
                          setNewUpdateType(null);
                          setNewUpdateMessage('');
                        } catch (error) {
                          console.error('Erro ao salvar atualização:', error);
                          toast.error('Erro ao salvar atualização. Tente novamente.');
                        } finally {
                          setIsSavingUpdate(false);
                        }
                      }}
                      disabled={isSavingUpdate || !newUpdateMessage.trim()}
                      className="flex-1 bg-green-600 hover:bg-green-700 font-bold gap-2"
                    >
                      {isSavingUpdate ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Salvando...
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Salvar Atualização
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => {
                        setAddingUpdateToTicket(null);
                        setNewUpdateType(null);
                        setNewUpdateMessage('');
                      }}
                      variant="outline"
                      className="flex-1"
                      disabled={isSavingUpdate}
                    >
                      Cancelar
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal de Visualização do Histórico Completo (Linha do Tempo) */}
      {viewingHistoryTicket && (() => {
        // Montar linha do tempo unificada
        const timelineItems: { date: string; type: string; icon: string; color: string; bgColor: string; title: string; content: string; canDelete?: boolean; deleteIndex?: number }[] = [];

        // 1. Abertura do chamado
        if (viewingHistoryTicket.createdAt) {
          const ticketUser = users.find(u => u.id === viewingHistoryTicket.userId);
          timelineItems.push({
            date: viewingHistoryTicket.createdAt,
            type: 'abertura',
            icon: '📋',
            color: 'text-blue-600 dark:text-blue-400',
            bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
            title: 'Abertura do Chamado',
            content: `${ticketUser?.name || 'Usuário'} solicitou abertura do chamado.\n\nLocal: ${viewingHistoryTicket.location}\n\nDescrição: ${viewingHistoryTicket.description}`
          });
        }

        // 2. Retorno da Construtora (campo antigo)
        if (viewingHistoryTicket.constructorReturn) {
          timelineItems.push({
            date: viewingHistoryTicket.createdAt, // Usar data de criação como fallback
            type: 'construtora_antigo',
            icon: '🏗️',
            color: 'text-orange-600 dark:text-orange-400',
            bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800',
            title: 'Retorno da Construtora',
            content: viewingHistoryTicket.constructorReturn
          });
        }

        // 3. Parecer da Engenharia (campo antigo)
        if (viewingHistoryTicket.engineeringOpinion) {
          timelineItems.push({
            date: viewingHistoryTicket.createdAt, // Usar data de criação como fallback
            type: 'engenharia_antigo',
            icon: '⚙️',
            color: 'text-purple-600 dark:text-purple-400',
            bgColor: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
            title: 'Parecer da Engenharia',
            content: viewingHistoryTicket.engineeringOpinion
          });
        }

        // 4. Reprogramações
        if (viewingHistoryTicket.reprogrammingHistory && viewingHistoryTicket.reprogrammingHistory.length > 0) {
          viewingHistoryTicket.reprogrammingHistory.forEach((item: any, index: number) => {
            timelineItems.push({
              date: item.updatedAt || item.date,
              type: 'reprogramacao',
              icon: '🔄',
              color: 'text-amber-600 dark:text-amber-400',
              bgColor: 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800',
              title: `Reprogramação para ${formatDate(item.date)}`,
              content: item.reason || 'Sem motivo informado',
              canDelete: true,
              deleteIndex: index
            });
          });
        }

        // 5. Updates/Pareceres novos
        if (viewingHistoryTicket.updates && viewingHistoryTicket.updates.length > 0) {
          viewingHistoryTicket.updates.forEach((update: TicketUpdate) => {
            const typeConfig = UPDATE_TYPE_CONFIG[update.type];
            timelineItems.push({
              date: update.createdAt,
              type: update.type,
              icon: typeConfig.icon,
              color: typeConfig.color,
              bgColor: typeConfig.bgColor,
              title: `${typeConfig.label}`,
              content: `${update.message}\n\n— ${update.createdBy}`
            });
          });
        }

        // Ordenar por data (mais antigo primeiro)
        timelineItems.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        return (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
            <Card className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl border">
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    📜 Linha do Tempo
                    {viewingHistoryTicket.externalTicketId && (
                      <span className="text-sm bg-amber-600 text-white px-2 py-0.5 rounded-full font-bold">
                        Nº {viewingHistoryTicket.externalTicketId}
                      </span>
                    )}
                  </CardTitle>
                  <p className="text-muted-foreground text-xs mt-1">
                    {buildings.find(b => b.id === viewingHistoryTicket.buildingId)?.name || 'Prédio não encontrado'} • {viewingHistoryTicket.location}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setViewingHistoryTicket(null)}
                  className="hover:bg-muted"
                >
                  <X className="w-5 h-5" />
                </Button>
              </CardHeader>
              <CardContent className="p-6 overflow-y-auto">
                {timelineItems.length > 0 ? (
                  <div className="relative">
                    {/* Linha vertical */}
                    <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-muted-foreground/20"></div>

                    <div className="space-y-4">
                      {timelineItems.map((item, index) => (
                        <div key={index} className="relative pl-10 group">
                          {/* Ícone na linha */}
                          <div className="absolute left-0 w-8 h-8 rounded-full bg-background border-2 border-muted flex items-center justify-center text-lg">
                            {item.icon}
                          </div>

                          <Card className={cn("p-4 border-2 transition-colors", item.bgColor)}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <span className={cn("text-sm font-bold", item.color)}>
                                    {item.title}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {new Date(item.date).toLocaleDateString('pt-BR', {
                                      day: '2-digit', month: '2-digit', year: 'numeric',
                                      hour: '2-digit', minute: '2-digit'
                                    })}
                                  </span>
                                </div>
                                <div className="text-sm text-foreground whitespace-pre-wrap">
                                  {item.content}
                                </div>
                              </div>
                              {item.canDelete && isAdmin && (
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    removeSingleReprogramming(viewingHistoryTicket, item.deleteIndex!);
                                  }}
                                  size="sm"
                                  variant="ghost"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity"
                                  title="Remover"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </Card>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Nenhum histórico encontrado
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        );
      })()}

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

