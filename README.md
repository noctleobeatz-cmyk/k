# 🍽 Stołówka

Aplikacja webowa do planowania posiłków w stołówce szkolnej: liczenie
zapotrzebowania kalorycznego dla dzieci w różnych grupach wiekowych,
baza dań i produktów z automatyczną oceną zgodności z rozporządzeniem
Ministra Zdrowia (2026), przepisy, dziennik posiłków, raporty i cele
żywieniowe.

Działa w całości **po stronie przeglądarki** — bez własnego serwera i
bez bazy danych — dzięki czemu można ją hostować za darmo, np. na
GitHub Pages.

## Funkcje

- **Jadłospis tygodniowy** — pełny widok posiłków na cały tydzień (pon.-pt.) na jednej stronie, gotowy do wydruku i publikacji dla rodziców i uczniów, z podsumowaniem zgodności z rozporządzeniem i informacją o alergenach w każdym posiłku. To główne narzędzie pracy osoby układającej menu.
- **Dziś** — plan posiłków na dany dzień (śniadanie / drugie śniadanie
  / obiad), zapotrzebowanie kaloryczne wyliczane jako średnia ważona
  dla wszystkich dzieci w placówce, zatwierdzanie dnia.
- **Profil** — dane placówki: nazwa, limit obiadów dziennie, liczba
  dzieci w poszczególnych grupach wiekowych (1–15 lat).
- **Baza dań i produktów** — 173 gotowe dania ze szczegółowymi
  wartościami odżywczymi, alergenami i przepisem krok po kroku.
  Można dodawać własne dania i własne produkty — program sam ocenia
  zgodność nowego dania z rozporządzeniem (udział warzyw/owoców, ryb,
  świeżego mięsa, produktów pełnoziarnistych, energii, makroskładników
  itd.).
- **Zgodność z przepisami** — tygodniowe zestawienie zgodności
  zatwierdzonych obiadów z rozporządzeniem Ministra Zdrowia oraz
  normami żywieniowymi wg grup wiekowych.
- **Raporty** — eksport podsumowania zapisanych posiłków do PDF.
- **Dziennik** — historia zapisanych dni.
- **Moje cele** — możliwość ustawienia własnych, niestandardowych
  celów żywieniowych.

## Jak to działa technicznie

Cała aplikacja to statyczne pliki HTML/CSS/JS. Dane referencyjne
(`normy.json`, `produkty.json`) są wczytywane przez `fetch()`, a dane
wprowadzane przez użytkownika (konfiguracja placówki, zaplanowane
posiłki, własne dania i produkty, dziennik, cele) są trzymane w
**localStorage przeglądarki** — czyli lokalnie, na urządzeniu danej
osoby. Nie ma współdzielonej bazy danych między użytkownikami.

To świadomy wybór architektoniczny pod darmowy hosting statyczny (GitHub
Pages nie potrafi uruchamiać żadnego backendu, np. Pythona/Flaska).

## Uruchomienie lokalnie

Wystarczy dowolny lokalny serwer HTTP (przeglądarki blokują `fetch()`
plików JSON otwartych bezpośrednio z dysku, czyli adres zaczynający się
od `file://` **nie zadziała**):

```bash
cd proj_fixed
python3 -m http.server 8000
```

i wejść na `http://localhost:8000/home.html`.

## Wdrożenie na GitHub Pages (krok po kroku)

1. Utwórz nowe repozytorium na GitHub (np. `stolowka`).
2. Wgraj do niego **całą zawartość folderu `proj_fixed`** (nie sam
   folder — jego zawartość powinna leżeć w głównym katalogu repo, obok
   pliku `index.html`).
3. W repozytorium wejdź w **Settings → Pages**.
4. W sekcji "Build and deployment" wybierz **Source: Deploy from a
   branch**, branch **main**, folder **/ (root)** → **Save**.
5. Po chwili GitHub pokaże link publiczny, zwykle w formacie:
   `https://<twoja-nazwa-użytkownika>.github.io/<nazwa-repo>/`
6. Otwórz ten link — powinna od razu wczytać się strona „Dziś”
   (plik `index.html` w repo automatycznie przekierowuje na
   `home.html`).

Folder `narzedzia-deweloperskie/` nie jest wymagany do działania
strony — możesz go pominąć przy wgrywaniu na GitHub Pages, jeśli
zależy Ci na jak najczystszym repozytorium (patrz też jego własny
`README.md`).

## Struktura projektu

```
proj_fixed/
├── index.html          # punkt wejścia dla GitHub Pages (przekierowuje na home.html)
├── 404.html             # strona błędu 404
├── home.html            # "Dziś" - plan posiłków na dany dzień
├── jadlospis.html        # jadłospis tygodniowy - główny widok pracy nad menu
├── profil.html          # dane placówki i grupy wiekowe
├── baza.html             # baza dań/produktów, dodawanie własnych
├── przepisy.html         # zgodność z rozporządzeniem MZ
├── raporty.html          # raporty / eksport PDF
├── dziennik.html         # historia dni
├── cele.html             # własne cele żywieniowe
├── style.css             # style całej aplikacji
├── script.js              # wspólne funkcje (daty, localStorage, normy wiekowe)
├── *.js                   # logika poszczególnych stron
├── normy.json             # baza 173 dań (składniki, wartości odżywcze, przepisy, ocena zgodności)
├── produkty.json          # baza produktów (wartości odżywcze na 100 g, alergeny)
├── serwer.py              # OPCJONALNY lokalny backend Flask (niewymagany na GitHub Pages)
└── narzedzia-deweloperskie/  # skrypty pomocnicze, niepotrzebne do działania strony
```

## Ograniczenia (ważne, żeby wiedzieć, na co się piszesz)

- **Dane są lokalne dla przeglądarki.** Jeśli kilka osób (np. kilku
  pracowników stołówki) ma korzystać z tej samej, współdzielonej
  konfiguracji i dziennika posiłków, potrzebowaliby wspólnego
  urządzenia/przeglądarki albo trzeba by dobudować prawdziwy backend
  z bazą danych (obecny `serwer.py` to punkt wyjścia do tego, ale
  wymaga hostingu, który uruchamia Pythona — GitHub Pages tego nie
  potrafi).
- Wyczyszczenie danych przeglądarki (albo tryb prywatny) usuwa
  wszystkie zapisane posiłki, dziennik i własne dania.
- Automatycznie generowane przepisy (169 z 173 dań) są tworzone
  algorytmicznie na podstawie składników i nie zostały zweryfikowane
  przez dietetyka/kucharza - traktuj je jako orientacyjne.

## Licencja

MIT - patrz plik `LICENSE`.
