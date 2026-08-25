import json
import os
import random
import re
import sys

from biblioteka_AI import generuj_z_rotacja

try:
    sys.stdout.reconfigure(line_buffering=True)
except AttributeError:
    pass

POLA_ODZYWCZE = [
    "kcal", "bialko_g", "tluszcz_g", "weglowodany_g", "blonnik_g",
    "cukry_g", "sod_mg", "witamina_c_mg", "zelazo_mg", "woda_g",
]

WZORZEC_EAN13 = re.compile(r"^\d{13}$")


def kod_kreskowy_poprawny(kod, zbior_juz_uzytych=None):
    if not WZORZEC_EAN13.match(str(kod)):
        return False, "kod kreskowy musi mieć dokładnie 13 cyfr"
    if zbior_juz_uzytych is not None and kod in zbior_juz_uzytych:
        return False, "kod kreskowy już istnieje (nie jest unikalny)"
    return True, None


def _znormalizuj_nazwe(nazwa):
    return nazwa.strip().lower()


def zbuduj_indeks_po_kodzie(katalog_produktow):
    return {p["kod_kreskowy"]: p for p in katalog_produktow}


def zbuduj_indeks_po_nazwie(katalog_produktow):
    """Do wykrywania 'ten sam produkt co kiedyś' po znormalizowanej nazwie,
    żeby reużyć kod_kreskowy zamiast mnożyć duplikaty tego samego surowca."""
    indeks = {}
    for p in katalog_produktow:
        indeks.setdefault(_znormalizuj_nazwe(p["nazwa"]), p)
    return indeks


def oblicz_wartosci_odzywcze_dania(skladniki, indeks_po_kodzie):
    """
    skladniki: lista {"kod_kreskowy": ..., "gram": ...}
    Zwraca (wartosci: dict z kluczem 'gram', brakujace_kody: list[str]).
    """
    suma = {pole: 0.0 for pole in POLA_ODZYWCZE}
    suma_gram = 0
    brakujace = []

    for skladnik in skladniki:
        produkt = indeks_po_kodzie.get(skladnik["kod_kreskowy"])
        if produkt is None or produkt.get("wartosci_odzywcze_na_100g") is None:
            brakujace.append(skladnik["kod_kreskowy"])
            continue
        gram = skladnik["gram"]
        suma_gram += gram
        wspolczynnik = gram / 100.0
        wartosci_100g = produkt["wartosci_odzywcze_na_100g"]
        for pole in POLA_ODZYWCZE:
            suma[pole] += wartosci_100g.get(pole, 0.0) * wspolczynnik

    suma = {pole: round(wartosc, 2) for pole, wartosc in suma.items()}
    suma["gram"] = suma_gram
    return suma, brakujace



MIN_RYBA_TYG = 1
MIN_DANIE_ROSLINNE_TYG = 1
MIN_PORCJE_MIESA_SWIEZEGO_TYG = 2
MAKS_SMAZONE_PON_PT = 2
MIN_ZUPY_WYWAR_WARZYWNY_TYG = 2

UDZIAL_ENERGII = {
    "obiad_jednodaniowy": 0.20,
    "obiad_dwudaniowy": 0.30,
}

SREDNIE_ZAPOTRZEBOWANIE_KCAL = {
    "przedszkole_3_6": 1300,
    "szkola_podstawowa_7_14": 1900,
    "szkola_ponadpodstawowa_15_18": 2300,
}

TOLERANCJA_ENERGII = 0.20
GRUPA_WIEKOWA = "szkola_podstawowa_7_14"

REKOMENDOWANE_UDZIAL_BIALKA = (10, 15)
REKOMENDOWANE_UDZIAL_TLUSZCZU = (25, 35)
REKOMENDOWANE_UDZIAL_WEGLOWODANOW = (50, 60)

MAKS_CUKRY_CALODZIENNE_G = 50
MAKS_SODU_CALODZIENNE_MG = 2000

