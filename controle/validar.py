#!/usr/bin/env python3
"""Validador do Radar de Concursos.

Uso:  python3 controle/validar.py concursos.json [--hoje AAAA-MM-DD]

Sai com código 0 se o arquivo pode ser publicado, 1 se há ERROS.
AVISOS não bloqueiam a publicação, mas devem constar do relatório diário.
Não altera nenhum arquivo.
"""
import json
import re
import sys
from collections import Counter
from datetime import date

CAMPOS = [
    # esquema original (usado pelo WordPress e pelo painel) — não remover nem renomear
    "id", "orgao", "cargo", "esfera", "uf", "banca", "vagas", "salario",
    "inscricoes_inicio", "inscricoes_fim", "prova", "situacao", "disciplinas",
    "conteudo", "fonte", "observacao", "atualizado_em",
    # campos acrescentados em 25/10/2026
    "nivel_confirmacao", "fonte_oficial", "verificado_em", "edital",
]
OBRIGATORIOS_NAO_NULOS = [
    "id", "orgao", "cargo", "esfera", "uf", "situacao", "disciplinas",
    "conteudo", "fonte", "atualizado_em", "nivel_confirmacao",
]
ESFERAS = {"Federal", "Estadual", "Municipal"}
SITUACOES = {"Inscrições abertas", "Inscrições em breve", "Previsto", "Inscrições encerradas"}
CONTEUDOS = {"Confirmado", "A confirmar"}
NIVEIS = {"Edital oficial", "Fonte secundária", "Previsto"}
UFS = {
    "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
    "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO", "Nacional",
}
DATA = re.compile(r"^\d{4}-\d{2}-\d{2}$")
ID = re.compile(r"^[a-z0-9][a-z0-9-]{1,120}$")


def data_valida(v):
    if not isinstance(v, str) or not DATA.match(v):
        return False
    try:
        date.fromisoformat(v)
        return True
    except ValueError:
        return False


