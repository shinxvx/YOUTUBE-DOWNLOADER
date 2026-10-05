# Prompt original (enviado pelo dono)

Texto extraído de PROMPT_EIDRA__NEXUS_ACADEMY.docx, sem alterações.

    A combinação pode funcionar muito bem: coleção e evolução de criaturas com visual de GBA, batalhas por cartas e uma campanha conduzida por mapa, retratos e diálogos. A referência de Duel Academy combina com esse formato de locais selecionáveis, personagens disponíveis e passagem do tempo. PDF
    Escolhi Eidra: Nexus Academy como nome provisório e criei uma história em que as cartas fazem parte do próprio universo. Copie o prompt abaixo no Claude:
    Quero que você desenvolva um jogo original chamado EIDRA: NEXUS ACADEMY.
    Atue como game designer, roteirista, diretor de arte e desenvolvedor. Use as especificações abaixo como base para criar um jogo funcional, bonito e expansível.
    1. Conceito central
    Um RPG de coleção de criaturas e batalhas estratégicas por cartas, com uma campanha completa dentro de uma academia situada em uma ilha.
    As duas referências principais são:
    Pokémon FireRed e LeafGreen: referência de direção visual, pixel art, cores, criaturas carismáticas, coleção, evolução e sensação de aventura.
    Yu-Gi-Oh! GX Duel Academy, especificamente o jogo de GBA: referência principal para estrutura do mundo, navegação por locais, encontros com personagens, rotina da academia, diálogos, duelos e progressão.
    É muito importante entender a diferença:
    Não quero controlar um personagem andando por cidades, rotas ou corredores.
    Quero selecionar destinos em um mapa simplificado, encontrar personagens apresentados por retratos, conversar, participar de eventos, montar meu deck e disputar duelos.
    A experiência deve se concentrar em:mapa → encontro → diálogo ou atividade → duelo → recompensa → progressão.
    Crie identidade própria para nomes, criaturas, personagens, história, símbolos, interface, cartas e músicas. As referências servem para orientar a experiência e a linguagem visual.
    Perfeito. Só uma correção: no prompt usamos JavaScript, que é diferente de Java. Podemos manter JavaScript e usar Electron para gerar um aplicativo desktop com executável .exe. Electron
    Substitua a seção 2 do prompt por esta. A história e as mecânicas continuam iguais.
    2. Plataforma, implementação e distribuição
    Desenvolva EIDRA: NEXUS ACADEMY como um jogo desktop para Windows, utilizando JavaScript e Electron, com intenção de distribuição futura na Steam.
    O produto final deve abrir pelo seu próprio executável .exe, em uma janela independente, sem exigir navegador, Node.js instalado pelo jogador, terminal ou servidor de desenvolvimento.
    Tecnologia
    JavaScript para a lógica do jogo.
    HTML/CSS e Canvas para interface, pixel art e animações.
    Electron para execução como aplicativo desktop.
    Electron Forge para empacotamento.
    Código modular, separando batalha, interface, conteúdo, salvamento e integrações de plataforma.
    Todos os recursos necessários devem acompanhar o jogo.
    A campanha single-player deve funcionar offline.
    Experiência desktop
    Priorizar teclado e mouse.
    Oferecer modo janela e tela cheia, com atalho Alt+Enter.
    Permitir redimensionamento preservando proporção e nitidez da pixel art.
    Incluir configurações de áudio, resolução e velocidade das animações.
    Pausar atividades apropriadas quando a janela perder o foco.
    Criar ícone e identificação próprios para o aplicativo.
    Salvamento
    Use arquivos locais em uma pasta apropriada de dados do usuário, fora do diretório de instalação.
    Inclua:
    Salvamento automático e manual.
    Múltiplos slots.
    Versão do formato de save para permitir migrações futuras.
    Gravação atômica e backup do último save válido.
    Preservação dos saves após atualizações.
    Não dependa exclusivamente de localStorage para guardar o progresso.
    Distribuição para Windows
    Configure e documente:
    Comando para executar em desenvolvimento.
    Comando para gerar o pacote Windows x64.
    Executável do jogo com seus arquivos de suporte.
    Instalador para distribuição independente.
    Pasta de distribuição adequada para futura preparação de um build na Steam.
    O executável pode acompanhar arquivos de suporte; não é necessário concentrar todo o jogo em um único arquivo.
    Verifique os caminhos de imagens, áudio e dados na versão empacotada. O jogo deve funcionar sem o servidor de desenvolvimento.
    Se o ambiente disponível não permitir gerar ou testar o build de Windows, explique essa limitação e entregue a configuração e os comandos necessários. Não afirme que o .exe foi validado sem realmente testá-lo.
    Preparação para Steam
    Estruture uma camada separada para futuras integrações com Steamworks, incluindo conquistas, Steam Cloud e identificação do usuário.
    Nesta primeira versão:
    O jogo deve funcionar sem integração Steam.
    Não invente um App ID definitivo.
    Não implemente conquistas ou serviços fictícios como se estivessem conectados.
    Documente os pontos de integração e o que dependerá da configuração futura no Steamworks.
    Critério de entrega
    A entrega técnica deve incluir código-fonte, recursos, configuração de empacotamento e instruções de build.
    Quando o ambiente permitir, entregue também o pacote Windows testado.
    A primeira versão jogável e a campanha completa descritas neste prompt devem utilizar essa estrutura desktop desde o início.
    
    3. Direção visual
    Quero um jogo com forte inspiração na qualidade visual de Pokémon FireRed/LeafGreen, preservando pixel art consistente.
    Características:
    Cores vivas, contornos bem definidos e sombreamento em poucos tons.
    Criaturas com silhuetas reconhecíveis.
    Cenários acolhedores, detalhados e fáceis de ler.
    Retratos de personagens em pixel art, com expressões diferentes.
    Janelas de diálogo e menus com identidade de RPG portátil.
    Cartas com ilustrações em pixel art.
    Animações curtas para invocação, ataque, dano, evolução e vitória.
    Efeitos discretos de partículas e iluminação.
    Ampliação dos sprites sem borrar os pixels.
    Use uma referência interna de 480×320 para cenas e tabuleiro, com ampliação proporcional. Texto e detalhes ampliados das cartas podem usar uma camada de interface de maior resolução para garantir legibilidade.
    Não use emojis como arte final de criaturas nem transforme o jogo em um dashboard genérico. O mapa deve parecer uma ilha de RPG desenhada em pixel art, com pontos interativos.
    4. Universo: o que são os Eidra?
    As criaturas deste universo se chamam Eidra.
    São seres vivos conectados à energia natural chamada Essência. Habitam florestas, oceanos, montanhas, ruínas e cidades.
    Humanos descobriram como registrar uma assinatura de Essência em objetos chamados Nexus Cards.
    Essas cartas não aprisionam os Eidra: permitem manifestar uma projeção temporária de uma criatura com quem existe um vínculo. Nos duelos, as projeções disputam energia dentro de arenas protegidas.
    Isso explica:
    Por que as criaturas aparecem em cartas.
    Por que podem lutar sem morrer.
    Por que existem várias cópias de uma carta.
    Por que evoluções dependem de sintonia.
    Por que estudar criaturas e construir relacionamentos importa.
    A coleção deve transmitir a sensação de conhecer espécies e formar vínculos, além de adquirir cartas.
    5. Mundo e navegação
    A campanha acontece na Ilha de Aster, sede da Nexus Academy.
    Crie um mapa com estes destinos:
    Dormitório: descansar, salvar e consultar mensagens.
    Praça central: encontros, notícias e desafios.
    Sala de aula: tutoriais e desafios táticos.
    Arena: duelos oficiais e torneios.
    Loja: pacotes de cartas e compras diretas.
    Laboratório: pesquisa, criação de cartas e estudos de evolução.
    Jardim de Essência: encontros com Eidra.
    Biblioteca: história, pistas e informações de criaturas.
    Porto: visitantes e eventos.
    Farol antigo: mistério central da campanha.
    Reserva natural: expedições por escolhas.
    Núcleo subterrâneo: desbloqueado no final.
    Ao clicar em um destino, exiba:
    Cenário daquele local.
    Retratos dos personagens presentes.
    Ações disponíveis.
    Eventos e objetivos relevantes.
    As conversas acontecem em caixas de diálogo, com nome, retrato, expressão e escolhas quando apropriado.
    Não implemente movimentação livre.
    6. Rotina e progressão
    Cada dia tem três períodos: manhã, tarde e noite.
    Conversas comuns, gerenciamento de deck e leitura de informações não consomem tempo.
    Duelo, aula, expedição ou evento importante consome um período.
    A interface deve informar o custo antes da atividade.
    Personagens disponíveis variam conforme horário e capítulo.
    Eventos essenciais permanecem disponíveis até serem concluídos.
    Não permita perder a campanha por deixar passar um dia.
    A academia tem três níveis de licença:
    Initiate.
    Adept.
    Nexus Master.
    A promoção exige desafios táticos e duelos específicos, não apenas repetir batalhas.
    Planeje aproximadamente 6 a 8 horas de campanha, com atividades opcionais e pós-jogo. Trate isso como meta de conteúdo, sem preencher a duração com grind obrigatório.
    7. Sistema original de cartas
    Crie um sistema que combine evolução de criaturas, afinidades e sinergias de deck.
    Não copie integralmente as regras de Pokémon TCG ou Yu-Gi-Oh.
    Regras básicas
    Deck de exatamente 30 cartas.
    Máximo de 2 cópias da mesma carta.
    Mínimo de 8 criaturas básicas.
    Cada jogador começa com 20 pontos de Nexus.
    Mão inicial de 5 cartas.
    Até 3 criaturas no campo de cada jogador.
    Sem cartas de recurso obrigatórias no deck.
    Cada jogador começa seu primeiro turno com capacidade de 1 ponto de Essência. A capacidade aumenta em 1 no início de cada turno próprio, até o máximo de 6.
    A Essência disponível é restaurada até essa capacidade no início do turno. Essência não usada não acumula.
    Custos de invocação, evolução e técnicas usam esse recurso.
    Tipos de cartas
    CriaturaPossui nome, afinidade, estágio, custo, HP, ataque e habilidade.
    EvoluçãoÉ colocada sobre uma criatura da linhagem correspondente.
    TécnicaProduz um efeito imediato, como cura, dano, compra ou movimentação.
    RelíquiaÉ equipada em uma criatura. Máximo de uma por criatura.
    TerrenoAltera as condições para os dois jogadores. Existe apenas um terreno global; um novo substitui o anterior.
    Estrutura do turno
    Resolver efeitos de início de turno.
    Aumentar capacidade e restaurar Essência.
    Comprar uma carta.
    Fase principal: invocar, evoluir, equipar e usar técnicas.
    Fase de combate.
    Resolver efeitos de fim de turno.
    O primeiro jogador não compra carta nem pode atacar em seu primeiro turno.
    Na fase de combate:
    Cada criatura pronta pode atacar uma vez.
    Criaturas recém-invocadas não podem atacar naquele turno.
    O atacante escolhe uma criatura inimiga como alvo.
    Se o adversário não tiver criaturas, pode atacar diretamente seu Nexus.
    O dano permanece entre turnos.
    Não existe contra-ataque automático.
    Criaturas com HP igual ou inferior a zero vão para o descarte.
    Não ocorre dano excedente ao Nexus ao derrotar uma criatura.
    Atacar encerra a possibilidade de jogar novas cartas naquele turno, evitando ambiguidades de timing.
    Evolução
    Só pode evoluir uma criatura que já estava em campo no início do turno.
    Máximo de uma evolução por criatura por turno.
    Pague o custo da evolução.
    Preserve relíquia, estados e dano acumulado.
    Evoluir não permite atacar novamente.
    Ao ser derrotada, toda a pilha de evolução vai para o descarte.
    Vitória e regras de segurança
    Vence quem reduzir o Nexus adversário a zero.
    Se o deck acabar, a partida continua. Cada compra impossível causa dano de fadiga ao próprio Nexus: 1 na primeira, 2 na segunda e assim por diante.
    Limite de mão: 8 cartas ao final do turno; o jogador escolhe quais descartar.
    Se ambos os Nexus chegarem a zero pelo mesmo efeito, ocorre empate.
    Em evento obrigatório, empate permite repetir sem penalidade.
    Todas as ações ilegais devem ser bloqueadas e explicadas.
    Defina ordem determinística para efeitos simultâneos.
    Implemente um registro legível do duelo.
    8. Afinidades e estratégia
    Use seis afinidades iniciais:
    Ember: fogo, pressão e dano contínuo.
    Tide: água, cura e controle.
    Grove: natureza, proteção e crescimento.
    Volt: eletricidade, ritmo e combinações.
    Stone: resistência e defesa.
    Veil: ilusão, manipulação e efeitos arriscados.
    As afinidades devem definir principalmente o estilo das cartas.
    Para a vantagem elemental inicial, use somente:
    Ember → Grove → Tide → Ember
    Um ataque com vantagem causa +1 de dano à criatura alvo. Esse bônus não afeta ataques diretos ao Nexus nem dano causado por técnicas.
    Volt, Stone e Veil se diferenciam por habilidades, sem outro ciclo de vantagens nesta primeira versão.
    Prefira efeitos interessantes a multiplicadores exagerados.
    9. Criaturas iniciais
    Crie estas três linhagens de parceiros iniciais:
    Ember
    Cindlet → Brasear → Solmara
    Uma criatura inspirada em um pequeno mamífero do deserto, evoluindo para um guardião felino de juba incandescente.
    Estilo: agressividade e pressão.
    Tide
    Ripplet → Neruvin → Abyssail
    Uma pequena criatura anfíbia com barbatanas translúcidas, evoluindo para um guardião aquático elegante.
    Estilo: recuperação e controle.
    Grove
    Mossbit → Thornook → Elderhorn
    Uma criatura de bosque com musgo e brotos, evoluindo para um guardião de galhadas vegetais.
    Estilo: resistência e evolução.
    Cada parceiro deve ser visualmente original, sem reproduzir a silhueta de um inicial conhecido.
    Complete o catálogo inicial com outras cinco linhagens de três estágios:
    Volt: Zippip → Arclyn → Tempestrix.
    Stone: Pebblit → Cragoon → Monolithor.
    Veil: Wispin → Mirravel → Noctilume.
    Tide: Shellip → Corallop → Reefwarden.
    Grove: Budwing → Florafin → Canopyra.
    Adicione seis criaturas sem evolução:
    Kilnox, Drizzlet, Briarimp, Coilisk, Cairnox e Hushowl, uma de cada afinidade.
    Crie também três Eidra lendários:
    Aurivane: renovação da Essência.
    Noxeral: memória e passagem dos ciclos.
    Concordia: equilíbrio entre vínculos diferentes.
    Os lendários devem ter limitações de deck e custos elevados, sem garantir vitória automática.
    Para cada criatura, defina aparência, personalidade, habitat, descrição, afinidade, estágio, estatísticas e habilidade.
    10. Coleção e economia
    Quero uma coleção inicial de aproximadamente 80 cartas:
    33 cartas de criaturas, contando estágios e lendários.
    24 técnicas.
    15 relíquias.
    8 terrenos.
    Formas de obter cartas:
    Duelo.
    Missão.
    Pacote comprado com moeda do jogo.
    Pesquisa.
    Evento de vínculo.
    Criação com fragmentos de duplicatas.
    Sem pagamentos reais.
    Mostre as probabilidades dos pacotes. Cartas essenciais para a história e para os decks iniciais devem ter obtenção garantida.
    Inclua:
    Editor de decks.
    Três espaços de deck.
    Filtros por afinidade, tipo, custo e estágio.
    Validação de deck.
    Enciclopédia de Eidra.
    Visualização das linhagens.
    Deck inicial completo para cada parceiro.
    11. Personagens
    O protagonista tem nome escolhido pelo jogador e recebe uma bolsa para estudar na academia.
    Personagens principais:
    MiraEstudante curiosa que pesquisa habitats e usa Grove/Tide. Torna-se a primeira amiga do protagonista.
    RenRival competitivo que usa Volt/Ember. Inicialmente associa força a vencer sozinho, mas aprende a confiar nos outros.
    SorenAluno veterano que usa Stone e evoluções. Ajuda estudantes novos e suspeita das alterações nos duelos.
    Professora ElaraPesquisadora responsável pelo tutorial e pelo estudo de vínculos. Descobre as primeiras evidências da crise.
    Diretor VaelCarismático e respeitado. Defende que a academia pode proteger os Eidra de futuras catástrofes, mas esconde métodos perigosos.
    IrisEstudante reservada que usa Veil. Investiga registros sobre o desaparecimento do irmão, um antigo aluno.
    Crie ainda pelo menos seis personagens secundários com retrato, personalidade, deck e pequena missão próprios.
    Relacionamentos desbloqueiam cenas e desafios. A história principal continua compreensível sem completar todas as amizades.
    12. História completa
    Tema central:Um vínculo não pode ser substituído por controle.
    Ato 1 — A chegada
    O protagonista chega à Ilha de Aster, escolhe um parceiro e participa de um duelo de admissão.
    Conhece Mira, Ren, Soren, Elara e Vael.
    Durante uma demonstração, seu parceiro reage a uma pulsação vinda do farol. Por um instante, uma projeção desconhecida aparece em uma carta vazia.
    O protagonista recebe sua primeira licença.
    Ato 2 — A primeira competição
    O jogador participa do torneio de iniciantes e conhece diferentes estratégias.
    Mira percebe que alguns Eidra da reserva estão apáticos. Iris investiga cartas que perderam sua assinatura de Essência.
    A academia trata os casos como falhas técnicas.
    Após a final contra Ren, uma pane faz as projeções permanecerem na arena por tempo demais. Elara começa a investigar.
    Ato 3 — Cartas sem vínculo
    O grupo descobre Nexus Cards artificiais capazes de manifestar criaturas sem vínculo.
    Essas cartas tornam os duelos instáveis e drenam Essência da ilha.
    Vael afirma que são parte de uma pesquisa necessária para evitar outra catástrofe como o antigo Silêncio de Aster, que destruiu habitats e atingiu sua família.
    Iris encontra registros do irmão trabalhando no projeto antes de desaparecer.
    Soren ajuda o grupo a alcançar os arquivos do farol.
    Ato 4 — O projeto Eclipse
    A investigação revela o Projeto Eclipse: uma rede que conecta as arenas ao núcleo subterrâneo da ilha.
    Os torneios estão alimentando a rede com Essência dos duelos.
    Vael pretende manifestar e controlar Noxeral, usando sua capacidade de conservar memórias para congelar o ciclo natural da Essência. Ele acredita que isso impedirá novas perdas.
    O irmão de Iris está vivo, preso em uma câmara de estase após tentar interromper o projeto.
    Ren aceita uma carta artificial para provar sua força. O jogador o enfrenta, e a instabilidade do duelo mostra o custo desse poder.
    Depois da derrota, Ren se junta ao grupo.
    Ato 5 — A ilha em silêncio
    O projeto entra em funcionamento durante o campeonato final.
    Habitats perdem energia e partes do mapa mudam visualmente. A academia suspende as atividades comuns.
    Os protagonistas precisam restaurar três pontos de equilíbrio através de desafios, diálogos e duelos.
    Aurivane desperta, mas sozinho não consegue resolver a crise. Noxeral também não é maligno: está sendo forçado a sustentar a rede.
    Os vínculos restaurados permitem manifestar Concordia.
    O irmão de Iris é resgatado e explica como desmontar o núcleo sem destruir as assinaturas dos Eidra.
    Ato 6 — O último duelo
    O jogador enfrenta Vael no núcleo subterrâneo.
    O duelo final tem condições especiais anunciadas antes da partida e utiliza as mesmas regras fundamentais do restante do jogo.
    Vael usa um deck construído em torno de Noxeral e cartas artificiais, com efeitos fortes e custos reais.
    Concordia é uma recompensa opcional para o deck: o jogador pode vencer com sua própria estratégia.
    Após a vitória, o grupo desmonta a rede. Vael reconhece que tentou preservar a vida retirando dela a liberdade de mudar.
    Ele perde o cargo e responde por suas ações.
    Elara assume a direção provisória. A academia passa a priorizar conservação e vínculos.
    O protagonista conclui o campeonato reconstruído e se torna Nexus Master.
    Finalize com cenas que mostrem o destino de Mira, Ren, Soren, Iris e seu irmão, além da recuperação da ilha.
    A campanha deve ter um encerramento completo.
    Pós-jogo
    Torneios avançados.
    Revanche contra versões mais fortes dos personagens.
    Missões dos lendários.
    Conclusão da enciclopédia.
    Desafios de construção de deck.
    Epílogo da recuperação da ilha.
    13. Expedições sem movimentação livre
    As expedições acontecem por cenas e escolhas.
    Exemplo:
    “O sinal de Essência vem da lagoa. Investigar a margem, observar à distância ou consultar Mira?”
    Cada escolha pode gerar um encontro, recurso, diálogo ou desafio.
    Criaturas selvagens manifestam um pequeno deck temático. Após vencer ou cumprir uma condição de pesquisa, o jogador registra sua assinatura e recebe a carta.
    Não implemente captura com bolas ou batalhas aleatórias ao caminhar.
    14. Inteligência artificial e dificuldade
    A IA deve:
    Respeitar as mesmas regras do jogador.
    Conhecer apenas sua própria mão e informações públicas.
    Avaliar ataques, evolução, remoção, proteção e dano letal.
    Ter estilos diferentes conforme o personagem.
    Evitar jogadas ilegais e loops.
    Tomar decisões em tempo razoável.
    Crie dificuldade acessível no início e mais estratégica ao longo da campanha.
    Derrotas obrigatórias não devem bloquear o progresso: permita repetir, ajustar o deck e consultar dicas.
    15. Interface obrigatória
    Implemente:
    Tela inicial.
    Novo jogo e continuar.
    Escolha de parceiro.
    Mapa com dia, período e objetivo atual.
    Retratos e diálogos.
    Coleção e enciclopédia.
    Editor de decks.
    Loja.
    Diário de missões.
    Tela de duelo.
    Tela de recompensas.
    Configurações de áudio e velocidade de animação.
    Na batalha, mostre claramente Nexus, Essência, mão, campos, descarte, terreno, estados e jogador ativo.
    Clique em uma carta para ampliar sua arte e texto. Ao selecionar uma ação, destaque alvos válidos e mostre o custo.
    16. Desenvolvimento e critérios de conclusão
    Antes de implementar, apresente brevemente:
    Arquitetura.
    Modelo de dados.
    Decisões necessárias para fechar as regras.
    Plano de desenvolvimento.
    Depois, comece a implementação.
    Primeiro entregue uma versão jogável contendo:
    Escolha entre os três parceiros.
    Mapa com pelo menos cinco locais.
    Diálogos com Mira, Ren e Elara.
    Editor de deck funcional.
    Duelo completo contra IA.
    Evolução, recompensa e salvamento.
    Primeiro arco narrativo com introdução e conclusão.
    Essa versão inicial deve permitir jogar o ciclo completo. Depois expanda para a campanha e o catálogo definidos acima.
    Não apresente uma versão parcial como se o jogo inteiro estivesse concluído.
    Verifique especialmente: compra de cartas, recursos, ataques, evolução, descarte, fim de partida, efeitos simultâneos, salvamento e retomada.
    Se faltarem artes, use recursos provisórios de pixel art com dimensões e caminhos preparados para substituição. Identifique o que ainda é provisório.
    Evite botões sem função, telas apenas decorativas e conteúdo anunciado que não existe.
    O resultado deve preservar esta prioridade:
    Um RPG de criaturas e cartas, com aparência de GBA e estrutura de mundo baseada em Yu-Gi-Oh! GX Duel Academy: mapa selecionável, retratos, diálogos, rotina, duelos e uma história com começo, meio e fim.
    
