#!/usr/bin/env python3
"""
Script para simplificar a tabela de chamados
"""

# Ler o arquivo
with open('app/chamados/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Nova estrutura de colunas da tabela (tbody) - versão simplificada
new_tbody_template = '''                      {/* COLUNA: LOCAL */}
                      <td className="px-3 py-4 border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <Input
                            value={batchEdits.get(ticket.id)?.location || ticket.location || ''}
                            onChange={(e) => {
                              const currentEdit = batchEdits.get(ticket.id) || {
                                buildingId: ticket.buildingId,
                                location: ticket.location,
                                description: ticket.description,
                                status: ticket.status,
                                deadline: ticket.deadline,
                                reprogrammingDate: ticket.reprogrammingDate,
                                constructorReturn: ticket.constructorReturn,
                                engineeringOpinion: ticket.engineeringOpinion,
                                responsible: ticket.responsible,
                              };
                              const newEdits = new Map(batchEdits);
                              newEdits.set(ticket.id, { ...currentEdit, location: e.target.value });
                              setBatchEdits(newEdits);
                            }}
                            placeholder="Local..."
                            className="h-8 text-xs"
                          />
                        ) : (
                          <div className="text-foreground text-xs truncate max-w-[150px]" title={ticket.location}>{ticket.location}</div>
                        )}
                      </td>

                      {/* COLUNA: DESCRIÇÃO */}
                      <td className="px-3 py-4 border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <Textarea
                            value={batchEdits.get(ticket.id)?.description || ticket.description || ''}
                            onChange={(e) => {
                              const currentEdit = batchEdits.get(ticket.id) || {
                                buildingId: ticket.buildingId,
                                location: ticket.location,
                                description: ticket.description,
                                status: ticket.status,
                                deadline: ticket.deadline,
                                reprogrammingDate: ticket.reprogrammingDate,
                                constructorReturn: ticket.constructorReturn,
                                engineeringOpinion: ticket.engineeringOpinion,
                                responsible: ticket.responsible,
                              };
                              const newEdits = new Map(batchEdits);
                              newEdits.set(ticket.id, { ...currentEdit, description: e.target.value });
                              setBatchEdits(newEdits);
                            }}
                            placeholder="Descrição..."
                            className="min-h-[60px] text-xs resize-none max-w-[250px]"
                          />
                        ) : (
                          <div className="text-muted-foreground text-xs line-clamp-2 cursor-help max-w-[250px]" title={ticket.description}>
                            {ticket.description}
                          </div>
                        )}
                      </td>

                      {/* COLUNA: FOTO */}
                      <td className="px-3 py-4 border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        <div className="flex flex-col items-center gap-1">
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
                      <td className="px-3 py-4 text-center border-x border-border/50" onClick={(e) => e.stopPropagation()}>
                        {isAdmin ? (
                          <Select
                            value={batchEdits.get(ticket.id)?.responsible || ticket.responsible || 'Construtora'}
                            onValueChange={(value) => {
                              const currentEdit = batchEdits.get(ticket.id) || {
                                buildingId: ticket.buildingId,
                                location: ticket.location,
                                description: ticket.description,
                                status: ticket.status,
                                deadline: ticket.deadline,
                                reprogrammingDate: ticket.reprogrammingDate,
                                constructorReturn: ticket.constructorReturn,
                                engineeringOpinion: ticket.engineeringOpinion,
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
                            {ticket.responsible || 'Construtora'}
                          </div>
                        )}
                      </td>

                      {/* COLUNA: SITUAÇÃO */}
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
                                engineeringOpinion: ticket.engineeringOpinion,
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
                      </td>'''

print("Script de simplificação da tabela criado")
print("Este script precisa ser adaptado para fazer a substituição real no arquivo")
