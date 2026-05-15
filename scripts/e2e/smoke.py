"""
RachaoApp - Smoke test E2E (Playwright)

Roda um fluxo ponta-a-ponta em browser real. Passos (alinhados a run() e README):

 00. Health da API + pagina inicial do web
 01. Signup (usuario novo por execucao)
 02. Onboarding Presidente + primeiro grupo
 03. Dashboard (grupo inicial listado)
 04. Segundo grupo via /grupos/novo
 05. Lista /grupos com busca
 06. Editar grupo
 07. Adicionar boleiro
 08. Ficha do boleiro (sheet)
 09. Criar partida (wizard 6 steps; localStorage seed conforme README)
 10. Detalhe da partida
 11. Lista de presencas
 12. Centro de notificacoes
 13. Logout

Em caso de falha:
- Screenshot em ./screenshots/<HHMMSS>-fail-<step>.png
- URL atual e HTML truncado no stderr

Uso:
    cd scripts/e2e
    pip install -r requirements.txt
    python -m playwright install chromium
    python smoke.py                # browser visivel (padrao)
    python smoke.py --headless     # sem janela (CI / mais rapido)
    python smoke.py --slowmo=300   # adiciona 300ms entre cada acao

WEB_URL / API_URL: ver .env.example (default localhost:3001 e :3333).
"""
from __future__ import annotations

import argparse
import os
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import urlparse

from dotenv import load_dotenv
from playwright.sync_api import (
    Browser,
    BrowserContext,
    Page,
    Playwright,
    TimeoutError as PWTimeout,
    expect,
    sync_playwright,
)

ROOT = Path(__file__).resolve().parent

# **/grupos/** casa com /grupos/novo; apos "Criar grupo" o wait terminava sem ir ao detalhe.
_GRUPO_DETALHE_URL_RE = re.compile(r".*/grupos/(?!novo$)(?!editar$)[^/?#]+/?(?:\?.*)?$")
# Mesmo problema com /partidas/nova vs /partidas/[id]; o lookahead precisa
# rejeitar "nova" seguido por '/', '?', '#' ou fim de string.
_PARTIDA_DETALHE_URL_RE = re.compile(r".*/partidas/(?!nova(?:[/?#]|$))[^/?#]+/?(?:\?.*)?$")
SCREENSHOTS = ROOT / "screenshots"
SCREENSHOTS.mkdir(exist_ok=True)

# --------------------------------------------------------------------------
# Config
# --------------------------------------------------------------------------
load_dotenv(ROOT / ".env")
load_dotenv(ROOT / ".env.local")  # opcional, sobrescreve

WEB_URL = os.environ.get("WEB_URL", "http://localhost:3001")
API_URL = os.environ.get("API_URL", "http://localhost:3333")

# Cada execucao gera email/senha novos para garantir isolamento.
TS = datetime.now().strftime("%Y%m%d%H%M%S")
TEST_EMAIL = f"e2e-{TS}@rachao.local"
TEST_PASSWORD = "Senha@12345"
TEST_NOME = f"Teste E2E {TS[-6:]}"
TEST_CELULAR = "11999990000"

NOME_GRUPO_INICIAL = f"Pelada {TS[-6:]}"
NOME_GRUPO_2 = f"Society {TS[-6:]}"
NOME_BOLEIRO = "João Silva"
APELIDO_BOLEIRO = "Jacare"
CELULAR_BOLEIRO = "11988887777"

LOCAL_PARTIDA = "Quadra do Boa Esperança"


# --------------------------------------------------------------------------
# Helpers
# --------------------------------------------------------------------------
GREEN = "\033[32m"
RED = "\033[31m"
CYAN = "\033[36m"
YELLOW = "\033[33m"
RESET = "\033[0m"


def log(step: str, msg: str = "", color: str = CYAN) -> None:
    prefix = f"{color}[{step}]{RESET}"
    if msg:
        print(f"{prefix} {msg}")
    else:
        print(prefix)


def ok(step: str, msg: str = "") -> None:
    log(step, msg or "OK", GREEN)


def fail(page: Page, step: str, exc: Exception) -> None:
    ts = datetime.now().strftime("%H%M%S")
    shot = SCREENSHOTS / f"{ts}-fail-{step}.png"
    try:
        page.screenshot(path=str(shot), full_page=True)
    except Exception:
        pass
    print(f"{RED}[{step}] FAIL: {exc}{RESET}", file=sys.stderr)
    print(f"{YELLOW}-> Screenshot salvo em {shot}{RESET}", file=sys.stderr)
    print(f"{YELLOW}-> URL: {page.url}{RESET}", file=sys.stderr)
    try:
        body = page.content()
        print(body[:1500].replace("\n", " ") + ("..." if len(body) > 1500 else ""), file=sys.stderr)
    except Exception:
        pass