def normaliza(s):
    return re.sub(r"\s+", " ", (s or "").strip().lower())


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    caminho = argv[1]
    hoje = None
    if "--hoje" in argv:
        hoje = argv[argv.index("--hoje") + 1]

    erros, avisos = [], []
    try:
        with open(caminho, encoding="utf-8") as f:
            dados = json.load(f)
    except Exception as e:  # noqa: BLE001
        print(f"ERRO: JSON inválido ou ilegível: {e}")
        return 1
    if not isinstance(dados, list) or not dados:
        print("ERRO: o arquivo deve ser um array JSON não vazio.")
        return 1

    for n, r in enumerate(dados):
        ref = f"[{n}] {r.get('id', '?') if isinstance(r, dict) else '?'}"
        if not isinstance(r, dict):
            erros.append(f"{ref}: item não é objeto")
            continue
        faltando = [c for c in CAMPOS if c not in r]
        if faltando:
            erros.append(f"{ref}: campos ausentes {faltando}")
        extras = [c for c in r if c not in CAMPOS]
        if extras:
            avisos.append(f"{ref}: campos fora do esquema {extras}")
        for c in OBRIGATORIOS_NAO_NULOS:
            if c in r and (r[c] is None or r[c] == ""):
                erros.append(f"{ref}: campo obrigatório vazio '{c}'")

        if r.get("id") and not ID.match(str(r["id"])):
            erros.append(f"{ref}: id fora do padrão (minúsculas, números e hífen)")
        if r.get("esfera") not in ESFERAS:
            erros.append(f"{ref}: esfera inválida {r.get('esfera')!r}")
        if r.get("uf") not in UFS:
            erros.append(f"{ref}: uf inválida {r.get('uf')!r}")
        if r.get("situacao") not in SITUACOES:
            erros.append(f"{ref}: situacao inválida {r.get('situacao')!r}")
        if r.get("conteudo") not in CONTEUDOS:
            erros.append(f"{ref}: conteudo inválido {r.get('conteudo')!r}")
        if r.get("nivel_confirmacao") not in NIVEIS:
            erros.append(f"{ref}: nivel_confirmacao inválido {r.get('nivel_confirmacao')!r}")

        for c in ("vagas", "salario"):
            v = r.get(c)
            if v is not None and (isinstance(v, bool) or not isinstance(v, (int, float)) or v < 0):
                erros.append(f"{ref}: {c} deve ser número não negativo ou null")

        for c in ("inscricoes_inicio", "inscricoes_fim", "prova", "atualizado_em", "verificado_em"):
            v = r.get(c)
            if v is not None and not data_valida(v):
                erros.append(f"{ref}: data inválida em {c}: {v!r}")

        ini, fim, prova = r.get("inscricoes_inicio"), r.get("inscricoes_fim"), r.get("prova")
        if ini and fim and data_valida(ini) and data_valida(fim) and ini > fim:
            erros.append(f"{ref}: inscricoes_inicio posterior a inscricoes_fim")
        if fim and prova and data_valida(fim) and data_valida(prova) and fim > prova:
            avisos.append(f"{ref}: prova anterior ao fim das inscrições")
        ver, atu = r.get("verificado_em"), r.get("atualizado_em")
        if ver and atu and data_valida(ver) and data_valida(atu) and ver > atu:
            erros.append(f"{ref}: verificado_em posterior a atualizado_em")

        for c in ("fonte", "fonte_oficial"):
            v = r.get(c)
            if v is not None and not str(v).startswith(("http://", "https://")):
                erros.append(f"{ref}: {c} não é URL")

        nivel = r.get("nivel_confirmacao")
        if nivel == "Edital oficial" and (not r.get("fonte_oficial") or not r.get("verificado_em")):
            erros.append(f"{ref}: 'Edital oficial' exige fonte_oficial e verificado_em")
        if nivel == "Previsto" and r.get("situacao") != "Previsto":
            avisos.append(f"{ref}: nivel 'Previsto' com situacao {r.get('situacao')!r}")
        if r.get("conteudo") == "Confirmado" and "conferir" in normaliza(r.get("disciplinas")):
            erros.append(f"{ref}: conteudo 'Confirmado' sem disciplinas identificadas")
        if r.get("conteudo") == "Confirmado" and nivel != "Edital oficial":
            avisos.append(f"{ref}: disciplinas 'Confirmado' sem conferência no edital oficial")

        if hoje and data_valida(hoje):
            sit = r.get("situacao")
            if sit == "Inscrições abertas" and fim and data_valida(fim) and fim < hoje:
                erros.append(f"{ref}: 'Inscrições abertas' com fim em {fim}")
            if sit == "Inscrições em breve" and ini and data_valida(ini) and ini <= hoje:
                avisos.append(f"{ref}: 'Inscrições em breve' com início em {ini}")
            if sit == "Inscrições encerradas" and fim and data_valida(fim) and fim >= hoje:
                avisos.append(f"{ref}: 'Inscrições encerradas' com fim em {fim}")
            if atu and atu != hoje:
                avisos.append(f"{ref}: atualizado_em ({atu}) diferente de hoje ({hoje})")

    ids = Counter(r.get("id") for r in dados if isinstance(r, dict))
    for i, q in ids.items():
        if q > 1:
            erros.append(f"id duplicado: {i} ({q}x)")

    chaves = Counter()
    for r in dados:
        if isinstance(r, dict) and r.get("edital"):
            chaves[(normaliza(r.get("orgao")), normaliza(r.get("edital")), normaliza(r.get("cargo")))] += 1
    for k, q in chaves.items():
        if q > 1:
            erros.append(f"possível duplicidade (órgão + edital + cargo): {k}")

    orgs = Counter(normaliza(r.get("orgao")) for r in dados if isinstance(r, dict))
    for o, q in orgs.items():
        if q > 1:
            avisos.append(f"órgão com mais de um registro (conferir se não é duplicidade): {o} ({q}x)")

    niveis = Counter(r.get("nivel_confirmacao") for r in dados if isinstance(r, dict))
    print(f"Registros: {len(dados)} | " + " | ".join(f"{k}: {v}" for k, v in sorted(niveis.items(), key=str)))
    for a in avisos:
        print("AVISO:", a)
    for e in erros:
        print("ERRO:", e)
    print(f"Resultado: {'REPROVADO' if erros else 'APROVADO'} ({len(erros)} erros, {len(avisos)} avisos)")
    return 1 if erros else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
