# Radar de concursos — Contabilidade Pública, AFO e Auditoria

Lista de concursos públicos (federais, estaduais e municipais) para Contador e cargos cujo edital cobra Contabilidade Pública, AFO/Direito Financeiro ou Auditoria Governamental. Exibida em https://www.contas.cnt.br/concursos/

## Arquivos

| Arquivo | Função |
|---|---|
| `concursos.json` | A lista. Atualizada todos os dias às 6h55 por uma tarefa agendada do Claude. |
| `radar.js` | Widget que mostra a lista no WordPress. |
| `backup/concursos-anterior.json` | Cópia da versão anterior de `concursos.json`, gravada antes de cada atualização. |
| `controle/validar.py` | Validação executada antes de cada publicação (`python3 controle/validar.py concursos.json --hoje AAAA-MM-DD`). |
| `controle/execucoes.json` | Rodízio das 27 UFs e registro de cada execução. |

## Campos de cada concurso

`id`, `orgao`, `cargo`, `esfera`, `uf`, `banca`, `vagas`, `salario`, `inscricoes_inicio`, `inscricoes_fim`, `prova`, `situacao`, `disciplinas`, `conteudo`, `fonte`, `observacao`, `atualizado_em` (data do processamento), e desde 25/10/2026:

- `nivel_confirmacao`: `Edital oficial` (conferido no edital ou no site do órgão/banca), `Fonte secundária` (só agregadores/blogs) ou `Previsto`.
- `fonte_oficial`: URL oficial conferida, ou `null`.
- `verificado_em`: data da última conferência efetiva na fonte oficial, ou `null`.
- `edital`: identificação do edital (ex.: `01/2026`), ou `null`.

Confira sempre o edital oficial antes de se inscrever.