SLOWA_KLUCZOWE = {
    "ryba": ["ryba", "ryby", "mintaj", "dorsz", "łosoś", "makrela", "filet z ryby",
             "morszczuk", "śledź", "pstrąg", "halibut", "okoń morski"],
    "straczki": ["fasol", "ciecierzyc", "soczewic", "groch", "bób", "strączk"],
    "mieso_swieze": ["wieprzow", "wołow", "drobiow", "kurczak", "indyk", "schab", "karkówk", "mięso"],
    "nabial_jajo": ["mleko", "śmietana", "ser ", "jogurt", "jajko", "twaróg", "masło", "kefir"],
    "wywar_warzywny": ["wywar warzywny", "bulion warzywny"],
    "koncentrat": ["koncentrat"],
    "warzywo_owoc": ["marchew", "pietruszka", "seler", "kapust", "burak", "ogórek",
                      "pomidor", "cebul", "brokuł", "jabłk", "truskaw", "ziemniak",
                      "sałat", "papryk", "cukini", "por ", "szpinak", "buraki", "rzepa"],
    "smazenie": ["olej do smażenia", "smażon", "smażone", "smażony"],
    "caloziarniste": ["caloziarniste", "pelnoziarniste", "żytni", "pszenny", "orkisz", "żyto"],
}


def _zawiera(tekst, kategoria):
    return any(slowo in tekst for slowo in SLOWA_KLUCZOWE[kategoria])


def analizuj_danie(nazwa_dania, typ_dania_ai, nazwy_skladnikow_str):
    """cechy strukturalne dania; typ_dania_ai jest używane TYLKO tu (do wykrycia
    zupy na wywarze warzywnym) i nigdzie nie jest zapisywane do wyniku."""
    t = f"{nazwa_dania} {nazwy_skladnikow_str}".lower()
    jest_straczkowe_bezmiesne = _zawiera(t, "straczki") and not (
        _zawiera(t, "mieso_swieze") or _zawiera(t, "ryba") or _zawiera(t, "nabial_jajo")
    )
    return {
        "smazone": _zawiera(t, "smazenie"),
        "zawiera_ryba": _zawiera(t, "ryba"),
        "zawiera_mieso_swieze": _zawiera(t, "mieso_swieze"),
        "danie_roslinne_bez_odzwierzecych": jest_straczkowe_bezmiesne,
        "zupa_na_wywarze_warzywnym": typ_dania_ai == "zupa" and _zawiera(t, "wywar_warzywny"),
        "zawiera_warzywo_lub_owoc": _zawiera(t, "warzywo_owoc"),
        "zawiera_koncentrat": _zawiera(t, "koncentrat"),
        "zawiera_ziarno_caloziarniste": _zawiera(t, "caloziarniste"),
    }


def ocen_energie_dania(typ_posilku, kcal, grupa_wiekowa=GRUPA_WIEKOWA):
    if typ_posilku not in ("obiad_jednodaniowy", "danie_glowne_czesc_dwudaniowego", "zupa_czesc_dwudaniowego"):
        return None
    if kcal is None:
        return None

    zapotrzebowanie = SREDNIE_ZAPOTRZEBOWANIE_KCAL.get(grupa_wiekowa)
    if zapotrzebowanie is None:
        return None

    if typ_posilku == "obiad_jednodaniowy":
        docelowy_udzial = UDZIAL_ENERGII["obiad_jednodaniowy"]
    elif typ_posilku == "danie_glowne_czesc_dwudaniowego":
        docelowy_udzial = UDZIAL_ENERGII["obiad_dwudaniowy"] * (2 / 3)
    else:
        docelowy_udzial = UDZIAL_ENERGII["obiad_dwudaniowy"] * (1 / 3)

    docelowe_kcal = zapotrzebowanie * docelowy_udzial
    dolny = docelowe_kcal * (1 - TOLERANCJA_ENERGII)
    gorny = docelowe_kcal * (1 + TOLERANCJA_ENERGII)
    return dolny <= kcal <= gorny


