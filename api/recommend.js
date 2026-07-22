export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método não permitido" });
  }

  try {
    const { categoria, respostas } = req.body;

    // Validação
    if (!categoria || !respostas) {
      return res.status(400).json({ error: "Faltam categoria ou respostas" });
    }

    // DADOS SIMULADOS (depois você integra APIs reais)
    const PRODUTOS = {
      aspirador: [
        {
          id: "wap-w400",
          nome: "WAP Robot W400",
          marca: "WAP · marca brasileira",
          preco: 899,
          rating: 4.5,
          avaliacoes: 6340,
          vendedor: "Loja oficial WAP",
          link: "https://www.mercadolivre.com.br/rob-aspirador-de-po-wap-autorrecarga-e-controle-robot-w400-_JM",
          specs: { laser: false, pano: true, app: true, autonomia: "100 min" },
          resumo: "Best-seller WAP. Aspira e passa pano, controle por app. Confiança comprada com volume."
        },
        {
          id: "ekaza-zuno",
          nome: "Ekaza Zuno Smart",
          marca: "Ekaza · inteligência prática",
          preco: 1099,
          rating: 4.8,
          avaliacoes: 500,
          vendedor: "Loja oficial Ekaza",
          link: "https://www.mercadolivre.com.br/rob-aspirador-de-po-zuno-inteligente-smart-clean-e-passa-pano-mapeamento-da-casa-alexa-24w-cor-preto-ekaza/p/MLB61991863",
          specs: { laser: true, pano: true, app: true, autonomia: "120 min" },
          resumo: "Barato mas com laser. Melhor custo-benefício pra quem quer inteligência sem quebrar o banco."
        },
        {
          id: "xiaomi-s10",
          nome: "Xiaomi Mi Robot S10",
          marca: "Xiaomi · líder de vendas",
          preco: 2299,
          rating: 4.8,
          avaliacoes: 1345,
          vendedor: "MercadoLíder · +10 mil vendas",
          link: "https://www.mercadolivre.com.br/aspirador-inteligente-xiaomi-mi-vacuum-mop-s10-bhr6389us-cor-cor-branco/p/MLB24943613",
          specs: { laser: true, pano: true, app: true, autonomia: "130 min" },
          resumo: "A melhor nota (4,8 estrelas) com mais de mil avaliações. Confiança pura."
        },
        {
          id: "dreame-x40",
          nome: "Dreame X40 Ultra",
          marca: "Dreame · tecnologia premium",
          preco: 6500,
          rating: 4.9,
          avaliacoes: 320,
          vendedor: "Loja oficial Dreame",
          link: "https://www.amazon.com.br/Dreame-X40-Aspirador-esvaziado-esfregona/dp/B0D534DYFR",
          specs: { laser: true, pano: true, app: true, autolimpeza: true, autonomia: "180 min" },
          resumo: "Topo de linha. Aspira + passa pano + se limpa sozinho. Premium pra quem quer tudo."
        }
      ],
      tv: [
        {
          id: "tv-samsung-43",
          nome: "Samsung Smart TV 43\"",
          marca: "Samsung",
          preco: 1400,
          rating: 4.5,
          avaliacoes: 200,
          vendedor: "Loja Samsung",
          link: "https://www.mercadolivre.com.br/",
          specs: { tamanho: "43\"", resolucao: "4K", hz: 60 },
          resumo: "Samsung 43\" 4K. Confiável, bom preço."
        },
        {
          id: "tv-lg-55",
          nome: "LG Smart TV 55\" 4K",
          marca: "LG",
          preco: 2800,
          rating: 4.6,
          avaliacoes: 350,
          vendedor: "Loja LG",
          link: "https://www.mercadolivre.com.br/",
          specs: { tamanho: "55\"", resolucao: "4K", hz: 120 },
          resumo: "LG 55\" com 120Hz. Ótimo pra esportes e filmes."
        },
        {
          id: "tv-sony-65",
          nome: "Sony Bravia 65\" 4K",
          marca: "Sony",
          preco: 5500,
          rating: 4.8,
          avaliacoes: 450,
          vendedor: "Loja Sony",
          link: "https://www.mercadolivre.com.br/",
          specs: { tamanho: "65\"", resolucao: "4K", hz: 120 },
          resumo: "Sony premium 65\". Qualidade de imagem superior."
        }
      ],
      notebook: [
        {
          id: "nb-dell-i5",
          nome: "Dell Inspiron i5",
          marca: "Dell",
          preco: 2800,
          rating: 4.4,
          avaliacoes: 180,
          vendedor: "Loja Dell",
          link: "https://www.mercadolivre.com.br/",
          specs: { cpu: "Intel i5", ram: "8GB", ssd: "256GB" },
          resumo: "Dell i5. Bom pra trabalho e estudo."
        },
        {
          id: "nb-lenovo-ryzen",
          nome: "Lenovo Ryzen 5",
          marca: "Lenovo",
          preco: 3200,
          rating: 4.6,
          avaliacoes: 220,
          vendedor: "Loja Lenovo",
          link: "https://www.mercadolivre.com.br/",
          specs: { cpu: "Ryzen 5", ram: "16GB", ssd: "512GB" },
          resumo: "Lenovo Ryzen 5. Mais potência, bom custo."
        },
        {
          id: "nb-asus-premium",
          nome: "ASUS Vivobook Premium",
          marca: "ASUS",
          preco: 5500,
          rating: 4.8,
          avaliacoes: 380,
          vendedor: "Loja ASUS",
          link: "https://www.mercadolivre.com.br/",
          specs: { cpu: "Intel i7", ram: "16GB", ssd: "1TB" },
          resumo: "ASUS premium. Melhor performance e design."
        }
      ]
    };

    // Função simples de scoring
    function pontuar(produto, respostas) {
      let score = 60;
      const precoNum = produto.preco;

      // Lógica de preço
      if (respostas.gasto === "baixo") {
        if (precoNum <= 1500) score += 30;
        else if (precoNum <= 2500) score -= 20;
        else score -= 40;
      } else if (respostas.gasto === "medio") {
        if (precoNum >= 1400 && precoNum <= 2600) score += 30;
        else if (precoNum < 1400) score += 10;
        else score -= 20;
      } else {
        if (precoNum >= 2000) score += 24;
        else score += 8;
      }

      // Bonus rating
      score += (produto.rating - 4.3) * 25;

      return Math.max(35, Math.min(99, Math.round(score)));
    }

    // Pega produtos da categoria
    const produtos = PRODUTOS[categoria] || [];

    if (produtos.length === 0) {
      return res.status(404).json({ error: "Nenhum produto encontrado" });
    }

    // Score e ordena
    const scored = produtos.map((p) => ({
      ...p,
      match: pontuar(p, respostas)
    }));

    const top3 = scored.sort((a, b) => b.match - a.match).slice(0, 3);

    // Resposta
    res.status(200).json({
      categoria,
      resultados: top3,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error("Erro:", error);
    res.status(500).json({ error: error.message });
  }
}
