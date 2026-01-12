"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, ClipboardPaste } from 'lucide-react';
import { toast } from 'sonner';
import { dataService } from '@/lib/data';
import { Building } from '@/lib/mockData';

interface ExcelRow {
  // Colunas EXATAS da planilha (com espaços e pontuação)
  'Chamado '?: string | number;
  'Pendência:'?: string;
  'Situação'?: string;
  'Abertura'?: string | number;
  'Retorno'?: string;
  'Prazo'?: string | number;

  // Alternativas (caso use outras planilhas)
  Chamado?: string | number;
  Local?: string;
  Descrição?: string;
  Descricao?: string;
  Situação?: string;
  Situacao?: string;
  Abertura?: string | number;
  Reprogramação?: string;
  Reprogramacao?: string;
  Retorno?: string;
  Prédio?: string;
  Empreendimento?: string;
  Status?: string;
  Data?: string | number;
  'ID Chamado'?: string | number;
  'Número'?: string | number;
}

interface ParsedTicket {
  buildingId: string;
  buildingName: string;
  location: string;
  description: string;
  status: string;
  createdAt: string;
  deadline?: string;
  externalTicketId?: string;
  row: number;
  error?: string;
}

const STATUS_MAP: Record<string, string> = {
  'itens apontados': 'itens_apontados',
  'em andamento': 'em_andamento',
  'improcedente': 'improcedente',
  'aguardando vistoria': 'aguardando_vistoria',
  'concluído': 'concluido',
  'concluido': 'concluido',
  'f. indevido': 'f_indevido',
  'f indevido': 'f_indevido'
};