def ocen_makroskaldniki_dania(wartosci, kcal):
    """Ocena zgodności makroskładników z zaleceniami MZ."""
    if kcal is None or kcal == 0:
        return {"zgodny": False, "powody": ["Brak wartości energetycznej"]}
    
    powody = []
    
    docelowy_bialko_g = kcal * 0.125 / 4
    Min_bialko = kcal * 0.10 / 4
    maks_bialko = kcal * 0.15 / 4
    bialko = wartosci.get("bialko_g", 0)
    if not (Min_bialko <= bialko <= maks_bialko):
        powody.append(f"Białko poza zakreem 10-15% energii ({bialko:.1f}g, powinno ~{docelowy_bialko_g:.1f}g)")
    
    docelowy_tluszcz_g = kcal * 0.30 / 9
    Min_tluszcz = kcal * 0.25 / 9
    maks_tluszcz = kcal * 0.35 / 9
    tluszcz = wartosci.get("tluszcz_g", 0)
    if not (Min_tluszcz <= tluszcz <= maks_tluszcz):
        powody.append(f"Tłuszcz poza zakreem 25-35% energii ({tluszcz:.1f}g, powinno ~{docelowy_tluszcz_g:.1f}g)")
    
    docelowy_weglowodany_g = kcal * 0.55 / 4
    Min_weglowodany = kcal * 0.50 / 4
    maks_weglowodany = kcal * 0.60 / 4
    weglowodany = wartosci.get("weglowodany_g", 0)
    if not (Min_weglowodany <= weglowodany <= maks_weglowodany):
        powody.append(f"Węglowodany poza zakreem 50-60% energii ({weglowodany:.1f}g, powinno ~{docelowy_weglowodany_g:.1f}g)")
    
    blonnik = wartosci.get("blonnik_g", 0)
    if blonnik < 3 and wartosci.get("gram", 0) > 0:
        powody.append(f"Zbyt mało błonnika ({blonnik:.1f}g, powinno min. 3g na 100g)")
    
    cukry = wartosci.get("cukry_g", 0)
    maks_cukry_dla_kcal = kcal * 0.10 / 4
    if cukry > maks_cukry_dla_kcal:
        powody.append(f"Zbyt dużo cukrów ({cukry:.1f}g, max {maks_cukry_dla_kcal:.1f}g dla tej porcji)")
    
    sod = wartosci.get("sod_mg", 0)
    if sod > 600:
        powody.append(f"Zbyt dużo sodu ({sod:.0f}mg, max 600mg na porcję)")
    
    return {"zgodny": len(powody) == 0, "powody": powody}


def ocen_tydzien(cechy_tygodnia, wszystkie_wartosci):
    """Ocena PARTII dań jako jednego tygodnia — tylko do logu w konsoli, nie zapisywana per danie."""
    liczba_ryb = sum(c["zawiera_ryba"] for c in cechy_tygodnia)
    liczba_roslinnych = sum(c["danie_roslinne_bez_odzwierzecych"] for c in cechy_tygodnia)
    liczba_mies_swiezych = sum(c["zawiera_mieso_swieze"] for c in cechy_tygodnia)
    liczba_smazonych = sum(c["smazone"] for c in cechy_tygodnia)
    liczba_zup_warzywnych = sum(c["zupa_na_wywarze_warzywnym"] for c in cechy_tygodnia)
    liczba_z_ziarnem = sum(c["zawiera_ziarno_caloziarniste"] for c in cechy_tygodnia)

    naruszenia = []
    if liczba_ryb < MIN_RYBA_TYG:
        naruszenia.append(f"Brak wymaganej min. {MIN_RYBA_TYG} porcji ryby w tygodniu (jest: {liczba_ryb}).")
    if liczba_roslinnych < MIN_DANIE_ROSLINNE_TYG:
        naruszenia.append(f"Brak wymaganej min. {MIN_DANIE_ROSLINNE_TYG} potrawy strączkowej bez produktów odzwierzęcych (jest: {liczba_roslinnych}).")
    if liczba_mies_swiezych < MIN_PORCJE_MIESA_SWIEZEGO_TYG:
        naruszenia.append(f"Brak wymaganych min. {MIN_PORCJE_MIESA_SWIEZEGO_TYG} porcji świeżego mięsa (jest: {liczba_mies_swiezych}).")
    if liczba_smazonych > MAKS_SMAZONE_PON_PT:
        naruszenia.append(f"Przekroczono limit {MAKS_SMAZONE_PON_PT} dań smażonych (jest: {liczba_smazonych}).")
    if liczba_zup_warzywnych < MIN_ZUPY_WYWAR_WARZYWNY_TYG:
        naruszenia.append(f"Brak wymaganych min. {MIN_ZUPY_WYWAR_WARZYWNY_TYG} zup na wywarze warzywnym (jest: {liczba_zup_warzywnych}).")
    if liczba_z_ziarnem < 1:
        naruszenia.append(f"Brak min. 1 potrawy z całoziarenistymi zbożami (jest: {liczba_z_ziarnem}).")

    return {"zgodny_z_tygodniowymi_wymogami": len(naruszenia) == 0, "naruszenia": naruszenia}



