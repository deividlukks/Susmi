'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Filter, X, Calendar, CheckSquare, Target, FolderKanban } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@susmi/ui';
import { Input } from '@susmi/ui';
import { Button } from '@susmi/ui';
import { Badge } from '@susmi/ui';
import { Checkbox } from '@susmi/ui';
import { Label } from '@susmi/ui';
import { searchService, SearchFilters, SearchResult } from '@/services/search.service';
import { Popover, PopoverContent, PopoverTrigger } from '@susmi/ui';
import { Separator } from '@susmi/ui';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@susmi/hooks';

const typeOptions = [
  { value: 'TASK', label: 'Tarefas', icon: CheckSquare, color: 'bg-blue-100 text-blue-700' },
  { value: 'EVENT', label: 'Eventos', icon: Calendar, color: 'bg-purple-100 text-purple-700' },
  { value: 'HABIT', label: 'Hábitos', icon: Target, color: 'bg-green-100 text-green-700' },
  { value: 'PROJECT', label: 'Projetos', icon: FolderKanban, color: 'bg-orange-100 text-orange-700' },
];

const statusOptions = [
  { value: 'TODO', label: 'A Fazer' },
  { value: 'IN_PROGRESS', label: 'Em Andamento' },
  { value: 'COMPLETED', label: 'Concluída' },
  { value: 'CANCELLED', label: 'Cancelada' },
  { value: 'ACTIVE', label: 'Ativo' },
  { value: 'INACTIVE', label: 'Inativo' },
  { value: 'ARCHIVED', label: 'Arquivado' },
];