export function ImportTickets({ buildings, userId, onImportComplete }: {
  buildings: Building[];
  userId: string;
  onImportComplete: () => void;
}) {
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>('');
  const [parsedTickets, setParsedTickets] = useState<ParsedTicket[]>([]);
  const [isImporting, setIsImporting] = useState(false);
  const [importMode, setImportMode] = useState<'excel' | 'paste'>('paste');

  // Campos para importação por cópia e colagem
  const [pasteData, setPasteData] = useState({
    chamados: '',
    pendencias: '',
    situacoes: '',
    aberturas: '',
    prazos: ''
  });

  const findBuildingId = (buildingName: string): string | null => {
    const normalized = buildingName?.toLowerCase().trim();
    const building = buildings.find(b =>
      b.name.toLowerCase().includes(normalized) ||
      normalized.includes(b.name.toLowerCase())
    );
    return building?.id || null;
  };

  const normalizeStatus = (status: string): string => {
    const normalized = status?.toLowerCase().trim();
    return STATUS_MAP[normalized] || 'aguardando_vistoria';
  };

  const parseExcelDate = (excelDate: any): string | undefined => {
    if (!excelDate) return undefined;

    // Se já for string de data
    if (typeof excelDate === 'string') {
      const trimmed = excelDate.trim();
      if (!trimmed) return undefined;
      const date = new Date(trimmed);
      return isNaN(date.getTime()) ? undefined : date.toISOString();
    }

    // Se for número (serial date do Excel)
    if (typeof excelDate === 'number') {
      // Excel armazena datas como número de dias desde 30/12/1899
      // 25569 = dias entre 30/12/1899 e 01/01/1970 (época Unix)
      const EXCEL_EPOCH_OFFSET = 25569;
      const MS_PER_DAY = 86400 * 1000;

      // Calcular milissegundos desde época Unix
      const unixTimestamp = (excelDate - EXCEL_EPOCH_OFFSET) * MS_PER_DAY;

      // Criar data em UTC para evitar problemas de timezone
      const date = new Date(unixTimestamp);

      // Ajustar para meio-dia UTC para evitar mudanças de dia por timezone
      const year = date.getUTCFullYear();
      const month = date.getUTCMonth();
      const day = date.getUTCDate();

      const adjustedDate = new Date(Date.UTC(year, month, day, 12, 0, 0, 0));
      return adjustedDate.toISOString();
    }

    return undefined;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedBuildingId) {
      toast.error('Selecione o prédio primeiro!');
      e.target.value = '';
      return;
    }

    const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

    try {
      console.log('📂 Lendo arquivo:', file.name, 'Tamanho:', file.size, 'bytes');

      const data = await file.arrayBuffer();
      console.log('✅ ArrayBuffer criado:', data.byteLength, 'bytes');

      const workbook = XLSX.read(data, { type: 'array' });
      console.log('✅ Workbook lido. Planilhas:', workbook.SheetNames);

      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      console.log('✅ Planilha selecionada:', workbook.SheetNames[0]);

      const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
      console.log('✅ Dados convertidos para JSON:', jsonData.length, 'linhas');
      console.log('📋 Primeira linha (exemplo):', jsonData[0]);

      const parsed: ParsedTicket[] = jsonData.map((row, index) => {
        // Pegar a descrição da coluna "Pendência:" (com dois pontos) ou alternativas
        const descricao = row['Pendência:'] || row.Descrição || row.Descricao || '';

        // Pegar o número do chamado (com espaço no nome) ou alternativas
        const numeroChamado = row['Chamado '] || row.Chamado || row['ID Chamado'] || row['Número'];

        // Local pode ser vazio ou "Não especificado"
        const local = row.Local || 'Não especificado';

        const abertura = parseExcelDate(row.Abertura || row.Data);

        const ticket: ParsedTicket = {
          buildingId: selectedBuildingId,
          buildingName: selectedBuilding?.name || '',
          location: local,
          description: descricao,
          status: normalizeStatus(row['Situação'] || row.Situação || row.Situacao || row.Status || ''),
          createdAt: abertura || new Date().toISOString(), // Usa data atual apenas se necessário
          deadline: row.Prazo ? parseExcelDate(row.Prazo) : undefined,
          externalTicketId: numeroChamado ? String(numeroChamado) : undefined,
          row: index + 2, // +2 porque Excel começa em 1 e tem cabeçalho
        };

        // Validações
        if (!ticket.description) {
          ticket.error = 'Pendência/Descrição não informada';
        } else if (!abertura) {
          ticket.error = 'Data de Abertura não informada';
        }

        return ticket;
      });

      setParsedTickets(parsed);

      const errors = parsed.filter(t => t.error).length;
      const valid = parsed.length - errors;

      if (errors > 0) {
        toast.warning(`${valid} chamados válidos, ${errors} com erro`);
      } else {
        toast.success(`${valid} chamados prontos para importar!`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao ler Excel:', error);
      const errorMessage = error?.message || 'Erro desconhecido';
      toast.error(`Erro ao ler Excel: ${errorMessage}`, { duration: 5000 });
    }

    // Limpar input
    e.target.value = '';
  };

  const handlePasteImport = () => {
    if (!selectedBuildingId) {
      toast.error('Selecione o prédio primeiro!');
      return;
    }

    const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

    try {
      // Dividir cada coluna por linhas
      const chamadosArray = pasteData.chamados.split('\n').map(s => s.trim()).filter(s => s);
      const pendenciasArray = pasteData.pendencias.split('\n').map(s => s.trim()).filter(s => s);
      const situacoesArray = pasteData.situacoes.split('\n').map(s => s.trim());
      const aberturasArray = pasteData.aberturas.split('\n').map(s => s.trim());
      const prazosArray = pasteData.prazos.split('\n').map(s => s.trim());

      // Usar o maior array como referência
      const maxLength = Math.max(
        chamadosArray.length,
        pendenciasArray.length,
        situacoesArray.length,
        aberturasArray.length
      );

      if (maxLength === 0) {
        toast.error('Cole ao menos os números de chamado ou as pendências!');
        return;
      }

      const parsed: ParsedTicket[] = [];

      for (let i = 0; i < maxLength; i++) {
        const chamado = chamadosArray[i] || '';
        const pendencia = pendenciasArray[i] || '';
        const situacao = situacoesArray[i] || '';
        const abertura = aberturasArray[i] || '';
        const prazo = prazosArray[i] || '';

        const dataAbertura = parseExcelDate(abertura);

        const ticket: ParsedTicket = {
          buildingId: selectedBuildingId,
          buildingName: selectedBuilding?.name || '',
          location: 'Não especificado',
          description: pendencia,
          status: normalizeStatus(situacao || ''),
          createdAt: dataAbertura || new Date().toISOString(), // Usa data atual apenas se necessário
          deadline: prazo ? parseExcelDate(prazo) : undefined,
          externalTicketId: chamado || undefined,
          row: i + 1,
        };

        // Validações
        if (!ticket.description) {
          ticket.error = 'Pendência/Descrição não informada';
        } else if (!dataAbertura) {
          ticket.error = 'Data de Abertura não informada';
        }

        parsed.push(ticket);
      }

      setParsedTickets(parsed);

      const errors = parsed.filter(t => t.error).length;
      const valid = parsed.length - errors;

      if (errors > 0) {
        toast.warning(`${valid} chamados válidos, ${errors} com erro`);
      } else {
        toast.success(`${valid} chamados prontos para importar!`);
      }
    } catch (error: any) {
      console.error('❌ Erro ao processar dados colados:', error);
      toast.error(`Erro ao processar dados: ${error?.message || 'Erro desconhecido'}`, { duration: 5000 });
    }
  };

  const handleImport = async () => {
    const validTickets = parsedTickets.filter(t => !t.error);
    if (validTickets.length === 0) {
      toast.error('Nenhum chamado válido para importar');
      return;
    }

    setIsImporting(true);
    const toastId = toast.loading(`Importando ${validTickets.length} chamados...`);

    try {
      let imported = 0;
      let failed = 0;

      for (const ticket of validTickets) {
        try {
          await dataService.importTicket({
            buildingId: ticket.buildingId,
            userId,
            location: ticket.location,
            description: ticket.description,
            photoUrls: [],
            status: ticket.status,
            createdAt: ticket.createdAt,
            deadline: ticket.deadline,
            externalTicketId: ticket.externalTicketId,
          });
          imported++;
        } catch (error) {
          console.error(`Erro na linha ${ticket.row}:`, error);
          failed++;
        }
      }

      if (failed === 0) {
        toast.success(`${imported} chamados importados com sucesso!`, { id: toastId });
      } else {
        toast.warning(`${imported} importados, ${failed} falharam`, { id: toastId });
      }

      setParsedTickets([]);
      onImportComplete();
    } catch (error) {
      toast.error('Erro ao importar chamados', { id: toastId });
    } finally {
      setIsImporting(false);
    }
  };

  const validCount = parsedTickets.filter(t => !t.error).length;
  const errorCount = parsedTickets.filter(t => t.error).length;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Importar Chamados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Seletor de Prédio */}
          <div className="space-y-2">
            <Label htmlFor="building-select">1. Selecione o Prédio</Label>
            <Select value={selectedBuildingId} onValueChange={setSelectedBuildingId}>
              <SelectTrigger id="building-select">
                <SelectValue placeholder="Escolha o prédio..." />
              </SelectTrigger>
              <SelectContent>
                {buildings.map(building => (
                  <SelectItem key={building.id} value={building.id}>
                    {building.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tabs para escolher método de importação */}
          <Tabs value={importMode} onValueChange={(v) => setImportMode(v as 'excel' | 'paste')} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="paste" className="flex items-center gap-2">
                <ClipboardPaste className="w-4 h-4" />
                Copiar e Colar
              </TabsTrigger>
              <TabsTrigger value="excel" className="flex items-center gap-2">
                <Upload className="w-4 h-4" />
                Upload Excel
              </TabsTrigger>
            </TabsList>

            {/* Modo: Copiar e Colar */}
            <TabsContent value="paste" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>2. Cole os dados da planilha (uma linha por chamado)</Label>
                <p className="text-xs text-muted-foreground mb-2">
                  Copie cada coluna do Excel e cole nos campos abaixo. As linhas serão combinadas automaticamente.
                </p>
              </div>

              <div className="space-y-3">
                <div className="space-y-1">
                  <Label htmlFor="chamados">Números de Chamado (opcional)</Label>
                  <Textarea
                    id="chamados"
                    placeholder="Cole aqui os números de chamado&#10;Um por linha"
                    value={pasteData.chamados}
                    onChange={(e) => setPasteData({ ...pasteData, chamados: e.target.value })}
                    rows={4}
                    disabled={!selectedBuildingId}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="pendencias">Pendências/Descrições (obrigatório)</Label>
                  <Textarea
                    id="pendencias"
                    placeholder="Cole aqui as pendências&#10;Uma por linha"
                    value={pasteData.pendencias}
                    onChange={(e) => setPasteData({ ...pasteData, pendencias: e.target.value })}
                    rows={4}
                    disabled={!selectedBuildingId}
                    className="border-blue-300"
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="situacoes">Situações (opcional)</Label>
                  <Textarea
                    id="situacoes"
                    placeholder="Cole aqui as situações&#10;Uma por linha (ex: concluído, em andamento)"
                    value={pasteData.situacoes}
                    onChange={(e) => setPasteData({ ...pasteData, situacoes: e.target.value })}
                    rows={4}
                    disabled={!selectedBuildingId}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="aberturas">Datas de Abertura (opcional)</Label>
                  <Textarea
                    id="aberturas"
                    placeholder="Cole aqui as datas de abertura&#10;Uma por linha"
                    value={pasteData.aberturas}
                    onChange={(e) => setPasteData({ ...pasteData, aberturas: e.target.value })}
                    rows={4}
                    disabled={!selectedBuildingId}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="prazos">Prazos (opcional)</Label>
                  <Textarea
                    id="prazos"
                    placeholder="Cole aqui os prazos&#10;Um por linha"
                    value={pasteData.prazos}
                    onChange={(e) => setPasteData({ ...pasteData, prazos: e.target.value })}
                    rows={4}
                    disabled={!selectedBuildingId}
                  />
                </div>
              </div>

              <Button
                onClick={handlePasteImport}
                disabled={!selectedBuildingId || !pasteData.pendencias.trim()}
                className="w-full"
              >
                Processar Dados Colados
              </Button>
            </TabsContent>

            {/* Modo: Upload Excel */}
            <TabsContent value="excel" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>2. Faça Upload da Planilha Excel</Label>
                <div className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${
                  selectedBuildingId ? 'border-border hover:border-blue-500 cursor-pointer' : 'border-muted-foreground/20 opacity-50'
                }`}>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="excel-upload"
                    disabled={isImporting || !selectedBuildingId}
                  />
                  <label htmlFor="excel-upload" className={selectedBuildingId ? 'cursor-pointer' : 'cursor-not-allowed'}>
                    <Upload className={`w-12 h-12 mx-auto mb-4 ${selectedBuildingId ? 'text-muted-foreground' : 'text-muted-foreground/50'}`} />
                    <p className="text-sm text-muted-foreground mb-2">
                      {selectedBuildingId ? 'Clique para selecionar arquivo Excel (.xlsx, .xls)' : 'Selecione um prédio primeiro'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Colunas: Chamado, Pendência, Situação, Abertura, Prazo
                    </p>
                  </label>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {parsedTickets.length > 0 && (
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{validCount} válidos</span>
                </div>
                {errorCount > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>{errorCount} com erro</span>
                  </div>
                )}
              </div>

              <div className="max-h-96 overflow-y-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-muted sticky top-0">
                    <tr>
                      <th className="p-2 text-left">Linha</th>
                      <th className="p-2 text-left">Prédio</th>
                      <th className="p-2 text-left">Local</th>
                      <th className="p-2 text-left">Status</th>
                      <th className="p-2 text-left">✓</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedTickets.map((ticket, i) => (
                      <tr key={i} className={ticket.error ? 'bg-red-50 dark:bg-red-900/10' : ''}>
                        <td className="p-2">{ticket.row}</td>
                        <td className="p-2">{ticket.buildingName}</td>
                        <td className="p-2">{ticket.location}</td>
                        <td className="p-2">{ticket.status}</td>
                        <td className="p-2">
                          {ticket.error ? (
                            <AlertCircle className="w-4 h-4 text-red-600" title={ticket.error} />
                          ) : (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Button
                onClick={handleImport}
                disabled={isImporting || validCount === 0}
                className="w-full"
              >
                {isImporting ? 'Importando...' : `Importar ${validCount} Chamados`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
