"use client";

import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { dataService } from '@/lib/data';
import { Building } from '@/lib/mockData';

interface ExcelRow {
  Prédio?: string;
  Empreendimento?: string;
  Local?: string;
  Descrição?: string;
  Descricao?: string;
  Status?: string;
  Data?: string;
  Prazo?: string;
  'ID Chamado'?: string;
  'Número'?: string;
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
  const [parsedTickets, setParsedTickets] = useState<ParsedTicket[]>([]);
  const [isImporting, setIsImporting] = useState(false);

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

  const parseExcelDate = (excelDate: any): string => {
    if (!excelDate) return new Date().toISOString();

    // Se já for string de data
    if (typeof excelDate === 'string') {
      const date = new Date(excelDate);
      return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }

    // Se for número (serial date do Excel)
    if (typeof excelDate === 'number') {
      const date = new Date((excelDate - 25569) * 86400 * 1000);
      return date.toISOString();
    }

    return new Date().toISOString();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);

      const parsed: ParsedTicket[] = jsonData.map((row, index) => {
        const buildingName = row.Prédio || row.Empreendimento || '';
        const buildingId = findBuildingId(buildingName);

        const ticket: ParsedTicket = {
          buildingId: buildingId || '',
          buildingName,
          location: row.Local || '',
          description: row.Descrição || row.Descricao || '',
          status: normalizeStatus(row.Status || ''),
          createdAt: parseExcelDate(row.Data),
          deadline: row.Prazo ? parseExcelDate(row.Prazo) : undefined,
          externalTicketId: row['ID Chamado'] || row['Número'] || undefined,
          row: index + 2, // +2 porque Excel começa em 1 e tem cabeçalho
        };

        // Validações
        if (!ticket.buildingId) {
          ticket.error = `Prédio "${buildingName}" não encontrado`;
        } else if (!ticket.location) {
          ticket.error = 'Local não informado';
        } else if (!ticket.description) {
          ticket.error = 'Descrição não informada';
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
    } catch (error) {
      console.error('Erro ao ler Excel:', error);
      toast.error('Erro ao ler arquivo Excel');
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
            Importar Chamados do Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileUpload}
              className="hidden"
              id="excel-upload"
              disabled={isImporting}
            />
            <label htmlFor="excel-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-2">
                Clique para selecionar arquivo Excel (.xlsx, .xls)
              </p>
              <p className="text-xs text-muted-foreground">
                Colunas: Prédio, Local, Descrição, Status, Data
              </p>
            </label>
          </div>

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