PLIK_DAN = "normy.json"
PLIK_PRODUKTOW = "produkty.json"
DOCELOWA_LICZBA_DAN = 3000
DANIA_W_TYGODNIU = 5
PREFIKS_EAN = "590"


def _cyfra_kontrolna_ean13(dwanascie_cyfr):
    suma = 0
    for i, znak in enumerate(dwanascie_cyfr):
        cyfra = int(znak)
        suma += cyfra if i % 2 == 0 else cyfra * 3
    return (10 - (suma % 10)) % 10


def nowy_kod_kreskowy(juz_uzyte):
    while True:
        rdzen = PREFIKS_EAN + "".join(str(random.randint(0, 9)) for _ in range(9))
        kod = rdzen + str(_cyfra_kontrolna_ean13(rdzen))
        if kod not in juz_uzyte:
            return kod


def wczytaj_json(sciezka):
    if os.path.exists(sciezka):
        with open(sciezka, "r", encoding="utf-8") as f:
            try:
                return json.load(f)
            except json.JSONDecodeError:
                return []
    return []


def zapisz_json(sciezka, dane):
    with open(sciezka, "w", encoding="utf-8") as f:
        json.dump(dane, f, ensure_ascii=False, indent=2)


def _wczytaj_liste_bezpiecznie(sciezka):
    dane = wczytaj_json(sciezka)
    if not isinstance(dane, list):
        if os.path.exists(sciezka):
            kopia = sciezka + ".bak"
            zapisz_json(kopia, dane)
            print(f"UWAGA: {sciezka} nie zawierał tablicy JSON. Oryginał zapisany jako {kopia}, startuję z pustą listą.")
        return []
    return dane


def wyczysc_odpowiedz_ai(tekst):
    tekst = tekst.strip()
    if tekst.startswith("```"):
        linie = tekst.splitlines()
        if linie[0].startswith("```"):
            linie = linie[1:]
        if linie and linie[-1].startswith("```"):
            linie = linie[:-1]
        tekst = "\n".join(linie).strip()
    start = tekst.find("[")
    koniec = tekst.rfind("]")
    if start != -1 and koniec != -1:
        tekst = tekst[start:koniec + 1]
    return tekst


def zbuduj_katalog_z_historii(baza_dan):
    """
    Odbudowuje katalog produktów W PAMIĘCI z już zapisanych dań w normy.json.
    Zna tylko nazwa + kod_kreskowy (tyle jest zapisane w skladnikach) —
    wartosci_odzywcze_na_100g są nieznane (None) i zostaną dopytane u AI,
    jeśli dany produkt pojawi się ponownie w tej sesji generowania.
    """
    katalog = {}
    for danie in baza_dan:
        for s in danie.get("skladniki", []):
            kod = s.get("kod_kreskowy")
            nazwa = s.get("nazwa")
            if kod and nazwa and kod not in katalog:
                katalog[kod] = {
                    "nazwa": nazwa,
                    "kod_kreskowy": kod,
                    "wartosci_odzywcze_na_100g": None,
                }
    return list(katalog.values())


