import { VercelRequest, VercelResponse } from "@vercel/node";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface ProdutoRecomendado {
  posicao: number;
  nome: string;
  preco: string;
  avaliacao: number;
  loja: string;
  link: string;
  motivo: string;
}

interface SearchResult {
  title: string;
  price: string;
  rating: number;
  reviews: number;
  source: string;
  link: string;
}

interface SerpAPIResponse {
  shopping_results?: Array<{
    title: string;
    price?: string;
    rating?: number;
    review_count?: number;
    source?: string;
    link?: string;
    product_link?: string;
  }>;
  search_information?: {
    total_results?: string;
  };
}

interfac
