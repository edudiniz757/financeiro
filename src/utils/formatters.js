// Formata número para moeda brasileira
export function formatarMoeda(valor) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

// Formata data para exibição
export function formatarData(data) {
  return new Date(data + "T00:00:00").toLocaleDateString("pt-BR");
}

// Retorna o nome do mês atual
export function nomeMesAtual() {
  return new Date().toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
}
