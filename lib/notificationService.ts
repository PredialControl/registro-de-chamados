interface NotificationPayload {
  title: string;
  body: string;
  url?: string;
  ticketId?: string;
  buildingId?: string;
  type: 'status_change' | 'new_ticket' | 'comment' | 'general';
  tag?: string;
}

const statusLabels: Record<string, string> = {
  'itens_apontados': 'Itens Apontados',
  'em_andamento': 'Em Andamento',
  'improcedente': 'Improcedente',
  'aguardando_vistoria': 'Aguardando Vistoria',
  'concluido': 'Concluído',
  'f_indevido': 'F. Indevido'
};

export const notificationService = {
  /**
   * Send a notification when a ticket status changes
   */
  async sendStatusChangeNotification(
    ticketId: string,
    oldStatus: string,
    newStatus: string,
    externalTicketId?: string,
    buildingId?: string
  ): Promise<void> {
    try {
      const oldLabel = statusLabels[oldStatus] || oldStatus;
      const newLabel = statusLabels[newStatus] || newStatus;

      const payload: NotificationPayload = {
        title: 'Status Atualizado',
        body: `Chamado #${externalTicketId || ticketId.slice(0, 8)} mudou de "${oldLabel}" para "${newLabel}"`,
        url: `/chamados?ticket=${ticketId}`,
        ticketId,
        buildingId,
        type: 'status_change',
        tag: `status-${ticketId}`
      };

      await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending status change notification:', error);
    }
  },

  /**
   * Send a notification when a new ticket is created
   */
  async sendNewTicketNotification(
    ticketId: string,
    description: string,
    buildingId?: string
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        title: 'Novo Chamado Criado',
        body: `Novo chamado: ${description.substring(0, 50)}${description.length > 50 ? '...' : ''}`,
        url: `/chamados?ticket=${ticketId}`,
        ticketId,
        buildingId,
        type: 'new_ticket',
        tag: `new-${ticketId}`
      };

      await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending new ticket notification:', error);
    }
  },

  /**
   * Send a notification when a comment is added to a ticket
   */
  async sendCommentNotification(
    ticketId: string,
    comment: string,
    externalTicketId?: string,
    buildingId?: string
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        title: 'Novo Comentário',
        body: `Chamado #${externalTicketId || ticketId.slice(0, 8)}: ${comment.substring(0, 50)}${comment.length > 50 ? '...' : ''}`,
        url: `/chamados?ticket=${ticketId}`,
        ticketId,
        buildingId,
        type: 'comment',
        tag: `comment-${ticketId}`
      };

      await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending comment notification:', error);
    }
  },

  /**
   * Send a general notification
   */
  async sendGeneralNotification(
    title: string,
    body: string,
    url?: string
  ): Promise<void> {
    try {
      const payload: NotificationPayload = {
        title,
        body,
        url: url || '/chamados',
        type: 'general',
        tag: 'general'
      };

      await this.sendNotification(payload);
    } catch (error) {
      console.error('Error sending general notification:', error);
    }
  },

  /**
   * Internal method to send notification to the API
   */
  async sendNotification(payload: NotificationPayload): Promise<void> {
    try {
      const response = await fetch('/api/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const error = await response.text();
        console.error('Failed to send notification:', error);
        return;
      }

      const result = await response.json();
      console.log('Notification sent successfully:', result);
    } catch (error) {
      console.error('Error sending notification to API:', error);
    }
  }
};