def click_button_with_text(page: Page, text: str) -> None:
    """Clica no primeiro botao/link com o texto dado (regex insensivel)."""
    page.get_by_role("button", name=text).first.click()


def _seed_wizard_storage(page: Page, grupo_id: str, data: str, hora: str) -> None:
    """Pre-popula o localStorage do wizard de partida no formato Zustand persist.

    Inputs <input type='date'/'time'> em Playwright headless+pt-BR sofrem com
    fill()/keyboard.type por causa do parser de segmentos. Setar o estado
    direto via Zustand persist evita o problema e mantem o wizard navegavel."""
    payload = {
        "state": {
            "currentStep": 0,
            "grupoId": grupo_id,
            "data": data,
            "hora": hora,
            "numTimes": 2,
            "boleirosPorTime": 5,
            "tempoPartida": 15,
            "tempoTotal": 90,
            "recorrenteAtivo": False,
            "semanasOcorrencias": 4,
            "usarEstadioCadastrado": False,
            "localLivre": "",
            "cidade": "",
            "estadioId": None,
            "boleirosIds": [],
            "convidados": [],
            "regras": {
                "cartao_azul": {"ativo": False, "duracao_minutos": 5},
                "bloqueio_vermelho": {"ativo": False},
                "bloqueio_inadimplente": {"ativo": False},
                "gol_olimpico_duplo": {"ativo": False},
                "impedimento_ativo": {"ativo": False},
                "penalti_max_por_tempo": {"ativo": False, "limite": 2},
                "time_menor_joga": {"ativo": False},
                "goleiro_obrigatorio": {"ativo": False},
            },
            "vaquinha": {
                "ativa": False,
                "tipoChavePix": "",
                "chavePix": "",
                "valorBoleiroFixo": 0,
                "valorConvidadoAvulso": 0,
                "mesmoValor": True,
                "tipoCobranca": "por_partida",
            },
        },
        "version": 2,
    }
    page.evaluate(
        "(p) => window.localStorage.setItem('rachao-partida-wizard', JSON.stringify(p))",
        payload,
    )


# --------------------------------------------------------------------------
# Steps
# --------------------------------------------------------------------------
def step_health(page: Page) -> None:
    """Verifica que API e web estao respondendo antes de iniciar."""
    log("00", f"Verificando services em {WEB_URL} e {API_URL}")
    res = page.request.get(f"{API_URL}/health")
    assert res.ok, f"API health falhou: {res.status}"
    page.goto(WEB_URL, wait_until="domcontentloaded", timeout=15000)
    assert page.url.startswith(WEB_URL), f"Web nao respondeu em {WEB_URL}"
    ok("00", f"API ok ({res.json().get('service')}) | Web ok")


def step_signup(page: Page) -> None:
    log("01", f"Signup com {TEST_EMAIL}")
    page.goto(f"{WEB_URL}/cadastro", wait_until="networkidle")

    # IDs estaveis (evita strict mode: label "Senha" tambem casa com "Mostrar senha")
    page.locator("#nome").fill(TEST_NOME)
    page.locator("#email").fill(TEST_EMAIL)
    page.locator("#celular").fill(TEST_CELULAR)
    page.locator("#senha").fill(TEST_PASSWORD)

    # Checkbox de termos (Radix).
    page.get_by_role("checkbox").first.check()

    page.get_by_role("button", name="Criar conta").click()
    page.wait_for_url("**/onboarding", timeout=20000)
    ok("01", "Cadastro feito, redirecionado pra /onboarding")


def step_onboarding(page: Page) -> None:
    log("02", f"Onboarding como Presidente + grupo '{NOME_GRUPO_INICIAL}'")
    expect(page).to_have_url(f"{WEB_URL}/onboarding")

    # Card e um <button> com <h3>Presidente</h3> dentro
    page.locator("button", has=page.get_by_role("heading", name="Presidente")).click()
    page.get_by_role("button", name="Continuar").click()

    # Step 2 — labels reais do onboarding-flow.tsx + ids do FormField
    page.locator("#nomeGrupo").fill(NOME_GRUPO_INICIAL)
    page.locator("#cidade").fill("São Paulo")
    page.get_by_role("button", name="Entrar no app").click()

    page.wait_for_url("**/dashboard", timeout=20000)
    ok("02", "Onboarding concluido, em /dashboard")


