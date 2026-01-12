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
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (photoPreviews.length + files.length > 3) {
      toast.error('Limite máximo de 3 fotos atingido.');
      return;
    }

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreviews(prev => [...prev, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input to allow selecting the same file again if removed
    if (fileInputRef.current) fileInputRef.current.value = '';
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
      const result = await dataService.createTicket({
        buildingId: selectedBuilding,
        userId: user.id,
        location,
        description,
        photoUrls: photoPreviews,
      });

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
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('Erro ao salvar chamado. Verifique o armazenamento do navegador.', { id: loadingToast });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
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
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border border-border group">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}

                {photoPreviews.length < 3 && (
                  <div
                    className="aspect-square border-2 border-dashed border-muted-foreground/20 rounded-lg flex flex-col items-center justify-center text-center hover:bg-muted/5 hover:border-blue-500/50 cursor-pointer transition-all group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="w-6 h-6 text-muted-foreground group-hover:text-blue-500 mb-1" />
                    <span className="text-[9px] font-bold text-muted-foreground group-hover:text-blue-500 uppercase">Adicionar</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                ref={fileInputRef}
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
