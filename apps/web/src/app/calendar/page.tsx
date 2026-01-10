'use client';

import { useEffect, useState } from 'react';
import { Plus, Calendar as CalendarIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import api from '@/lib/api';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Event {
  id: string;
  title: string;
  description?: string;
  type: string;
  startDate: string;
  endDate: string;
  location?: string;
  isAllDay: boolean;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  const loadEvents = async () => {
    try {
      const response = await api.get('/events');
      setEvents(response.data.items || []);
    } catch (error) {
      toast.error('Erro ao carregar eventos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'MEETING':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'APPOINTMENT':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'DEADLINE':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'PERSONAL':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'WORK':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Calendário</h1>
          <p className="text-gray-600 mt-1">Gerencie seus eventos e compromissos</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Novo Evento
        </Button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500">Carregando eventos...</p>
      ) : events.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">
              Nenhum evento encontrado. Crie seu primeiro evento!
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <Card key={event.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <CardTitle className="text-lg">{event.title}</CardTitle>
                  <span className={`text-xs px-2 py-1 rounded border ${getEventTypeColor(event.type)}`}>
                    {event.type}
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                {event.description && (
                  <p className="text-sm text-gray-600 mb-3">{event.description}</p>
                )}
                <div className="space-y-2 text-sm">
                  <div className="flex items-center text-gray-600">
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    <span>
                      {format(new Date(event.startDate), "d 'de' MMMM 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                  {event.location && (
                    <div className="text-gray-600">
                      <span className="font-medium">Local:</span> {event.location}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