def step_dashboard(page: Page) -> None:
    log("03", "Validando Dashboard")
    expect(page).to_have_url(f"{WEB_URL}/dashboard")

    # Saudacao com primeiro nome
    primeiro_nome = TEST_NOME.split()[0]
    expect(page.get_by_text(primeiro_nome, exact=False)).to_be_visible()

    # Bloco "Meus Grupos" deve mostrar o grupo criado no onboarding
    expect(page.get_by_text(NOME_GRUPO_INICIAL).first).to_be_visible(timeout=10000)
    ok("03", f"Grupo '{NOME_GRUPO_INICIAL}' aparece no dashboard")


def step_criar_grupo(page: Page) -> None:
    log("04", f"Criar segundo grupo '{NOME_GRUPO_2}' via /grupos/novo")
    page.goto(f"{WEB_URL}/grupos/novo", wait_until="networkidle")

    dlg = page.get_by_role("dialog")
    expect(dlg).to_be_visible()

    # Placeholder do nome e prefixo do placeholder da descricao — exige exact=True
    # no primeiro, senao o Playwright casa os dois (substring).
    dlg.get_by_placeholder("Ex.: Rachão das quartas", exact=True).fill(NOME_GRUPO_2)
    dlg.get_by_placeholder("Ex.: Rachão das quartas no Parque...", exact=True).fill(
        "Smoke test E2E",
    )

    dlg.get_by_role("radio", name="Society").click()
    dlg.get_by_role("radio", name="Intermediário").click()

    dlg.get_by_role("button", name="Criar grupo").click()

    # **/grupos/** casa com /grupos/novo; esperamos sair da rota "novo".
    # A app pode ir para /grupos (lista) ou /grupos/[id].
    page.wait_for_function(
        "() => !location.pathname.endsWith('/grupos/novo')",
        timeout=15000,
    )
    path = urlparse(page.url).path.rstrip("/")
    if path == "/grupos":
        page.get_by_text(NOME_GRUPO_2).first.click()
        page.wait_for_url(_GRUPO_DETALHE_URL_RE, timeout=15000)

    expect(page.get_by_text(NOME_GRUPO_2).first).to_be_visible()
    ok("04", "Grupo criado; detalhe aberto")


def step_listar_grupos(page: Page) -> None:
    log("05", "Listar /grupos com busca")
    page.goto(f"{WEB_URL}/grupos", wait_until="networkidle")

    expect(page.get_by_text(NOME_GRUPO_INICIAL).first).to_be_visible()
    expect(page.get_by_text(NOME_GRUPO_2).first).to_be_visible()

    # Busca filtra a lista (debounce)
    page.get_by_placeholder("Buscar grupo", exact=False).fill(NOME_GRUPO_2)
    page.wait_for_timeout(600)

    expect(page.get_by_text(NOME_GRUPO_2).first).to_be_visible()
    # Grupo 1 nao deve aparecer na lista principal (pode existir em outro bloco)
    expect(page.locator("main").get_by_text(NOME_GRUPO_INICIAL)).to_have_count(0)
    ok("05", "Busca funcionando")


def step_editar_grupo(page: Page) -> None:
    log("06", "Editar grupo (mudar para Competitivo)")
    # Limpa filtro
    page.get_by_placeholder("Buscar grupo", exact=False).fill("")
    page.wait_for_timeout(400)

    # Abre detalhe do segundo grupo
    page.get_by_text(NOME_GRUPO_2).first.click()
    page.wait_for_url("**/grupos/**", timeout=10000)

    # Vai para edicao via URL (o menu sidebar pode variar)
    grupo_url = page.url.split("?")[0].rstrip("/")
    page.goto(f"{grupo_url}/editar", wait_until="networkidle")

    expect(page.get_by_role("dialog")).to_be_visible()
    page.get_by_role("radio", name="Competitivo").click()
    page.get_by_role("button", name="Salvar alterações").click()

    page.wait_for_url("**/grupos/**", timeout=10000)
    ok("06", "Edicao salva")