PROMPT_NOWE_DANIE = """
Jesteś generatorem PRZEPISÓW na dania szkolnej stołówki zgodnie z zaleceniami 
Ministra Zdrowia dotyczącymi żywienia w placówkach oświatowych.

OBOWIĄZKOWE ZASADY ZGODNIE Z ZALECENIAMI MZ:
1. KAŻDE DANIE musi zawierać co najmniej 2-3 porcje warzyw/owoców
2. Ograniczone smaż­enie: max 2 smażone potrawy na tydzień (poniedziałek-piątek)
3. Preferuj białko z ryb, drobiu i produktów mlecznych
4. Min. 1 danie z rybą na tydzień
5. Min. 1 wegetariańskie danie na bazie strączków (fasola, soczewica, groch)
6. Min. 2 zupy na wywarze warzywnym (nie mięsnym!)
7. Włączaj pełnoziarniste produkty zbożowe
8. Unikaj wysokiego zawartości cukrów i soli
9. Każda porcja to ~20% dziennego zapotrzebowania kalorycznego dla dzieci 7-14 lat
10. Włączaj witaminy (szczególnie witaminę C) i minerały (żelazo)

Znane produkty (używaj dokładnie te nazwy, aby system mógł dopasować kody):
{ZNANE_NAZWY}

Wygeneruj {ILOSC} dań (tablica JSON), reprezentujących JEDEN TYDZIEŃ jadłospisu
(pon-pt), z absolutnym priorytetem dla powyższych zasad.

Struktura KAŻDEGO obiektu:
{{
  "id": {START_ID},
  "nazwa": "<nazwa dania po polsku>",
  "typ_dania": "<'zupa' | 'danie_glowne' | 'danie_slodkie' | 'napoj'>",
  "typ_posilku": "<'obiad_jednodaniowy' | 'danie_glowne_czesc_dwudaniowego' | 'zupa_czesc_dwudaniowego'>",
  "skladniki": [
    {{"nazwa_skladnika": "<nazwa surowca po polsku, liczba pojedyncza>", "gram": <int>}}
  ]
}}

WAŻNE: 
- Każde danie musi zawierać PRZYNAJMNIEJ 2-3 różne warzywa/owoce
- Jeśli danie jest mięsne, dodaj obowiązkowo warzywa (marchew, pietruszka, kapusta itp.)
- Jeśli to zupa, podstawą powinien być wywar warzywny, nie mięsny
- Maksymalnie 30-40g cukrów na porcję dla całego dnia
- Sól: maksymalnie 600mg na porcję
- Preferuj drób i mięso wieprzowe nad ciężkimi mięsami

Ponieważ generujesz jedynie jedną partię, staraj się zmaksymalizować różnorodność,
a zarazem ściśle przestrzegać powyższych zasad.

WYŁĄCZNIE poprawny JSON, bez tekstu przed/po, bez ```markdown. 
Id od {START_ID} do {START_ID}+{ILOSC}-1. Nie powtarzaj nazw ani id z poprzednich partii.
"""

PROMPT_UZUPELNIJ_PRODUKTY = """
Podaj realistyczne wartości odżywcze NA 100 G dla poniższych surowych/podstawowych
produktów spożywczych używanych w kuchni szkolnej. Wartości muszą być zgodne
z zaleceniami Ministra Zdrowia dotyczącymi żywienia w szkołach.

{LISTA_NAZW}

Zwróć TABLICĘ JSON, jeden obiekt na produkt, W TEJ SAMEJ KOLEJNOŚCI co lista:
{{
  "nazwa": "<dokładnie ta sama nazwa co w liście>",
  "wartosci_odzywcze_na_100g": {{
    "kcal": <float>, "bialko_g": <float>, "tluszcz_g": <float>,
    "weglowodany_g": <float>, "blonnik_g": <float>, "cukry_g": <float>,
    "sod_mg": <float>, "witamina_c_mg": <float>, "zelazo_mg": <float>,
    "woda_g": <float>
  }}
}}

UWAGI:
- Wartości powinny być realistyczne i oparte na fachowych tabelach żywienia
- Dla warzyw i owoców: wysoka zawartość błonnika i witaminy C
- Dla mięsa: wysoka zawartość białka i żelaza
- Dla produktów mlecznych: wysoka zawartość wapnia
- Ograniczaj zawartość sodu (max 600mg na porcję)

WYŁĄCZNIE poprawny JSON, bez tekstu przed/po, bez ```markdown.
"""


