"use client";

import { useEffect, useState, useRef } from 'react';
import { useAuth } from '@/components/providers/AuthProvider';
import { useRouter } from 'next/navigation';
import { dataService } from '@/lib/data';
import { Building } from '@/lib/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Loader2, Upload, Camera, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function TicketPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [buildings, setBuildings] = useState<Building[]>([]);

  // Form State
  const [selectedBuilding, setSelectedBuilding] = useState<string>('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  useEffect(() => {
    const loadBuildings = async () => {
      if (user) {
        const userBuildings = await dataService.getBuildingsForUser(user);
        setBuildings(userBuildings);
        // Auto-select if only one
        if (userBuildings.length === 1) {
          setSelectedBuilding(userBuildings[0].id);
        }
      }
    };
    loadBuildings();
  }, [user]);

  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      console.log('📸 Comprimindo imagem:', file.name, 'Tamanho:', (file.size / 1024 / 1024).toFixed(2) + 'MB');

      const reader = new FileReader();

      reader.onerror = (error) => {
        console.error('❌ Erro ao ler arquivo:', error);
        reject(new Error('Erro ao ler o arquivo da imagem'));
      };

      reader.onload = (e) => {
        console.log('✅ Arquivo lido com sucesso');
        const img = new Image();

        img.onerror = (error) => {
          console.error('❌ Erro ao carregar imagem:', error);
          reject(new Error('Erro ao carregar a imagem'));
        };

        img.onload = () => {
          try {
            console.log('✅ Imagem carregada. Dimensões:', img.width, 'x', img.height);

            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            // Redimensionar se for muito grande (max 1920px)
            const maxSize = 1920;
            if (width > maxSize || height > maxSize) {
              if (width > height) {
                height = (height / width) * maxSize;
                width = maxSize;
              } else {
                width = (width / height) * maxSize;
                height = maxSize;
              }
              console.log('📏 Redimensionando para:', width, 'x', height);
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (!ctx) {
              console.error('❌ Não foi possível obter contexto 2d do canvas');
              reject(new Error('Erro ao processar a imagem'));
              return;
            }

            ctx.drawImage(img, 0, 0, width, height);

            // Comprimir para JPEG com qualidade 0.8
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const compressedSize = (compressedDataUrl.length / 1024 / 1024).toFixed(2);
            console.log('✅ Imagem comprimida. Tamanho final:', compressedSize + 'MB');

            resolve(compressedDataUrl);
          } catch (error) {
            console.error('❌ Erro ao processar imagem:', error);
            reject(new Error('Erro ao processar a imagem: ' + (error as Error).message));
          }
        };

        img.src = e.target?.result as string;
      };

      reader.readAsDataURL(file);
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    console.log('📷 handlePhotoChange chamado');
    const files = Array.from(e.target.files || []);
    console.log('📷 Arquivos selecionados:', files.length);

    if (files.length === 0) {
      console.log('⚠️ Nenhum arquivo selecionado');
      return;
    }

    console.log('📋 Fotos atuais:', photoPreviews.length, 'Novas:', files.length);

    if (photoPreviews.length + files.length > 3) {
      console.log('⚠️ Limite de 3 fotos atingido');
      toast.error('Limite máximo de 3 fotos atingido.');
      return;
    }

    // Validar tamanho dos arquivos (max 10MB por arquivo)
    const maxFileSize = 10 * 1024 * 1024; // 10MB
    for (const file of files) {
      console.log('📏 Validando arquivo:', file.name, 'Tamanho:', (file.size / 1024 / 1024).toFixed(2) + 'MB');
      if (file.size > maxFileSize) {
        console.log('❌ Arquivo muito grande:', file.name);
        toast.error(`A foto "${file.name}" é muito grande. Máximo: 10MB`);
        return;
      }
    }

    const loadingToast = toast.loading('Processando foto(s)...');

    try {
      const compressedImages: string[] = [];

      for (const file of files) {
        try {
          console.log('🔄 Processando arquivo:', file.name);
          const compressed = await compressImage(file);
          compressedImages.push(compressed);
          console.log('✅ Arquivo processado com sucesso:', file.name);
        } catch (error) {
          console.error('❌ Erro ao comprimir imagem:', error);
          const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
          toast.error(`Erro: ${errorMsg}`, { id: loadingToast, duration: 5000 });
          return;
        }
      }

      setPhotoPreviews(prev => [...prev, ...compressedImages]);
      toast.success(`${files.length} foto(s) adicionada(s)`, { id: loadingToast });
    } catch (error) {
      console.error('❌ Erro ao processar fotos:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      toast.error(`Erro: ${errorMessage}`, { id: loadingToast, duration: 5000 });
    }

    // Reset inputs to allow selecting the same file again if removed
    if (cameraInputRef.current) cameraInputRef.current.value = '';
    if (galleryInputRef.current) galleryInputRef.current.value = '';
  };

  const removePhoto = (index: number) => {
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBuilding || !location || !description || photoPreviews.length === 0 || !user) {
      toast.error('Preencha todos os campos obrigatórios e adicione pelo menos 1 foto.');
      return;
    }

    setIsSubmitting(true);
    const loadingToast = toast.loading('Enviando chamado...');

    try {
      console.log('📝 Iniciando criação de chamado...');
      const result = await dataService.createTicket({
        buildingId: selectedBuilding,
        userId: user.id,
        location,
        description,
        photoUrls: photoPreviews,
      });

      console.log('✅ Resultado:', result);

      if (result.wasOffline) {
        toast.success(
          'Chamado salvo localmente! Será enviado automaticamente quando você voltar online.',
          {
            id: loadingToast,
            duration: 5000
          }
        );
      } else {
        toast.success('Chamado enviado com sucesso!', { id: loadingToast });
      }

      // Reset form
      if (buildings.length > 1) setSelectedBuilding('');
      setLocation('');
      setDescription('');
      setPhotoPreviews([]);
      if (cameraInputRef.current) cameraInputRef.current.value = '';
      if (galleryInputRef.current) galleryInputRef.current.value = '';
    } catch (error: any) {
      console.error('❌ Error submitting ticket:', error);
      const errorMessage = error?.message || 'Erro desconhecido ao salvar chamado';
      toast.error(`Erro: ${errorMessage}`, { id: loadingToast, duration: 5000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex flex-col justify-center items-center h-screen gap-4">
        <Loader2 className="animate-spin w-12 h-12 text-blue-600" />
        <p className="text-lg font-semibold text-muted-foreground">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="p-4 pt-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-foreground">Novo Chamado</h1>
        <p className="text-muted-foreground text-sm">Preencha os dados do problema identificado.</p>
      </header>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Building Select */}
            <div className="space-y-2">
              <Label htmlFor="building">Prédio</Label>
              {buildings.length === 1 ? (
                <Input value={buildings[0].name} disabled className="bg-muted" />
              ) : (
                <Select value={selectedBuilding} onValueChange={setSelectedBuilding}>
                  <SelectTrigger id="building">
                    <SelectValue placeholder="Selecione o prédio" />
                  </SelectTrigger>
                  <SelectContent>
                    {buildings.map(b => (
                      <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Local do Problema</Label>
              <Input
                id="location"
                placeholder="Ex: Hall de entrada, Elevador 2"
                value={location}
                onChange={e => setLocation(e.target.value)}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea
                id="description"
                placeholder="Descreva o problema detalhadamente..."
                className="min-h-[100px]"
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
            </div>

            {/* Photo Upload */}
            <div className="space-y-4">
              <div className="flex justify-between items-end">
                <Label className="flex items-center gap-2">
                  Fotos do Problema
                  <span className="text-[10px] text-red-500 font-bold uppercase tracking-widest">(Obrigatório 1-3)</span>
                </Label>
                <span className="text-[10px] font-bold text-muted-foreground">{photoPreviews.length}/3 fotos</span>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {photoPreviews.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1.5 shadow-lg hover:bg-red-700 transition-colors z-10"
                      title="Remover foto"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {photoPreviews.length < 3 && (
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:bg-muted/5 hover:border-blue-500/50 transition-all group"
                  >
                    <Camera className="w-8 h-8 text-muted-foreground group-hover:text-blue-500" />
                    <span className="text-xs font-semibold text-muted-foreground group-hover:text-blue-500">Tirar Foto</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => galleryInputRef.current?.click()}
                    className="flex flex-col items-center justify-center gap-2 p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:bg-muted/5 hover:border-green-500/50 transition-all group"
                  >
                    <Upload className="w-8 h-8 text-muted-foreground group-hover:text-green-500" />
                    <span className="text-xs font-semibold text-muted-foreground group-hover:text-green-500">Da Galeria</span>
                  </button>
                </div>
              )}

              {/* Input for camera */}
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                ref={cameraInputRef}
                onChange={handlePhotoChange}
              />

              {/* Input for gallery */}
              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={galleryInputRef}
                onChange={handlePhotoChange}
              />
            </div>

            <Button
              type="submit"
              className={cn(
                "w-full h-12 text-lg font-bold transition-all",
                photoPreviews.length > 0 ? "bg-blue-600 hover:bg-blue-700" : "bg-muted text-muted-foreground cursor-not-allowed"
              )}
              disabled={isSubmitting || photoPreviews.length === 0}
            >
              {isSubmitting ? (
                <><Loader2 className="mr-2 animate-spin" /> Enviando...</>
              ) : (
                'Abrir Chamado'
              )}
            </Button>

          </form>
        </CardContent>
      </Card>
    </div>
  );
}