def step_adicionar_boleiro(page: Page, page_url: str) -> None:
    log("07", f"Adicionar boleiro '{NOME_BOLEIRO}'")
    # Volta para o detalhe do grupo
    page.goto(page_url, wait_until="networkidle")

    # Deve estar na tab Boleiros (default)
    expect(page.get_by_role("tab", name="Boleiros")).to_have_attribute("data-state", "active")

    # Click no botao "Adicionar boleiro" (desktop) ou FAB (mobile)
    add_btn = page.get_by_role("button", name="Adicionar boleiro")
    if add_btn.count() > 0 and add_btn.first.is_visible():
        add_btn.first.click()
    else:
        # FAB - botao com aria-label
        page.get_by_label("Adicionar boleiro").first.click()

    dlg = page.get_by_role("dialog")
    expect(dlg).to_be_visible()
    # Field nao associa label ao input (sem htmlFor); usamos name/placeholder.
    dlg.locator('input[name="nome"]').fill(NOME_BOLEIRO)
    dlg.locator('input[name="apelido"]').fill(APELIDO_BOLEIRO)
    dlg.get_by_role("radio", name="MEI").click()
    dlg.get_by_placeholder("(11) 9XXXX-XXXX", exact=True).fill(CELULAR_BOLEIRO)

    dlg.get_by_role("button", name="Adicionar boleiro").click()

    # Espera o dialog fechar
    expect(page.get_by_role("dialog")).to_have_count(0, timeout=10000)
    expect(page.get_by_text(NOME_BOLEIRO).first).to_be_visible()
    ok("07", "Boleiro adicionado")


def step_ficha_boleiro(page: Page) -> None:
    log("08", "Abrir ficha do boleiro")
    page.get_by_text(NOME_BOLEIRO).first.click()
    expect(page.get_by_role("dialog")).to_be_visible()
    expect(page.get_by_text(NOME_BOLEIRO).first).to_be_visible()
    expect(page.get_by_text("MEI").first).to_be_visible()

    # Fecha o sheet (ESC)
    page.keyboard.press("Escape")
    expect(page.get_by_role("dialog")).to_have_count(0, timeout=5000)
    ok("08", "Ficha aberta e fechada")


def step_criar_partida(page: Page, grupo_url: str) -> str:
    """Cria uma partida via wizard /partidas/nova. Retorna a URL do detalhe."""
    log("09", "Criar partida (wizard 6 steps)")
    grupo_id = grupo_url.rstrip("/").split("/")[-1]
    amanha = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")

    # Pre-popula o store antes da navegacao (precisa estar na mesma origem).
    _seed_wizard_storage(page, grupo_id, amanha, "19:00")

    page.goto(f"{WEB_URL}/partidas/nova?grupoId={grupo_id}", wait_until="networkidle")

    # ---- Step 1 — Dados basicos ----
    # Os valores de data/hora ja estao setados via store; basta avancar.
    expect(page.get_by_role("heading", name="Quando e como vai ser?")).to_be_visible()
    page.get_by_role("button", name="Continuar").click()

    # ---- Step 2 — Local ----
    expect(page.get_by_role("heading", name="Onde vai ser?")).to_be_visible(timeout=5000)
    page.get_by_placeholder("Ex.: Quadra do Boa Esperança").fill(LOCAL_PARTIDA)

    page.get_by_role("button", name="Continuar").click()

    # ---- Step 3 — Boleiros e convidados ----
    expect(page.get_by_role("heading", name="Quem vai jogar?")).to_be_visible()
    # Seleciona todos os boleiros do grupo (so temos 1 do step 07).
    page.get_by_role("button", name="Selecionar todos").click()

    page.get_by_role("button", name="Continuar").click()

    # ---- Step 4 — Regras ----
    expect(page.get_by_role("heading", name="Como vai ser o jogo?")).to_be_visible()
    page.get_by_role("button", name="Continuar").click()

    # ---- Step 5 — Vaquinha (skip, toggle off) ----
    expect(page.get_by_role("heading", name="Vai ter vaquinha?")).to_be_visible()
    page.get_by_role("button", name="Continuar").click()

    # ---- Step 6 — Revisao + criar ----
    expect(page.get_by_role("heading", name="Tudo certo?")).to_be_visible()
    page.get_by_role("button", name="Criar partida e enviar convites").click()

    try:
        page.wait_for_url(_PARTIDA_DETALHE_URL_RE, timeout=20000)
    except Exception as e:
        # Captura o motivo: erro inline ou toast.
        try:
            erro_inline = page.locator(".text-destructive").first.text_content(timeout=1000)
        except Exception:
            erro_inline = None
        try:
            toast = page.locator("[data-sonner-toast]").first.text_content(timeout=1000)
        except Exception:
            toast = None
        log(
            "09",
            f"DEBUG submit falhou: erro={erro_inline!r} toast={toast!r} url={page.url}",
            YELLOW,
        )
        raise e
    detalhe_url = page.url
    ok("09", f"Partida criada: {detalhe_url}")
    return detalhe_url