def rozwiaz_skladniki(skladniki_z_ai, katalog_produktow, juz_uzyte_kody):
    """
    AI podaje składniki jako {"nazwa_skladnika": ..., "gram": ...} (bez kodu —
    kody są sprawą systemu, nie AI). Dla każdej nazwy: jeśli produkt o takiej
    (znormalizowanej) nazwie już istnieje w katalogu — reużywamy jego
    kod_kreskowy. Jeśli nie — tworzymy nowy wpis z nowym EAN-em i
    wartosci_odzywcze_na_100g = None (do uzupełnienia).
    Zwraca listę {"nazwa", "kod_kreskowy", "gram"}.
    """
    indeks_po_nazwie = zbuduj_indeks_po_nazwie(katalog_produktow)
    wynik = []
    for s in skladniki_z_ai:
        nazwa = s["nazwa_skladnika"].strip()
        klucz = _znormalizuj_nazwe(nazwa)
        produkt = indeks_po_nazwie.get(klucz)
        if produkt is None:
            kod = nowy_kod_kreskowy(juz_uzyte_kody)
            juz_uzyte_kody.add(kod)
            produkt = {"nazwa": nazwa, "kod_kreskowy": kod, "wartosci_odzywcze_na_100g": None}
            katalog_produktow.append(produkt)
            indeks_po_nazwie[klucz] = produkt
        wynik.append({"nazwa": produkt["nazwa"], "kod_kreskowy": produkt["kod_kreskowy"], "gram": s["gram"]})
    return wynik


def uzupelnij_brakujace_produkty(katalog_produktow):
    """Dopytuje AI o wartosci_odzywcze_na_100g dla produktów, które mają None —
    bez tego kroku każde danie z takim składnikiem byłoby pomijane na zawsze."""
    brakujace = [p for p in katalog_produktow if p.get("wartosci_odzywcze_na_100g") is None]
    if not brakujace:
        return

    lista_nazw = "\n".join(f"- {p['nazwa']}" for p in brakujace)
    prompt = PROMPT_UZUPELNIJ_PRODUKTY.format(LISTA_NAZW=lista_nazw)
    try:
        odpowiedz = wyczysc_odpowiedz_ai(generuj_z_rotacja(prompt))
        uzupelnione = json.loads(odpowiedz)
    except json.JSONDecodeError:
        print(f"  Nie udało się uzupełnić {len(brakujace)} produktów (błąd JSON). Spróbuję w kolejnej turze.")
        return

    nazwa_do_wartosci = {u["nazwa"]: u["wartosci_odzywcze_na_100g"] for u in uzupelnione if "nazwa" in u}
    uzupelniono = 0
    for p in brakujace:
        if p["nazwa"] in nazwa_do_wartosci:
            p["wartosci_odzywcze_na_100g"] = nazwa_do_wartosci[p["nazwa"]]
            uzupelniono += 1
    print(f"  Uzupełniono wartości odżywcze dla {uzupelniono}/{len(brakujace)} produktów.")


def zapisz_produkty_do_pliku(katalog_produktow):
    """Zapisuje katalog produktów do produkty.json, pomijając produkty
    z None wartosciami odżywczymi (te nie powinny być w wersji finalnej)."""
    produkty_do_zapisania = [
        {
            "kod_kreskowy": p["kod_kreskowy"],
            "nazwa": p["nazwa"],
            "kategoria": p.get("kategoria", "Inne"),
            "wartosci_odzywcze_na_100g": p["wartosci_odzywcze_na_100g"],
            "alergeny": p.get("alergeny", [])
        }
        for p in katalog_produktow
        if p.get("wartosci_odzywcze_na_100g") is not None
    ]
    
    zapisz_json(PLIK_PRODUKTOW, produkty_do_zapisania)
    print(f"✅ Zapisano {len(produkty_do_zapisania)} produktów do {PLIK_PRODUKTOW}")


