/**
 * RAG Service - Retrieval Augmented Generation
 * Handles document chunking, embedding generation, and semantic search for Voice AI agents
 */

import { prisma } from '../config/database';
import { openaiService } from '../integrations/openai.service';


// Simple in-memory cache for index status (TTL: 60 seconds)
const indexStatusCache = new Map<string, { status: IndexStatus; timestamp: number }>();
const INDEX_STATUS_CACHE_TTL = 60000; // 60 seconds

// ==================== INTERFACES ====================

export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separator?: string;
}

export interface SearchOptions {
  topK?: number;
  similarityThreshold?: number;
  sourceTypes?: string[];
}

export interface HybridSearchOptions extends SearchOptions {
  semanticWeight?: number; // 0-1, weight for semantic search
  keywordWeight?: number;  // 0-1, weight for keyword search
}

export interface ChunkResult {
  content: string;
  index: number;
  startOffset: number;
  endOffset: number;
}

export interface SearchResult {
  id: string;
  content: string;
  sourceType: string;
  sourceName: string | null;
  similarity: number;
  chunkIndex: number;
  totalChunks: number;
  metadata: Record<string, any>;
}

export interface IndexStatus {
  indexed: boolean;
  totalChunks: number;
  sourceTypes: { type: string; count: number }[];
  lastIndexedAt: Date | null;
  embeddingModel: string | null;
}

// ==================== RAG SERVICE ====================

export class RAGService {

  /**
   * Split text into overlapping chunks
   */
  chunkDocument(text: string, options: ChunkOptions = {}): ChunkResult[] {
    const {
      chunkSize = 1000,
      chunkOverlap = 200,
      separator = '\n\n'
    } = options;

    if (!text || text.trim().length === 0) {
      return [];
    }

    const chunks: ChunkResult[] = [];

    // First try to split by separator (paragraphs)
    const paragraphs = text.split(separator).filter(p => p.trim().length > 0);

    let currentChunk = '';
    let currentStartOffset = 0;
    let textOffset = 0;

    for (const paragraph of paragraphs) {
      const trimmedPara = paragraph.trim();

      // If adding this paragraph would exceed chunk size
      if (currentChunk.length + trimmedPara.length + 1 > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          index: chunks.length,
          startOffset: currentStartOffset,
          endOffset: textOffset - 1,
        });

        // Start new chunk with overlap
        const overlapStart = Math.max(0, currentChunk.length - chunkOverlap);
        const overlapText = currentChunk.substring(overlapStart);
        currentChunk = overlapText + separator + trimmedPara;
        currentStartOffset = textOffset - (currentChunk.length - trimmedPara.length - separator.length);
      } else {
        // Add to current chunk
        if (currentChunk.length > 0) {
          currentChunk += separator + trimmedPara;
        } else {
          currentChunk = trimmedPara;
          currentStartOffset = textOffset;
        }
      }

