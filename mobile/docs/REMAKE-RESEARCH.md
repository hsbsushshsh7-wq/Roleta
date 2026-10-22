# Roleta Remake 2.0 — pesquisa e decisões

Consulta às fontes oficiais em 21/10/2026 (horário do usuário):

- [Picker Wheel: pesos, cores e modos](https://pickerwheel.com/) descreve pesos relativos: a participação de uma entrada depende do seu peso dividido pela soma. Também documenta eliminação, personalização de cores e compartilhamento de resultados. O remake usa entradas independentes e explicita a chance real, sem alterar os outros pesos.
- [Ferramentas do Picker Wheel](https://pickerwheel.com/tools/) reúne decisões sim/não, números, letras e formação de equipes. O remake adapta essas tarefas para uso offline: modelos de decisão e dados, lote e grupos equilibrados.
- [Wheel of Names: FAQ](https://wheelofnames.com/faq) reúne personalização, tempo de giro, sons, salvamento e compartilhamento. A nova interface agrupa as opções em Sorteio, Visual e Experiência, com controles de resultado, nomes das fatias e duração.

Os recursos foram implementados localmente. Nenhum código, lista de personagens ou conjunto de poderes desses serviços foi copiado. Os seis modelos novos são identificados como modelos rápidos; não substituem o elenco original indisponível.

## Comportamentos da versão 2.0

- **Pesos independentes:** 90 + 30 permanecem 90 e 30 no editor; a roleta mostra 75% e 25% reais. Peso zero pausa uma entrada. A edição aceita até quatro casas decimais e valor máximo de um bilhão. A última entrada positiva não pode ser zerada.
- **Migração:** pesos legados são convertidos uma única vez para a escala percentual que o usuário via anteriormente; a proporção matemática e os snapshots são preservados. O marcador `format: relative` impede conversões repetidas.
- **Visual:** cinco paletas, HEX por opção, título personalizado, contraste automático dos nomes e opção para ocultá-los. Até 720 fatias, a cor corresponde à opção; acima disso, a cor personalizada de maior índice em um grupo colore o grupo visual. Probabilidades permanecem individuais.
- **Modelos rápidos:** sim/não, moeda, D6, D20, letras e dias. Antes de substituir uma modalidade com conteúdo, cria-se uma predefinição recuperável da configuração deslocada.
- **Lote:** até 100 resultados com os mesmos pesos e bloqueios do motor principal; esgotamento é validado antes de alterar dados. Resultados vão ao histórico identificados como lote e não são apresentados como o resultado da roleta animada. O criador continua preenchendo uma categoria por giro.
- **Equipes:** embaralhamento Fisher–Yates com amostragem uniforme por rejeição; 2–20 equipes, até 5.000 entradas. Tamanhos diferem no máximo em uma pessoa. Duplicatas continuam sendo entradas distintas. Cada cartão mostra 20 participantes por página.
- **Experiência:** modo foco persistente, pop-up opcional, compartilhamento nativo do resultado/lote/equipes, sons, vibração e duração.

Todo o processamento e salvamento continuam offline. Os dados reais de elenco, poderes e fichas do usuário são preservados; a lista original completa continua dependendo do acesso à fonte.
