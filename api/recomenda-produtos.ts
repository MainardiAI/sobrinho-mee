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

interface ClaudeResponse {
  recomendacoes: ProdutoRecomendado[];
}

// Função para buscar produtos via SerpAPI
async function buscarProdutosSerpAPI(
  categoria: string,
  necessidades: string,
  orcamento: string
): Promise<SearchResult[]> {
  const queries: Record<string, string> = {
    "robô-aspirador": `melhor robô aspirador inteligente mercado livre amazon 2026 ${necessidades}`,
    tv: `melhor televisão 4k smart tv mercado livre amazon ${necessidades}`,
    notebook: `melhor notebook laptop mercado livre amazon ${necessidades}`,
  };

  const query = queries[categoria] || queries["robô-aspirador"];

  try {
    console.log("[DEBUG] Buscando com query:", query);
    const response = await fetch(
      `https://serpapi.com/search?q=${encodeURIComponent(query)}&engine=google_shopping&api_key=${process.env.SERPAPI_API_KEY}&gl=br&hl=pt-br`
    );

    const data = (await response.json()) as SerpAPIResponse;
    console.log("[DEBUG] Resposta SerpAPI status:", response.status);
    console.log("[DEBUG] Dados SerpAPI keys:", Object.keys(data));

    if (!data.shopping_results) {
      console.error("[DEBUG] Nenhum shopping_results encontrado", data.search_information);
      return [];
    }

    console.log("[DEBUG] Produtos encontrados:", data.shopping_results.length);

    // Log do primeiro produto para debug
    if (data.shopping_results.length > 0) {
      console.log("[DEBUG] Primeiro produto (raw):", JSON.stringify(data.shopping_results[0], null, 2).substring(0, 500));
    }

    // Formatar resultados - usar product_link se disponível
    const resultados = data.shopping_results.slice(0, 10).map((item, idx) => {
      const resultado = {
        title: item.title || "Produto sem título",
        price: item.price || "Não informado",
        rating: item.rating || 0,
        reviews: item.review_count || 0,
        source: item.source || "Não informado",
        link: item.product_link || item.link || "#",
      };
      if (idx === 0) {
        console.log("[DEBUG] Primeiro produto (processado):", resultado);
      }
      return resultado;
    });

    return resultados;
  } catch (error) {
    console.error("[DEBUG] Erro ao buscar no SerpAPI:", error);
    return [];
  }
}