def step_validar_detalhe_partida(page: Page) -> None:
    log("10", "Validar tela de detalhe da partida")
    # Badge AGENDADA no hero header
    expect(page.get_by_text("AGENDADA").first).to_be_visible(timeout=10000)
    # Local livre digitado deve aparecer
    expect(page.get_by_text(LOCAL_PARTIDA).first).to_be_visible()
    # Secao "Boleiros" tem o nome do boleiro adicionado anteriormente
    expect(page.get_by_text(NOME_BOLEIRO).first).to_be_visible()
    # Action grid: card "Presenças" presente
    expect(page.get_by_text("Presenças").first).to_be_visible()
    ok("10", "Detalhe da partida ok")


def step_validar_presencas(page: Page, partida_url: str) -> None:
    """Bloco 4 - T15: abre /partidas/[id]/presencas e valida o resumo."""
    log("11", "Abrir lista de presenca (T15)")
    page.goto(f"{partida_url.rstrip('/')}/presencas", wait_until="networkidle")
    expect(page.get_by_role("heading", name="Lista de Presença")).to_be_visible(timeout=10000)
    # Pills de resumo
    expect(page.get_by_text("Confirmados").first).to_be_visible()
    expect(page.get_by_text("Pendentes").first).to_be_visible()
    # Tabs
    expect(page.get_by_role("tab", name="Todos")).to_be_visible()
    ok("11", "Tela de presencas ok")


def step_validar_sino(page: Page) -> None:
    """Bloco 4 - T17: clica no sino e valida /notificacoes."""
    log("12", "Abrir centro de notificacoes (T17)")
    page.locator("header.sticky a[aria-label*='otifica']").first.click()
    page.wait_for_url("**/notificacoes", timeout=10000)
    expect(page.get_by_role("heading", name="Notificacoes")).to_be_visible(timeout=10000)
    ok("12", "Centro de notificacoes ok")


def step_logout(page: Page) -> None:
    log("13", "Logout")
    # Ha dois <header>: layout (sticky) com UserMenu e hero do grupo com "Acoes do grupo".
    page.locator("header.sticky").locator("[aria-haspopup='menu']").click()
    page.get_by_role("menuitem", name="Sair").click()

    page.wait_for_url("**/login", timeout=10000)
    ok("13", "Deslogado, em /login")


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------
def run(playwright: Playwright, headless: bool, slowmo: int) -> bool:
    browser: Browser = playwright.chromium.launch(
        headless=headless, slow_mo=slowmo,
    )
    context: BrowserContext = browser.new_context(
        viewport={"width": 1280, "height": 900},
        locale="pt-BR",
        timezone_id="America/Sao_Paulo",
    )
    context.set_default_timeout(15000)
    page: Page = context.new_page()

    success = True
    grupo2_url = ""

    try:
        step_health(page)
        step_signup(page)
        step_onboarding(page)
        step_dashboard(page)
        step_criar_grupo(page)
        grupo2_url = page.url
        step_listar_grupos(page)
        step_editar_grupo(page)
        step_adicionar_boleiro(page, grupo2_url)
        step_ficha_boleiro(page)
        partida_url = step_criar_partida(page, grupo2_url)
        step_validar_detalhe_partida(page)
        step_validar_presencas(page, partida_url)
        step_validar_sino(page)
        step_logout(page)
        print(f"\n{GREEN}=== TODOS OS PASSOS PASSARAM ==={RESET}")
        print(f"User criado: {TEST_EMAIL} / {TEST_PASSWORD}")
        print(f"Grupos criados: {NOME_GRUPO_INICIAL}, {NOME_GRUPO_2}")
    except (PWTimeout, AssertionError, Exception) as e:
        # Identifica o ultimo step que estava em log
        fail(page, "interrompido", e)
        success = False
    finally:
        context.close()
        browser.close()
    return success


def main() -> int:
    parser = argparse.ArgumentParser(description="RachaoApp E2E smoke test")
    parser.add_argument(
        "--headless",
        action="store_true",
        help="roda sem janela (padrao: browser visivel)",
    )
    parser.add_argument("--slowmo", type=int, default=0, help="ms entre acoes (debug)")
    args = parser.parse_args()

    print(f"{CYAN}>> RachaoApp Smoke Test E2E{RESET}")
    print(f"   WEB: {WEB_URL}")
    print(f"   API: {API_URL}")
    print(
        f"   Modo: {'headless' if args.headless else 'headed (visivel)'} | "
        f"slowmo={args.slowmo}ms",
    )
    print()
    t0 = time.time()
    with sync_playwright() as p:
        success = run(p, headless=args.headless, slowmo=args.slowmo)
    print(f"\n>> Tempo total: {time.time() - t0:.1f}s")
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
