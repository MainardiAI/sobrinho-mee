import { VercelRequest, VercelResponse } from "@vercel/node";

interface RecommendRequest {
  categoria: string;
  respostas: Record<string, string>;
}

interface Recomendacao {
  posicao: number;
  nome: string;
  preco: string;
  avaliacao: number;
  loja: string;
  link: string;
  motivo: string;
}

interface RecommendResponse {
  sucesso: boolean;
  resultados: Array<{
    id: string;
    nome: string;
    preco: number;
    marca: string;
    rating: number;
    avaliacoes: number;
    vendedor: string;
    resumo: string;
    match: number;
    specs: Record<string, string>;
    link: string;
  }>;
}

// Mapear respostas para necessidades legíveis
function montarNecessidades(respostas: Record<string, string>, categoria: string): string {
  const partes = [];
  
  if (respostas.gasto === 'baixo') partes.push('até R$ 1.500');
  if (respostas.gasto === 'medio') partes.push('R$ 1.500-2.500');
  if (respostas.gasto === 'alto') partes.push('sem limite de orçamento');
  
  if (categoria === 'robô-aspirador') {
    if (respostas.casa === 'pequena') partes.push('para apartamento pequeno');
    if (respostas.casa === 'media') partes.push('para casa média');
    if (respostas.casa === 'grande') partes.push('para casa grande com mapeamento inteligente');
    
    if (respostas.trabalho === 'simples') partes.push('aspiração simples');
    if (respostas.trabalho === 'pano') partes.push('que aspira e passa pano');
    if (respostas.trabalho === 'tudo') partes.push('com autolimpeza completa');
  } else if (categoria === 'tv') {
    if (respostas.casa === 'pequena') partes.push('TV até 43 polegadas');
    if (respostas.casa === 'media') partes.push('TV 50-55 polegadas');
    if (respostas.casa === 'grande') partes.push('TV 65+ polegadas 4K');
  } else if (categoria === 'notebook') {
    if (respostas.trabalho === 'simples') partes.push('para uso básico');
    if (respostas.trabalho === 'pano') partes.push('para desenvolvimento');
    if (respostas.trabalho === 'tudo') partes.push('para jogos e 3D');
  }
  
  return partes.join(', ') || 'recomendação';
}

// Parsear preço de string "R$ 1.234,56" para number
function parsePreco(precoStr: string): number {
  const cleaned = precoStr.replace(/[^\d,]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
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
    const { categoria, respostas } = req.body as RecommendRequest;

    if (!categoria || !respostas) {
      res.status(400).json({ erro: "Dados incompletos" });
      return;
    }

    // Montar necessidades a partir das respostas
    const necessidades = montarNecessidades(respostas, categoria);
    const orcamento = respostas.gasto === 'baixo' 
      ? 'R$ 500-1500' 
      : respostas.gasto === 'medio' 
      ? 'R$ 1500-2500' 
      : 'R$ 2500+';

    console.log("[RECOMMEND] Chamando API de produtos:", { categoria, necessidades, orcamento });

    // Chamar a API de recomendação de produtos
    const produtosResponse = await fetch(
`/api/recomenda-produtos`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoria,
          necessidades,
          orcamento,
        }),
      }
    );

    if (!produtosResponse.ok) {
      throw new Error(`Erro na API de produtos: ${produtosResponse.status}`);
    }

    const produtosData = (await produtosResponse.json()) as {
      sucesso: boolean;
      recomendacoes: Recomendacao[];
      produtosEncontrados?: number;
      timestamp?: string;
    };

    if (!produtosData.sucesso || !produtosData.recomendacoes) {
      throw new Error("Nenhuma recomendação retornada");
    }

    // Transformar recomendações em formato esperado pelo frontend
    const resultados = produtosData.recomendacoes.map((rec, idx: number) => ({
      id: `prod-${idx}`,
      nome: rec.nome,
      preco: parsePreco(rec.preco),
      marca: rec.loja,
      rating: rec.avaliacao,
      avaliacoes: 0,
      vendedor: rec.loja,
      resumo: rec.motivo,
      match: 85 - idx * 5,
      specs: {
        autonomia: `Acesse para mais detalhes`,
      },
      link: rec.link,
    }));

    console.log("[RECOMMEND] Retornando resultados:", resultados.length);

    res.status(200).json({
      sucesso: true,
      resultados,
    });
  } catch (error) {
    console.error("[RECOMMEND] Erro:", error);
    res.status(500).json({
      sucesso: false,
      erro: error instanceof Error ? error.message : "Erro ao processar",
    });
  }
}
