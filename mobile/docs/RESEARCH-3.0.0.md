# Pesquisa para a 3.0.0

Consulta em 22/10/2026. As páginas abaixo foram acessadas e seu conteúdo textual analisado. Foram aproveitadas ideias de ferramentas; nenhum código, imagem de carta ou conjunto de dados externo foi copiado.

| Fonte | Recursos observados | Adaptação no app |
| --- | --- | --- |
| [Picker Wheel — Tools](https://pickerwheel.com/tools/) | Equipes, números, letras, datas, cores, sim/não | Catálogo pesquisável por finalidade; datas por intervalo e dias da semana; preservação das ferramentas existentes |
| [RANDOM.ORG — Playing Card Shuffler](https://www.random.org/playing-cards/) | Compra de cartas, naipes e coringas | Baralho local de 52/54 cartas sem reposição, última mão e compartilhamento |
| [RANDOM.ORG — Calendar Dates](https://www.random.org/calendar-dates/) | Sorteio de datas entre limites | Datas civis em UTC, validação de ano bissexto, dias permitidos e sorteio sem repetição |
| [RANDOM.ORG — menu de ferramentas](https://www.random.org/playing-cards/) | Dados, sequências, listas e estatísticas | Dados configuráveis, ordem aleatória e análise do histórico local |

Torneios, amigo secreto, temporizador e estúdio de listas completam a proposta para jogos e encontros. Os limites e comportamentos são próprios desta implementação. Não são recursos atribuídos ao site original sem evidência.

Toda aleatoriedade do app usa `expo-crypto`, sem depender de RANDOM.ORG ou de serviços online. Seleções uniformes usam rejeição para evitar viés de módulo. O amigo secreto rejeita permutações com autoatribuição; o limite de tentativas produz erro explícito em caso de fonte defeituosa, sem substituir por um algoritmo enviesado.

Referências técnicas consultadas: [Expo Crypto SDK 55](https://docs.expo.dev/versions/v55.0.0/sdk/crypto/), [React Native 0.83 AppState](https://reactnative.dev/docs/0.83/appstate) e [Share](https://reactnative.dev/docs/0.83/share). Nenhuma dependência nativa nova foi adicionada na 3.0.