const priorityOptions = [
  { value: 'LOW', label: 'Baixa' },
  { value: 'MEDIUM', label: 'Média' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'URGENT', label: 'Urgente' },
];

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<SearchFilters>({
    types: ['TASK', 'EVENT', 'HABIT', 'PROJECT'],
    status: [],
    priority: [],
  });

  const debouncedQuery = useDebounce(query, 300);

  const { data: results = [], isLoading } = useQuery({
    queryKey: ['search', debouncedQuery, filters],
    queryFn: () => searchService.search({ ...filters, query: debouncedQuery }),
    enabled: debouncedQuery.length >= 2 || Object.values(filters).some(v => Array.isArray(v) && v.length > 0),
  });

  const handleTypeToggle = (type: string) => {
    setFilters((prev) => {
      const types = prev.types || [];
      const newTypes = types.includes(type as any)
        ? types.filter((t) => t !== type)
        : [...types, type as any];
      return { ...prev, types: newTypes };
    });
  };

  const handleStatusToggle = (status: string) => {
    setFilters((prev) => {
      const statuses = prev.status || [];
      const newStatuses = statuses.includes(status)
        ? statuses.filter((s) => s !== status)
        : [...statuses, status];
      return { ...prev, status: newStatuses };
    });
  };

  const handlePriorityToggle = (priority: string) => {
    setFilters((prev) => {
      const priorities = prev.priority || [];
      const newPriorities = priorities.includes(priority)
        ? priorities.filter((p) => p !== priority)
        : [...priorities, priority];
      return { ...prev, priority: newPriorities };
    });
  };

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    setQuery('');

    switch (result.type) {
      case 'TASK':
        router.push('/tasks');
        break;
      case 'EVENT':
        router.push('/calendar');
        break;
      case 'HABIT':
        router.push(`/habits/${result.id}`);
        break;
      case 'PROJECT':
        router.push(`/projects/${result.id}`);
        break;
    }
  };

  const clearFilters = () => {
    setFilters({
      types: ['TASK', 'EVENT', 'HABIT', 'PROJECT'],
      status: [],
      priority: [],
    });
    setQuery('');
  };

  const activeFiltersCount =
    (filters.status?.length || 0) +
    (filters.priority?.length || 0) +
    (4 - (filters.types?.length || 4));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="relative w-full md:w-64 justify-start text-muted-foreground">
          <Search className="mr-2 h-4 w-4" />
          <span>Buscar...</span>
          <kbd className="pointer-events-none absolute right-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
            <span className="text-xs">⌘</span>K
          </kbd>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>Busca Global</DialogTitle>
        </DialogHeader>

        {/* Search Input and Filters */}
        <div className="px-6 pb-4 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Digite para buscar..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="relative">
                  <Filter className="h-4 w-4" />
                  {activeFiltersCount > 0 && (
                    <Badge
                      variant="destructive"
                      className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-xs"
                    >
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80" align="end">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium text-sm">Filtros Avançados</h4>
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Limpar
                    </Button>
                  </div>

                  <Separator />

                  {/* Type Filters */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                      TIPOS
                    </Label>
                    <div className="space-y-2">
                      {typeOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`type-${option.value}`}
                            checked={filters.types?.includes(option.value as any)}
                            onCheckedChange={() => handleTypeToggle(option.value)}
                          />
                          <Label
                            htmlFor={`type-${option.value}`}
                            className="flex items-center gap-2 cursor-pointer"
                          >
                            <option.icon className="h-4 w-4" />
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Status Filters */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                      STATUS
                    </Label>
                    <div className="space-y-2">
                      {statusOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`status-${option.value}`}
                            checked={filters.status?.includes(option.value)}
                            onCheckedChange={() => handleStatusToggle(option.value)}
                          />
                          <Label htmlFor={`status-${option.value}`} className="cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Priority Filters */}
                  <div>
                    <Label className="text-xs font-semibold text-muted-foreground mb-2 block">
                      PRIORIDADE
                    </Label>
                    <div className="space-y-2">
                      {priorityOptions.map((option) => (
                        <div key={option.value} className="flex items-center space-x-2">
                          <Checkbox
                            id={`priority-${option.value}`}
                            checked={filters.priority?.includes(option.value)}
                            onCheckedChange={() => handlePriorityToggle(option.value)}
                          />
                          <Label htmlFor={`priority-${option.value}`} className="cursor-pointer">
                            {option.label}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {filters.status?.map((status) => (
                <Badge key={status} variant="secondary" className="gap-1">
                  {statusOptions.find((s) => s.value === status)?.label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handleStatusToggle(status)}
                  />
                </Badge>
              ))}
              {filters.priority?.map((priority) => (
                <Badge key={priority} variant="secondary" className="gap-1">
                  {priorityOptions.find((p) => p.value === priority)?.label}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => handlePriorityToggle(priority)}
                  />
                </Badge>
              ))}
            </div>
          )}
        </div>

        <Separator />

        {/* Results */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {isLoading && (
            <div className="text-center py-8 text-muted-foreground">Buscando...</div>
          )}

          {!isLoading && debouncedQuery.length < 2 && activeFiltersCount === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Digite pelo menos 2 caracteres para buscar
            </div>
          )}

          {!isLoading && (debouncedQuery.length >= 2 || activeFiltersCount > 0) && results.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              Nenhum resultado encontrado
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <div className="space-y-2 mt-4">
              {results.map((result) => {
                const typeOption = typeOptions.find((t) => t.value === result.type);
                const Icon = typeOption?.icon || CheckSquare;

                return (
                  <div
                    key={`${result.type}-${result.id}`}
                    className="p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded ${typeOption?.color}`}>
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-sm truncate">{result.title}</h4>
                          <Badge variant="outline" className="text-xs">
                            {typeOption?.label}
                          </Badge>
                        </div>
                        {result.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {result.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2 flex-wrap">
                          {result.status && (
                            <Badge variant="secondary" className="text-xs">
                              {statusOptions.find((s) => s.value === result.status)?.label || result.status}
                            </Badge>
                          )}
                          {result.priority && (
                            <Badge variant="secondary" className="text-xs">
                              {priorityOptions.find((p) => p.value === result.priority)?.label || result.priority}
                            </Badge>
                          )}
                          {result.category && (
                            <Badge variant="secondary" className="text-xs">
                              {result.category}
                            </Badge>
                          )}
                          {result.tags?.map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