// Função para processar resultados com Claude
async function processarComClaude(
  categoria: string,
  necessidades: string,
  orcamento: string,
  produtos: SearchResult[]
): Promise<ProdutoRecomendado[]> {
  const produtosText = produtos
    .map(
      (p, i) => `
${i + 1}. ${p.title}
   Preço: ${p.price}
   Loja: ${p.source}
   Avaliação: ${p.rating}/5 (${p.reviews} reviews)
   Link direto: ${p.link}
`
    )
    .join("\n");

  const prompt = `Você é um assistente que recomenda produtos brasileiros de forma simples e direta.

Categoria solicitada: ${categoria}
O que o cliente precisa: ${necessidades}
Orçamento: ${orcamento}

Aqui estão ${produtos.length} produtos encontrados em lojas (Mercado Livre e Amazon Brasil):

${produtosText}

Tarefa:
1. Escolha os 3 melhores produtos que combinam com as necessidades
2. Considere preço, avaliação de usuários e disponibilidade
3. Para cada um, use EXATAMENTE o link que aparece em "Link direto:" acima (copie o URL inteiro)
4. Para cada um, explique em 1 frase por que é bom

IMPORTANTE: Os links devem ser copiados exatamente como aparecem na lista acima.

Responda APENAS em JSON válido, sem markdown ou backticks:
{"recomendacoes": [{"posicao": 1, "nome": "nome exato do produto", "preco": "preço", "avaliacao": 4.5, "loja": "loja", "link": "link copiado exatamente de Link direto:", "motivo": "Por que é bom em 1 frase"}]}`;

  try {
    console.log("[DEBUG] Enviando prompt para Claude...");
    const message = await client.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 4096,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    console.log("[DEBUG] Resposta do Claude recebida");
    console.log("[DEBUG] Número de content blocks:", message.content.length);
    
    // Procurar pelo bloco de texto (pode ter thinking antes)
    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[DEBUG] Nenhum bloco de texto encontrado. Blocos:", message.content.map(b => b.type));
      throw new Error("Resposta do Claude não contém texto");
    }

    const textContent = textBlock.text;
    console.log("[DEBUG] Comprimento total da resposta:", textContent?.length);

    // Estratégia 1: Tentar parse direto
    let resultado: ClaudeResponse;
    try {
      resultado = JSON.parse(textContent) as ClaudeResponse;
      console.log("[DEBUG] JSON parseado com sucesso (parse direto)");
    } catch (e1) {
      // Estratégia 2: Procurar por { ... } e tentar novamente
      const startIdx = textContent?.indexOf("{");
      const endIdx = textContent?.lastIndexOf("}");
      
      if (startIdx === -1 || endIdx === -1) {
        console.error("[DEBUG] Nenhum JSON encontrado. Resposta:", textContent?.substring(0, 500));
        throw new Error("Não consegui encontrar JSON na resposta");
      }

      const jsonStr = textContent?.substring(startIdx, endIdx + 1);
      console.log("[DEBUG] JSON extraído (índice):", jsonStr?.substring(0, 300));
      
      try {
        resultado = JSON.parse(jsonStr) as ClaudeResponse;
        console.log("[DEBUG] JSON parseado com sucesso (após extração)");
      } catch (e2) {
        console.error("[DEBUG] JSON inválido mesmo após extração:", jsonStr?.substring(0, 500));
        throw new Error("JSON inválido na resposta do Claude");
      }
    }

    console.log("[DEBUG] Recomendações processadas:", resultado?.recomendacoes?.length || 0);
    return resultado?.recomendacoes || [];
  } catch (error) {
    console.error("[DEBUG] Erro ao processar com Claude:", error);
    return [];
  }
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  res.setHeader("Access-Control-Allow-Origin", "*");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  if (req.method !== "POST") {
    res.status(405).json({ erro: "Método não permitido" });
    return;
  }

  try {
    const { categoria, necessidades, orcamento } = req.body as {
      categoria?: string;
      necessidades?: string;
      orcamento?: string;
    };

    console.log("[DEBUG] Requisição recebida:", { categoria, necessidades, orcamento });

    if (!categoria || !necessidades || !orcamento) {
      res.status(400).json({ erro: "Dados incompletos" });
      return;
    }

    // Buscar produtos
    console.log("[DEBUG] Iniciando busca de produtos...");
    const produtos = await buscarProdutosSerpAPI(
      categoria,
      necessidades,
      orcamento
    );

    console.log("[DEBUG] Produtos retornados:", produtos.length);

    if (produtos.length === 0) {
      console.error("[DEBUG] PROBLEMA: Nenhum produto encontrado");
      res.status(500).json({
        erro: "Não consegui encontrar produtos. Tente novamente.",
        debug: "SerpAPI não retornou resultados",
      });
      return;
    }

    // Processar com Claude
    console.log("[DEBUG] Enviando para processamento com Claude...");
    const recomendacoes = await processarComClaude(
      categoria,
      necessidades,
      orcamento,
      produtos
    );

    console.log("[DEBUG] Recomendações finais:", recomendacoes.length);

    res.status(200).json({
      sucesso: true,
      recomendacoes: recomendacoes,
      produtosEncontrados: produtos.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[DEBUG] Erro na API:", error);
    res.status(500).json({
      erro: "Erro ao processar recomendações",
      detalhes: error instanceof Error ? error.message : "Erro desconhecido",
    });
  }
}