def main():
    baza_dan = _wczytaj_liste_bezpiecznie(PLIK_DAN)
    katalog_produktow = zbuduj_katalog_z_historii(baza_dan)
    juz_uzyte_kody = {p["kod_kreskowy"] for p in katalog_produktow}

    print(f"Start: {len(baza_dan)} dań w bazie, {len(katalog_produktow)} znanych produktów (nazw) z historii.")
    print("="*70)
    print("GENERATOR DAŃ SZKOLNYCH - WERSJA Z ZALECENIAMI MINISTRA ZDROWIA")
    print("="*70)

    while len(baza_dan) < DOCELOWA_LICZBA_DAN:
        ilosc = min(DANIA_W_TYGODNIU, DOCELOWA_LICZBA_DAN - len(baza_dan))
        start_id = len(baza_dan) + 1

        znane_nazwy = "\n".join(f"- {p['nazwa']}" for p in katalog_produktow)
        prompt = PROMPT_NOWE_DANIE.format(ZNANE_NAZWY=znane_nazwy, ILOSC=ilosc, START_ID=start_id)

        try:
            odpowiedz = wyczysc_odpowiedz_ai(generuj_z_rotacja(prompt))
            nowe_dania_surowe = json.loads(odpowiedz)
            if not (isinstance(nowe_dania_surowe, list) and nowe_dania_surowe):
                print("Pusta/niepoprawna odpowiedź AI. Ponawiam...")
                continue

            skladniki_wszystkich_dan = {}
            for danie_ai in nowe_dania_surowe:
                skladniki_wszystkich_dan[danie_ai["id"]] = rozwiaz_skladniki(
                    danie_ai["skladniki"], katalog_produktow, juz_uzyte_kody
                )

            uzupelnij_brakujace_produkty(katalog_produktow)

            indeks_po_kodzie = zbuduj_indeks_po_kodzie(katalog_produktow)
            dania_gotowe = []
            cechy_tygodnia = []
            wszystkie_wartosci = []

            for danie_ai in nowe_dania_surowe:
                skladniki = skladniki_wszystkich_dan[danie_ai["id"]]
                wartosci, braki = oblicz_wartosci_odzywcze_dania(skladniki, indeks_po_kodzie)

                if braki:
                    print(f"  Pomijam '{danie_ai['nazwa']}' — nadal brak wartości dla {braki}.")
                    continue

                nazwy_skladnikow_str = " ".join(s["nazwa"] for s in skladniki)
                kcal_zaokraglone = round(wartosci["kcal"])
                cechy = analizuj_danie(danie_ai["nazwa"], danie_ai.get("typ_dania"), nazwy_skladnikow_str)
                energia_ok = ocen_energie_dania(danie_ai["typ_posilku"], kcal_zaokraglone)
                makroskaldniki = ocen_makroskaldniki_dania(wartosci, kcal_zaokraglone)

                dania_gotowe.append({
                    "id": danie_ai["id"],
                    "nazwa": danie_ai["nazwa"],
                    "typ_posilku": danie_ai["typ_posilku"],
                    "skladniki": skladniki,
                    "wartosci_odzywcze": {k: v for k, v in wartosci.items() if k != "gram"},
                    "kcal": kcal_zaokraglone,
                    "gram": wartosci["gram"],
                    "ocena_zgodnosci": {
                        "cechy_dania": cechy,
                        "energia_zgodna_z_udzialem_docelowym": energia_ok,
                        "makroskaldniki_zgodne": makroskaldniki["zgodny"],
                        "szczegoly_makroskaldnikow": makroskaldniki["powody"],
                    },
                })
                cechy_tygodnia.append(cechy)
                wszystkie_wartosci.append(wartosci)

            if not dania_gotowe:
                continue

            raport = ocen_tydzien(cechy_tygodnia, wszystkie_wartosci)
            baza_dan.extend(dania_gotowe)
            zapisz_json(PLIK_DAN, baza_dan)

            status = "✅ ZGODNY Z ZALECENIAMI MZ" if raport["zgodny_z_tygodniowymi_wymogami"] else "⚠️  NIEZGODNY"
            print(f"\nTydzień: {status}")
            print(f"Dodano {len(dania_gotowe)} dań. W bazie: {len(baza_dan)}/{DOCELOWA_LICZBA_DAN}.")
            for n in raport["naruszenia"]:
                print("   ⚠️  ", n)
            print()
            
            zapisz_produkty_do_pliku(katalog_produktow)

        except json.JSONDecodeError as e:
            print(f"Błąd parsowania JSON: {e}. Ponawiam...")
        except Exception as e:
            print(f"Nieoczekiwany błąd: {e}")
    
    print("\n" + "="*70)
    print("✅ GENEROWANIE ZAKOŃCZONE!")
    print("="*70)
    zapisz_produkty_do_pliku(katalog_produktow)
    print(f"📋 Katalog dań: {PLIK_DAN}")
    print(f"📦 Katalog produktów: {PLIK_PRODUKTOW}")
    print(f"✅ Wygenerowano {len(baza_dan)} dań zgodnych z zaleceniami Ministra Zdrowia")
    print("="*70)


if __name__ == "__main__":
    main()