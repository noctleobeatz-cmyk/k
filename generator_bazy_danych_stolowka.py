# To NIE jest część działającej aplikacji

Serwer aplikacji to wyłącznie `serwer.py` w głównym folderze projektu.
Sprawdziłem importy — żaden z poniższych plików nie jest przez niego
używany, ani przez żaden plik HTML/JS. To osobne, jednorazowe narzędzia,
które ktoś zostawił w folderze głównym, przez co robiło się bałaganu
i wyglądało, jakby "brakowało czegoś w apce" (a nie brakowało — po
prostu leżały tu martwe pliki).

## Co tu jest i po co kiedyś służyło

- **generator_bazy_danych_stolowka.py + biblioteka_AI.py** — skrypt,
  który (najwyraźniej) posłużył do jednorazowego wygenerowania 173 dań
  w `normy.json` przy pomocy AI (Google Gemini).

- **wymagania.py** — skrypt audytujący, który sprawdza `normy.json`
  pod kątem zgodności z rozporządzeniem MZ. To on wygenerował ten
  raport analityczny, który wcześniej wklejałeś w czacie (0 zup na
  wywarze warzywnym, 0 dań pełnoziarnistych itd.). Można go odpalić
  ręcznie (`python wymagania.py`), jeśli kiedyś zmienisz zawartość
  `normy.json` i zechcesz to ponownie sprawdzić.

- **export_reports.py** — osobna, nigdy niepodłączona aplikacja Flask
  do eksportu raportów do PDF/Excel. Nie ma żadnego routingu łączącego
  ją z `serwer.py` — to niedokończony, samodzielny szkic.

- **baza.py** — model SQLAlchemy pod prawdziwą bazę danych (tabela
  `Posilek`). Aplikacja finalnie korzysta z plików JSON, nie z bazy
  SQL, więc ten plik jest pozostałością po innym podejściu, które
  zostało porzucone.

## ✅ Klucze API — status

`biblioteka_AI.py` **nie ma już** kluczy API wpisanych na stałe w kodzie —
klucz jest wczytywany ze zmiennej środowiskowej `GEMINI_API_KEYS`. Ten plik
jest bezpieczny do wrzucenia do publicznego repozytorium GitHub. Gdybyś
kiedyś ponownie odpalał ten generator, pamiętaj, żeby nadal podawać klucz
przez zmienną środowiskową (`export GEMINI_API_KEYS="klucz1,klucz2"`),
a nie wpisywać go w kodzie.

Ten folder nie jest potrzebny do działania apki — możesz go spokojnie
w ogóle nie wgrywać na serwer produkcyjny.
