import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { SupabaseService } from '../common/supabase/supabase.service';

@Injectable()
export class WahaService {
  private readonly logger = new Logger(WahaService.name);
  private readonly http: AxiosInstance;

  constructor(
    private config: ConfigService,
    private supabase: SupabaseService,
  ) {
    this.http = axios.create({
      baseURL: config.get('WAHA_BASE_URL'),
      headers: { 'X-Api-Key': config.get('WAHA_API_KEY') },
      timeout: 15000,
    });
  }

  // ── Sessões WAHA (API direta) ────────────────────────────

  async createSession(sessionName: string, proxy?: { server: string; username?: string; password?: string }) {
    const body: any = { name: sessionName };
    if (proxy?.server) {
      body.config = { proxy: { server: proxy.server, username: proxy.username, password: proxy.password } };
    }
    const { data } = await this.http.post('/api/sessions', body);
    return data;
  }

  async updateSessionProxy(sessionName: string, proxy: { server: string; username?: string; password?: string }) {
    try {
      // Para o WAHA, recria a sessão com o proxy
      await this.http.delete(`/api/sessions/${sessionName}`).catch(() => null);
      await this.createSession(sessionName, proxy);
      await this.http.post(`/api/sessions/${sessionName}/start`).catch(() => null);
    } catch (err: any) {
      throw new BadRequestException(`WAHA: ${err?.response?.data?.message || err?.message}`);
    }
  }

  async startSession(sessionName: string) {
    try {
      const { data } = await this.http.post(`/api/sessions/${sessionName}/start`);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao iniciar sessão';
      throw new BadRequestException(`WAHA: ${msg}`);
    }
  }

  async stopSession(sessionName: string) {
    try {
      const { data } = await this.http.post(`/api/sessions/${sessionName}/stop`);
      return data;
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao parar sessão';
      throw new BadRequestException(`WAHA: ${msg}`);
    }
  }

  async deleteWahaSession(sessionName: string) {
    try {
      await this.http.delete(`/api/sessions/${sessionName}`);
    } catch {
      // ignora se não existia no WAHA
    }
  }

  async getSessionStatus(sessionName: string) {
    const { data } = await this.http.get(`/api/sessions/${sessionName}`);
    return data;
  }

  async listWahaSessions(): Promise<string[]> {
    try {
      const { data } = await this.http.get('/api/sessions');
      // WAHA retorna array de objetos com {name, status, ...}
      return (data || []).map((s: any) => s.name ?? s.session ?? s).filter(Boolean);
    } catch {
      return [];
    }
  }