      textOffset += paragraph.length + separator.length;
    }

    // Don't forget the last chunk
    if (currentChunk.trim().length > 0) {
      chunks.push({
        content: currentChunk.trim(),
        index: chunks.length,
        startOffset: currentStartOffset,
        endOffset: textOffset,
      });
    }

    // Handle case where text is one long string without separators
    if (chunks.length === 0 && text.length > chunkSize) {
      let start = 0;
      while (start < text.length) {
        const end = Math.min(start + chunkSize, text.length);
        chunks.push({
          content: text.substring(start, end).trim(),
          index: chunks.length,
          startOffset: start,
          endOffset: end,
        });
        start += chunkSize - chunkOverlap;
      }
    } else if (chunks.length === 0 && text.length > 0) {
      chunks.push({
        content: text.trim(),
        index: 0,
        startOffset: 0,
        endOffset: text.length,
      });
    }

    return chunks;
  }

  /**
   * Generate embedding for text using OpenAI
   */
  async generateEmbedding(text: string, model = 'text-embedding-3-small'): Promise<number[]> {
    return openaiService.generateEmbedding(text, model);
  }

  /**
   * Store chunks with embeddings for an agent
   */
  async storeChunks(
    agentId: string,
    chunks: ChunkResult[],
    sourceType: string,
    sourceId?: string,
    sourceName?: string,
    embeddingModel = 'text-embedding-3-small'
  ): Promise<number> {
    if (chunks.length === 0) {
      return 0;
    }

    // Generate embeddings in batch
    const texts = chunks.map(c => c.content);
    const embeddings = await openaiService.generateEmbeddings(texts, embeddingModel);

    // Extract keywords from each chunk
    const keywordsPerChunk = chunks.map(chunk => this.extractKeywords(chunk.content));

    // Store chunks using raw SQL for vector support
    let stored = 0;
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const embedding = embeddings[i];
      const keywords = keywordsPerChunk[i];

      // Use raw SQL to insert with vector
      await prisma.$executeRaw`
        INSERT INTO knowledge_chunks (
          id, voice_agent_id, source_type, source_id, source_name,
          content, chunk_index, total_chunks, embedding, embedding_model,
          metadata, keywords, created_at, updated_at
        ) VALUES (
          gen_random_uuid(),
          ${agentId},
          ${sourceType},
          ${sourceId || null},
          ${sourceName || null},
          ${chunk.content},
          ${chunk.index},
          ${chunks.length},
          ${`[${embedding.join(',')}]`}::vector,
          ${embeddingModel},
          ${JSON.stringify({ startOffset: chunk.startOffset, endOffset: chunk.endOffset })}::jsonb,
          ${keywords}::text[],
          NOW(),
          NOW()
        )
      `;
      stored++;
    }

    console.log(`[RAG] Stored ${stored} chunks for agent ${agentId}, source: ${sourceType}`);
    return stored;
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    // Simple keyword extraction - remove common stop words and extract meaningful words
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'was', 'are', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'need',
      'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them', 'their',
      'we', 'us', 'our', 'you', 'your', 'he', 'she', 'him', 'her', 'his',
      'i', 'me', 'my', 'what', 'which', 'who', 'whom', 'how', 'when', 'where',
      'why', 'not', 'no', 'yes', 'all', 'any', 'both', 'each', 'few', 'more',
      'most', 'other', 'some', 'such', 'than', 'too', 'very', 'just', 'also'
    ]);

    const words = text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    // Get unique words and take top 20
    const uniqueWords = [...new Set(words)];
    return uniqueWords.slice(0, 20);
  }

  /**
   * Semantic search using vector similarity
   */
  async semanticSearch(
    agentId: string,
    query: string,
    options: SearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      topK = 5,
      similarityThreshold = 0.7,
      sourceTypes = []
    } = options;

    // Generate query embedding
    const queryEmbedding = await this.generateEmbedding(query);
    const embeddingVector = `[${queryEmbedding.join(',')}]`;

    // Validate and filter source types against allowed values (prevent SQL injection)
    const ALLOWED_SOURCE_TYPES = ['document', 'faq', 'knowledge_base', 'website', 'text', 'pdf', 'url'];
    const validSourceTypes = sourceTypes.filter(t =>
      ALLOWED_SOURCE_TYPES.includes(t.toLowerCase())
    );

    // Build parameterized query based on whether we have source type filter
    let results: Array<{
      id: string;
      content: string;
      source_type: string;
      source_name: string | null;
      chunk_index: number;
      total_chunks: number;
      metadata: any;
      similarity: number;
    }>;

    if (validSourceTypes.length > 0) {
      // Use ANY with array parameter for safe IN clause
      results = await prisma.$queryRawUnsafe<typeof results>(
        `SELECT
          id, content, source_type, source_name, chunk_index, total_chunks, metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM knowledge_chunks
        WHERE voice_agent_id = $2
          AND embedding IS NOT NULL
          AND source_type = ANY($4::text[])
        ORDER BY embedding <=> $1::vector
        LIMIT $3`,
        embeddingVector,
        agentId,
        topK,
        validSourceTypes
      );
    } else {
      // No source type filter
      results = await prisma.$queryRawUnsafe<typeof results>(
        `SELECT
          id, content, source_type, source_name, chunk_index, total_chunks, metadata,
          1 - (embedding <=> $1::vector) as similarity
        FROM knowledge_chunks
        WHERE voice_agent_id = $2
          AND embedding IS NOT NULL
        ORDER BY embedding <=> $1::vector
        LIMIT $3`,
        embeddingVector,
        agentId,
        topK
      );
    }

    return results
      .filter(r => r.similarity >= similarityThreshold)
      .map(r => ({
        id: r.id,
        content: r.content,
        sourceType: r.source_type,
        sourceName: r.source_name,
        similarity: r.similarity,
        chunkIndex: r.chunk_index,
        totalChunks: r.total_chunks,
        metadata: r.metadata,
      }));
  }

  /**
   * Keyword-based full-text search
   */
  async keywordSearch(
    agentId: string,
    query: string,
    topK = 5
  ): Promise<SearchResult[]> {
    // Convert query to tsquery format
    const searchTerms = query.toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2)
      .map(t => t + ':*')
      .join(' | ');

    if (!searchTerms) {
      return [];
    }

    const results = await prisma.$queryRawUnsafe<Array<{
      id: string;
      content: string;
      source_type: string;
      source_name: string | null;
      chunk_index: number;
      total_chunks: number;
      metadata: any;
      rank: number;
    }>>(
      `SELECT
        id, content, source_type, source_name, chunk_index, total_chunks, metadata,
        ts_rank_cd(to_tsvector('english', content), to_tsquery('english', $1)) as rank
      FROM knowledge_chunks
      WHERE voice_agent_id = $2
        AND to_tsvector('english', content) @@ to_tsquery('english', $1)
      ORDER BY rank DESC
      LIMIT $3`,
      searchTerms,
      agentId,
      topK
    );

    // Normalize rank to 0-1 similarity score
    const maxRank = Math.max(...results.map(r => r.rank), 1);

    return results.map(r => ({
      id: r.id,
      content: r.content,
      sourceType: r.source_type,
      sourceName: r.source_name,
      similarity: r.rank / maxRank,
      chunkIndex: r.chunk_index,
      totalChunks: r.total_chunks,
      metadata: r.metadata,
    }));
  }

  /**
   * Hybrid search combining semantic and keyword search
   */
  async hybridSearch(
    agentId: string,
    query: string,
    options: HybridSearchOptions = {}
  ): Promise<SearchResult[]> {
    const {
      topK = 5,
      similarityThreshold = 0.5,
      semanticWeight = 0.7,
      keywordWeight = 0.3,
      sourceTypes = []
    } = options;

    // Run both searches in parallel
    const [semanticResults, keywordResults] = await Promise.all([
      this.semanticSearch(agentId, query, { topK: topK * 2, similarityThreshold: 0.3, sourceTypes }),
      this.keywordSearch(agentId, query, topK * 2),
    ]);

    // Merge and re-rank results
    const resultMap = new Map<string, SearchResult>();

    // Add semantic results with weighted score
    for (const result of semanticResults) {
      resultMap.set(result.id, {
        ...result,
        similarity: result.similarity * semanticWeight,
      });
    }

    // Add/merge keyword results
    for (const result of keywordResults) {
      const existing = resultMap.get(result.id);
      if (existing) {
        // Combine scores
        existing.similarity += result.similarity * keywordWeight;
      } else {
        resultMap.set(result.id, {
          ...result,
          similarity: result.similarity * keywordWeight,
        });
      }
    }

    // Sort by combined score and filter
    const mergedResults = Array.from(resultMap.values())
      .filter(r => r.similarity >= similarityThreshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return mergedResults;
  }

  /**
   * Index all knowledge for an agent
   */
  async indexKnowledgeBase(agentId: string): Promise<{
    chunksCreated: number;
    sourceTypes: string[];
  }> {
    // Get agent with all knowledge sources
    const agent = await prisma.voiceAgent.findUnique({
      where: { id: agentId },
      select: {
        id: true,
        knowledgeBase: true,
        faqs: true,
        documents: true,
        ragSettings: true,
      },
    });

    if (!agent) {
      throw new Error('Agent not found');
    }

    // Get RAG settings
    const ragSettings = (agent.ragSettings as any) || {};
    const chunkSize = ragSettings.chunkSize || 1000;
    const chunkOverlap = ragSettings.chunkOverlap || 200;
    const embeddingModel = ragSettings.embeddingModel || 'text-embedding-3-small';

    // Clear existing index
    await this.clearAgentIndex(agentId);

    let totalChunks = 0;
    const sourceTypes: string[] = [];

    // Index knowledge base text
    if (agent.knowledgeBase && agent.knowledgeBase.trim().length > 0) {
      const chunks = this.chunkDocument(agent.knowledgeBase, { chunkSize, chunkOverlap });
      if (chunks.length > 0) {
        await this.storeChunks(agentId, chunks, 'knowledge_base', undefined, 'Knowledge Base', embeddingModel);
        totalChunks += chunks.length;
        sourceTypes.push('knowledge_base');
      }
    }

    // Index FAQs
    const faqs = (agent.faqs as any[]) || [];
    if (faqs.length > 0) {
      for (let i = 0; i < faqs.length; i++) {
        const faq = faqs[i];
        const faqText = `Question: ${faq.question}\nAnswer: ${faq.answer}`;
        const chunks = this.chunkDocument(faqText, { chunkSize, chunkOverlap });
        if (chunks.length > 0) {
          await this.storeChunks(agentId, chunks, 'faq', `faq_${i}`, faq.question, embeddingModel);
          totalChunks += chunks.length;
        }
      }
      if (faqs.length > 0 && !sourceTypes.includes('faq')) {
        sourceTypes.push('faq');
      }
    }

    // Index documents (metadata only - actual content would need document processing)
    const documents = (agent.documents as any[]) || [];
    if (documents.length > 0) {
      for (const doc of documents) {
        if (doc.description) {
          const docText = `Document: ${doc.name}\nDescription: ${doc.description}`;
          const chunks = this.chunkDocument(docText, { chunkSize, chunkOverlap });
          if (chunks.length > 0) {
            await this.storeChunks(agentId, chunks, 'document', doc.id, doc.name, embeddingModel);
            totalChunks += chunks.length;
          }
        }
      }
      if (documents.length > 0 && !sourceTypes.includes('document')) {
        sourceTypes.push('document');
      }
    }

    console.log(`[RAG] Indexed ${totalChunks} chunks for agent ${agentId}`);

    // Invalidate cache after indexing
    this.invalidateCache(agentId);

    return { chunksCreated: totalChunks, sourceTypes };
  }

  /**
   * Clear all indexed chunks for an agent
   */
  async clearAgentIndex(agentId: string): Promise<number> {
    const result = await prisma.$executeRaw`
      DELETE FROM knowledge_chunks WHERE voice_agent_id = ${agentId}
    `;
    // Invalidate cache
    this.invalidateCache(agentId);
    console.log(`[RAG] Cleared ${result} chunks for agent ${agentId}`);
    return Number(result);
  }

  /**
   * Get indexing status for an agent (cached for 60 seconds)
   */
  async getIndexStatus(agentId: string): Promise<IndexStatus> {
    // Check cache first
    const cached = indexStatusCache.get(agentId);
    if (cached && Date.now() - cached.timestamp < INDEX_STATUS_CACHE_TTL) {
      return cached.status;
    }

    const chunks = await prisma.$queryRawUnsafe<Array<{
      source_type: string;
      count: string;
      last_updated: Date;
      embedding_model: string;
    }>>(
      `SELECT
        source_type,
        COUNT(*) as count,
        MAX(updated_at) as last_updated,
        MAX(embedding_model) as embedding_model
      FROM knowledge_chunks
      WHERE voice_agent_id = $1
      GROUP BY source_type`,
      agentId
    );

    if (chunks.length === 0) {
      const status: IndexStatus = {
        indexed: false,
        totalChunks: 0,
        sourceTypes: [],
        lastIndexedAt: null,
        embeddingModel: null,
      };
      indexStatusCache.set(agentId, { status, timestamp: Date.now() });
      return status;
    }

    const sourceTypes = chunks.map(c => ({
      type: c.source_type,
      count: parseInt(c.count, 10),
    }));

    const totalChunks = sourceTypes.reduce((sum, s) => sum + s.count, 0);
    const lastIndexedAt = chunks.reduce((latest, c) =>
      c.last_updated > latest ? c.last_updated : latest,
      chunks[0].last_updated
    );

    const status: IndexStatus = {
      indexed: true,
      totalChunks,
      sourceTypes,
      lastIndexedAt,
      embeddingModel: chunks[0].embedding_model,
    };
    indexStatusCache.set(agentId, { status, timestamp: Date.now() });
    return status;
  }

  /**
   * Invalidate index status cache for an agent
   */
  invalidateCache(agentId: string): void {
    indexStatusCache.delete(agentId);
  }

  /**
   * Get chunks for an agent (with pagination)
   */
  async getChunks(
    agentId: string,
    page = 1,
    pageSize = 20
  ): Promise<{ chunks: any[]; total: number; pages: number }> {
    const offset = (page - 1) * pageSize;

    const [chunks, countResult] = await Promise.all([
      prisma.$queryRawUnsafe<Array<{
        id: string;
        source_type: string;
        source_name: string | null;
        content: string;
        chunk_index: number;
        total_chunks: number;
        metadata: any;
        keywords: string[];
        created_at: Date;
      }>>(
        `SELECT id, source_type, source_name, content, chunk_index, total_chunks, metadata, keywords, created_at
        FROM knowledge_chunks
        WHERE voice_agent_id = $1
        ORDER BY source_type, chunk_index
        LIMIT $2 OFFSET $3`,
        agentId,
        pageSize,
        offset
      ),
      prisma.$queryRawUnsafe<Array<{ count: string }>>(
        `SELECT COUNT(*) as count FROM knowledge_chunks WHERE voice_agent_id = $1`,
        agentId
      ),
    ]);

    const total = parseInt(countResult[0]?.count || '0', 10);

    return {
      chunks: chunks.map(c => ({
        id: c.id,
        sourceType: c.source_type,
        sourceName: c.source_name,
        content: c.content,
        chunkIndex: c.chunk_index,
        totalChunks: c.total_chunks,
        metadata: c.metadata,
        keywords: c.keywords,
        createdAt: c.created_at,
      })),
      total,
      pages: Math.ceil(total / pageSize),
    };
  }

  /**
   * Build context string from search results for prompt injection
   */
  buildContextFromResults(results: SearchResult[], maxTokens = 2000): string {
    if (results.length === 0) {
      return '';
    }

    const contextParts: string[] = [];
    let currentTokens = 0;
    const tokensPerChar = 0.25; // Rough estimate

    for (const result of results) {
      const estimatedTokens = result.content.length * tokensPerChar;

      if (currentTokens + estimatedTokens > maxTokens) {
        break;
      }

      contextParts.push(`[${result.sourceType}: ${result.sourceName || 'Untitled'}]\n${result.content}`);
      currentTokens += estimatedTokens;
    }

    return contextParts.join('\n\n---\n\n');
  }
}

export const ragService = new RAGService();
export default ragService;
