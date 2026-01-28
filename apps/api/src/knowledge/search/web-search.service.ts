import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { PrismaService } from '../../prisma/prisma.service';
import { firstValueFrom } from 'rxjs';

export interface WebSearchResult {
    title: string;
    url: string;
    snippet: string;
    source?: string;
    publishedDate?: string;
}

export interface WebSearchResponse {
    query: string;
    results: WebSearchResult[];
    totalResults: number;
    searchTime: number;
    summary?: string;
}

@Injectable()
export class WebSearchService {
    private readonly logger = new Logger(WebSearchService.name);

    // API Keys
    private readonly googleApiKey: string;
    private readonly googleCseId: string;
    private readonly bingApiKey: string;
    private readonly braveApiKey: string;
    private readonly serperApiKey: string;
    private readonly aiServiceUrl: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly httpService: HttpService,
        private readonly prisma: PrismaService,
    ) {
        this.googleApiKey = this.configService.get<string>('GOOGLE_SEARCH_API_KEY') || '';
        this.googleCseId = this.configService.get<string>('GOOGLE_CSE_ID') || '';
        this.bingApiKey = this.configService.get<string>('BING_SEARCH_API_KEY') || '';
        this.braveApiKey = this.configService.get<string>('BRAVE_SEARCH_API_KEY') || '';
        this.serperApiKey = this.configService.get<string>('SERPER_API_KEY') || '';
        this.aiServiceUrl = this.configService.get<string>('AI_SERVICE_URL') || 'http://localhost:8001';
    }

    /**
     * Search using the best available provider
     */
    async search(
        userId: string,
        query: string,
        options?: {
            provider?: 'google' | 'bing' | 'brave' | 'serper' | 'duckduckgo';
            maxResults?: number;
            summarize?: boolean;
            language?: string;
        },
    ): Promise<WebSearchResponse> {
        const startTime = Date.now();
        const maxResults = options?.maxResults || 10;
        const provider = options?.provider || this.getBestProvider();

        let results: WebSearchResult[] = [];
        let errorMessage: string | undefined;

        try {
            switch (provider) {
                case 'google':
                    results = await this.searchGoogle(query, maxResults);
                    break;
                case 'bing':
                    results = await this.searchBing(query, maxResults);
                    break;
                case 'brave':
                    results = await this.searchBrave(query, maxResults);
                    break;
                case 'serper':
                    results = await this.searchSerper(query, maxResults);
                    break;
                case 'duckduckgo':
                default:
                    results = await this.searchDuckDuckGo(query, maxResults);
                    break;
            }
        } catch (error) {
            this.logger.error(`Search failed with ${provider}: ${error.message}`);
            errorMessage = error.message;

            // Try fallback to DuckDuckGo
            if (provider !== 'duckduckgo') {
                try {
                    results = await this.searchDuckDuckGo(query, maxResults);
                } catch (fallbackError) {
                    errorMessage = fallbackError.message;
                }
            }
        }

        const searchTime = Date.now() - startTime;

        // Generate summary if requested
        let summary: string | undefined;
        if (options?.summarize && results.length > 0) {
            summary = await this.summarizeResults(query, results, options.language);
        }

        // Save to database
        await this.prisma.webSearch.create({
            data: {
                userId,
                query,
                provider,
                results: JSON.stringify(results),
                resultCount: results.length,
                aiSummary: summary,
                status: results.length > 0 ? 'COMPLETED' : 'FAILED',
                errorMessage,
                searchDuration: searchTime,
            },
        });

        return {
            query,
            results,
            totalResults: results.length,
            searchTime,
            summary,
        };
    }

    /**
     * Get search history for user
     */
    async getSearchHistory(userId: string, limit = 20) {
        return this.prisma.webSearch.findMany({
            where: { userId },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }

    /**
     * Search using Google Custom Search API
     */
    private async searchGoogle(query: string, maxResults: number): Promise<WebSearchResult[]> {
        if (!this.googleApiKey || !this.googleCseId) {
            throw new BadRequestException('Google Search not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get('https://www.googleapis.com/customsearch/v1', {
                    params: {
                        key: this.googleApiKey,
                        cx: this.googleCseId,
                        q: query,
                        num: Math.min(maxResults, 10), // Google CSE max is 10
                    },
                }),
            );

            return (response.data.items || []).map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                source: item.displayLink,
            }));
        } catch (error) {
            this.logger.error(`Google search failed: ${error.message}`);
            throw new BadRequestException('Google search failed: ' + error.message);
        }
    }

    /**
     * Search using Bing Search API
     */
    private async searchBing(query: string, maxResults: number): Promise<WebSearchResult[]> {
        if (!this.bingApiKey) {
            throw new BadRequestException('Bing Search not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get('https://api.bing.microsoft.com/v7.0/search', {
                    params: {
                        q: query,
                        count: maxResults,
                    },
                    headers: {
                        'Ocp-Apim-Subscription-Key': this.bingApiKey,
                    },
                }),
            );

            return (response.data.webPages?.value || []).map((item: any) => ({
                title: item.name,
                url: item.url,
                snippet: item.snippet,
                source: new URL(item.url).hostname,
                publishedDate: item.dateLastCrawled,
            }));
        } catch (error) {
            this.logger.error(`Bing search failed: ${error.message}`);
            throw new BadRequestException('Bing search failed: ' + error.message);
        }
    }

    /**
     * Search using Brave Search API
     */
    private async searchBrave(query: string, maxResults: number): Promise<WebSearchResult[]> {
        if (!this.braveApiKey) {
            throw new BadRequestException('Brave Search not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.get('https://api.search.brave.com/res/v1/web/search', {
                    params: {
                        q: query,
                        count: maxResults,
                    },
                    headers: {
                        'X-Subscription-Token': this.braveApiKey,
                    },
                }),
            );

            return (response.data.web?.results || []).map((item: any) => ({
                title: item.title,
                url: item.url,
                snippet: item.description,
                source: new URL(item.url).hostname,
                publishedDate: item.age,
            }));
        } catch (error) {
            this.logger.error(`Brave search failed: ${error.message}`);
            throw new BadRequestException('Brave search failed: ' + error.message);
        }
    }

    /**
     * Search using Serper API (Google Search)
     */
    private async searchSerper(query: string, maxResults: number): Promise<WebSearchResult[]> {
        if (!this.serperApiKey) {
            throw new BadRequestException('Serper not configured');
        }

        try {
            const response = await firstValueFrom(
                this.httpService.post(
                    'https://google.serper.dev/search',
                    {
                        q: query,
                        num: maxResults,
                    },
                    {
                        headers: {
                            'X-API-KEY': this.serperApiKey,
                            'Content-Type': 'application/json',
                        },
                    },
                ),
            );

            return (response.data.organic || []).map((item: any) => ({
                title: item.title,
                url: item.link,
                snippet: item.snippet,
                source: item.domain,
                publishedDate: item.date,
            }));
        } catch (error) {
            this.logger.error(`Serper search failed: ${error.message}`);
            throw new BadRequestException('Serper search failed: ' + error.message);
        }
    }

    /**
     * Search using DuckDuckGo (no API key required, uses instant answers)
     */
    private async searchDuckDuckGo(query: string, maxResults: number): Promise<WebSearchResult[]> {
        try {
            // DuckDuckGo instant answer API
            const response = await firstValueFrom(
                this.httpService.get('https://api.duckduckgo.com/', {
                    params: {
                        q: query,
                        format: 'json',
                        no_html: 1,
                        skip_disambig: 1,
                    },
                    timeout: 10000,
                }),
            );

            const results: WebSearchResult[] = [];

            // Abstract (main result)
            if (response.data.Abstract) {
                results.push({
                    title: response.data.Heading || query,
                    url: response.data.AbstractURL || '',
                    snippet: response.data.Abstract,
                    source: response.data.AbstractSource,
                });
            }

            // Related topics
            for (const topic of (response.data.RelatedTopics || []).slice(0, maxResults - 1)) {
                if (topic.Text && topic.FirstURL) {
                    results.push({
                        title: topic.Text.split(' - ')[0] || topic.Text.substring(0, 50),
                        url: topic.FirstURL,
                        snippet: topic.Text,
                        source: 'DuckDuckGo',
                    });
                }
            }

            // If no results, try HTML scraping as fallback
            if (results.length === 0) {
                return this.scrapeDuckDuckGoHtml(query, maxResults);
            }

            return results.slice(0, maxResults);
        } catch (error) {
            this.logger.warn(`DuckDuckGo API failed, trying HTML scraping: ${error.message}`);
            return this.scrapeDuckDuckGoHtml(query, maxResults);
        }
    }

    /**
     * Scrape DuckDuckGo HTML results (fallback)
     */
    private async scrapeDuckDuckGoHtml(query: string, maxResults: number): Promise<WebSearchResult[]> {
        try {
            const response = await firstValueFrom(
                this.httpService.get('https://html.duckduckgo.com/html/', {
                    params: { q: query },
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                    timeout: 10000,
                }),
            );

            const html = response.data;
            const results: WebSearchResult[] = [];

            // Simple regex to extract results
            const resultMatches = html.matchAll(
                /<a class="result__a" href="([^"]+)"[^>]*>([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi,
            );

            for (const match of resultMatches) {
                if (results.length >= maxResults) break;

                // Decode DuckDuckGo redirect URL
                let url = match[1];
                const uddgMatch = url.match(/uddg=([^&]+)/);
                if (uddgMatch) {
                    url = decodeURIComponent(uddgMatch[1]);
                }

                results.push({
                    title: match[2].trim(),
                    url,
                    snippet: match[3].replace(/<[^>]+>/g, '').trim(),
                    source: 'DuckDuckGo',
                });
            }

            return results;
        } catch (error) {
            this.logger.error(`DuckDuckGo HTML scraping failed: ${error.message}`);
            return [];
        }
    }

    /**
     * Summarize search results using AI
     */
    private async summarizeResults(
        query: string,
        results: WebSearchResult[],
        language = 'pt-BR',
    ): Promise<string> {
        try {
            const context = results
                .slice(0, 5)
                .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}`)
                .join('\n\n');

            const prompt = `Com base nos seguintes resultados de pesquisa para "${query}", forneça um resumo conciso e informativo que responda à consulta do usuário.

Resultados:
${context}

Forneça um resumo em ${language}, citando as fontes pelo número quando apropriado.`;

            const response = await firstValueFrom(
                this.httpService.post(`${this.aiServiceUrl}/chat`, {
                    messages: [
                        {
                            role: 'system',
                            content: 'Você é um assistente de pesquisa que resume resultados de busca de forma clara e objetiva.',
                        },
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                    temperature: 0.3,
                }),
            );

            return response.data.content;
        } catch (error) {
            this.logger.warn(`Failed to summarize results: ${error.message}`);
            return '';
        }
    }

    /**
     * Fetch and extract content from a URL
     */
    async fetchUrlContent(url: string): Promise<{ title: string; content: string; metadata: any }> {
        try {
            const response = await firstValueFrom(
                this.httpService.get(url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                    },
                    timeout: 30000,
                }),
            );

            const html = response.data;

            // Extract title
            const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
            const title = titleMatch ? titleMatch[1].trim() : '';

            // Remove scripts, styles, and extract text
            let content = html
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<[^>]+>/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();

            // Limit content length
            content = content.substring(0, 50000);

            return {
                title,
                content,
                metadata: {
                    url,
                    fetchedAt: new Date().toISOString(),
                },
            };
        } catch (error) {
            this.logger.error(`Failed to fetch URL content: ${error.message}`);
            throw new BadRequestException('Failed to fetch URL: ' + error.message);
        }
    }

    /**
     * Get the best available search provider
     */
    private getBestProvider(): 'google' | 'bing' | 'brave' | 'serper' | 'duckduckgo' {
        if (this.serperApiKey) return 'serper';
        if (this.googleApiKey && this.googleCseId) return 'google';
        if (this.braveApiKey) return 'brave';
        if (this.bingApiKey) return 'bing';
        return 'duckduckgo';
    }

    getAvailableProviders(): string[] {
        const providers: string[] = ['duckduckgo']; // Always available
        if (this.googleApiKey && this.googleCseId) providers.push('google');
        if (this.bingApiKey) providers.push('bing');
        if (this.braveApiKey) providers.push('brave');
        if (this.serperApiKey) providers.push('serper');
        return providers;
    }
}