  async getQrCode(sessionName: string) {
    // Garante que sessão existe e está iniciada no WAHA
    await this.createSession(sessionName).catch(() => null);
    await this.http.post(`/api/sessions/${sessionName}/start`).catch(() => null);

    // Aguarda sessão atingir SCAN_QR_CODE (até 15s, tentativas a cada 3s)
    const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
    const maxAttempts = 5;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await delay(3000);
      try {
        // WAHA retorna PNG binário direto — buscar como arraybuffer
        const response = await this.http.get(`/api/${sessionName}/auth/qr`, {
          responseType: 'arraybuffer',
        });
        const base64 = Buffer.from(response.data).toString('base64');
        return { value: `data:image/png;base64,${base64}`, mimetype: 'image/png' };
      } catch (err: any) {
        const status = err?.response?.status;
        this.logger.warn(`getQrCode tentativa ${attempt}/${maxAttempts}: HTTP ${status}`);

        if (attempt === maxAttempts) {
          const msg = status === 422
            ? 'Sessão ainda não está pronta. Aguarde alguns segundos e tente novamente.'
            : `WAHA ${status ?? ''}: ${err?.message}`;
          throw new BadRequestException(msg);
        }
        if (status !== 422) {
          throw new BadRequestException(`WAHA ${status ?? ''}: ${err?.message}`);
        }
      }
    }
  }

  // ── Envio de mensagens ───────────────────────────────────

  async sendText(sessionName: string, phone: string, text: string): Promise<{ id: string }> {
    const chatId = phone.replace('+', '') + '@c.us';
    const { data } = await this.http.post(`/api/sendText`, { session: sessionName, chatId, text });
    return data;
  }

  async sendImage(sessionName: string, phone: string, imageUrl: string, caption?: string) {
    const chatId = phone.replace('+', '') + '@c.us';
    const { data } = await this.http.post(`/api/sendImage`, {
      session: sessionName, chatId, file: { url: imageUrl }, caption,
    });
    return data;
  }

  async sendVideo(sessionName: string, phone: string, videoUrl: string, caption?: string) {
    const chatId = phone.replace('+', '') + '@c.us';
    const { data } = await this.http.post(`/api/sendVideo`, {
      session: sessionName, chatId, file: { url: videoUrl }, caption,
    });
    return data;
  }

  async sendAudio(sessionName: string, phone: string, audioUrl: string) {
    const chatId = phone.replace('+', '') + '@c.us';
    const { data } = await this.http.post(`/api/sendVoice`, {
      session: sessionName, chatId, file: { url: audioUrl },
    });
    return data;
  }

  async sendFile(sessionName: string, phone: string, fileUrl: string, caption?: string) {
    const chatId = phone.replace('+', '') + '@c.us';
    const { data } = await this.http.post(`/api/sendFile`, {
      session: sessionName, chatId, file: { url: fileUrl }, caption,
    });
    return data;
  }

  // ── Sincronizar status da sessão no banco ────────────────

  async syncSessionStatus(sessionName: string) {
    try {
      const wahaSession = await this.getSessionStatus(sessionName);
      const status = this.mapWahaStatus(wahaSession.status);

      const update: Record<string, any> = { status };

      // Sincroniza telefone quando conectado
      if (wahaSession.me?.id) {
        const raw = wahaSession.me.id.replace('@c.us', '').replace('@lid', '');
        if (/^\d+$/.test(raw)) update.telefone = '+' + raw;
      }

      // Sincroniza proxy configurado no WAHA
      const proxy = wahaSession.config?.proxy;
      if (proxy) {
        update.proxy_server   = proxy.server   || null;
        update.proxy_username = proxy.username || null;
        update.proxy_password = proxy.password || null;
      }

      await this.supabase.db
        .from('whatsapp_sessions')
        .update(update)
        .eq('waha_session_name', sessionName);

      return status;
    } catch {
      await this.supabase.db
        .from('whatsapp_sessions')
        .update({ status: 'erro' })
        .eq('waha_session_name', sessionName);
      return 'erro';
    }
  }

  private mapWahaStatus(wahaStatus: string): string {
    const map: Record<string, string> = {
      WORKING:       'conectada',
      STOPPED:       'desconectada',
      STARTING:      'aguardando_qrcode',
      SCAN_QR_CODE:  'aguardando_qrcode',
      FAILED:        'erro',
    };
    return map[wahaStatus] || 'desconectada';
  }

  // ── Gerenciamento de sessões no banco ────────────────────

  async wahaHealthCheck() {
    try {
      const { data } = await this.http.get('/api/sessions');
      return { ok: true, sessions: data };
    } catch (err: any) {
      return {
        ok: false,
        status: err?.response?.status,
        message: err?.response?.data?.message || err?.message,
        url: this.config.get('WAHA_BASE_URL'),
      };
    }
  }

  async dbCreateSession(body: {
    nome_sessao: string;
    limite_diario?: number;
    proxy_server?: string;
    proxy_username?: string;
    proxy_password?: string;
  }) {
    const proxy = body.proxy_server
      ? { server: body.proxy_server, username: body.proxy_username, password: body.proxy_password }
      : undefined;

    let wahaError: string | null = null;
    try {
      await this.createSession(body.nome_sessao, proxy);
      await this.http.post(`/api/sessions/${body.nome_sessao}/start`).catch(() => null);
    } catch (err: any) {
      wahaError = err?.response?.data?.message || err?.message || 'Erro desconhecido';
      this.logger.error(`Falha ao criar sessão no WAHA: ${wahaError}`, err?.response?.data);
    }

    const { data, error } = await this.supabase.db
      .from('whatsapp_sessions')
      .insert({
        nome_sessao: body.nome_sessao,
        limite_diario: body.limite_diario || 50,
        waha_session_name: body.nome_sessao,
        proxy_server: body.proxy_server || null,
        proxy_username: body.proxy_username || null,
        proxy_password: body.proxy_password || null,
        status: wahaError ? 'erro' : 'aguardando_qrcode',
      })
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    if (wahaError) throw new BadRequestException(`Sessão salva, mas falhou no WAHA: ${wahaError}`);
    return data;
  }

  async dbUpdateProxy(id: string, proxy: { proxy_server: string; proxy_username?: string; proxy_password?: string }) {
    const session = await this.dbGetSession(id);
    if (!session) throw new NotFoundException('Sessão não encontrada');

    await this.updateSessionProxy(session.waha_session_name, {
      server: proxy.proxy_server,
      username: proxy.proxy_username,
      password: proxy.proxy_password,
    });

    const { data, error } = await this.supabase.db
      .from('whatsapp_sessions')
      .update({ ...proxy, status: 'aguardando_qrcode' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async dbDeleteSession(id: string) {
    const session = await this.dbGetSession(id);
    if (!session) throw new NotFoundException('Sessão não encontrada');

    // Remove do WAHA
    await this.deleteWahaSession(session.waha_session_name);

    // Remove do banco
    const { error } = await this.supabase.db
      .from('whatsapp_sessions')
      .delete()
      .eq('id', id);

    if (error) throw new BadRequestException(error.message);
    return { ok: true };
  }

  async dbListSessions() {
    const { data } = await this.supabase.db
      .from('whatsapp_sessions')
      .select('*')
      .order('created_at', { ascending: false });
    return data;
  }

  async dbGetSession(id: string) {
    const { data } = await this.supabase.db
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', id)
      .single();
    return data;
  }

  async canSend(sessionId: string): Promise<{ allowed: boolean; reason?: string }> {
    const { data: session } = await this.supabase.db
      .from('whatsapp_sessions')
      .select('*')
      .eq('id', sessionId)
      .single();

    if (!session) return { allowed: false, reason: 'Sessão não encontrada' };
    if (session.status !== 'conectada') return { allowed: false, reason: `Sessão ${session.status}` };
    if (session.envios_hoje >= session.limite_diario) return { allowed: false, reason: 'Limite diário atingido' };

    return { allowed: true };
  }

  async incrementDailyCount(sessionId: string) {
    await this.supabase.db.rpc('increment_session_envios', { p_session_id: sessionId });
  }
}
