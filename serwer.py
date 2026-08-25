from flask import Flask, jsonify, request, send_from_directory
import json
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DANIA_PATH = os.path.join(BASE_DIR, "normy.json")
PRODUKTY_PATH = os.path.join(BASE_DIR, "produkty.json")

DOZWOLONE_TYPY = [
    "sniadanie",
    "drugie_sniadanie",
    "obiad",
]

KLUCZE_WARTOSCI = [

    "kcal", "bialko_g", "tluszcz_g", "weglowodany_g", "blonnik_g", "cukry_g", "sod_mg",
    "witamina_c_mg", "zelazo_mg", "woda_g"

    ]

app = Flask(__name__)

def wczytaj_json(sciezka):
    with open(sciezka, "r", encoding="utf-8") as f:
        return json.load(f)

def zapisz_json(sciezka, dane):
    with open(sciezka, "w", encoding="utf-8") as f:
        json.dump(dane, f, ensure_ascii=False, indent=2)

@app.route("/api/dania", methods=["GET"])
def pobierz_dania():
    try:
        return jsonify(wczytaj_json(DANIA_PATH))
    
    except Exception:
        return jsonify({"blad": "Nie udało się odczytać normy.json"}), 500

@app.route("/api/dania/<int:danie_id>", methods=["GET"])
def pobierz_danie(danie_id):
    try:
        dania = wczytaj_json(DANIA_PATH)
    except Exception:
        return jsonify({"blad": "Nie udało się odczytać normy.json"}), 500

    danie = next((d for d in dania if d["id"] == danie_id), None)
    if not danie:
        return jsonify({"blad": "Nie znaleziono dania"}), 404

    return jsonify(danie)


@app.route("/api/dania", methods=["POST"])
def dodaj_danie():
    body = request.get_json(silent=True) or {}
    nazwa = body.get("nazwa")
    typ_posilku = body.get("typ_posilku")
    skladniki = body.get("skladniki")

    if not nazwa or not isinstance(nazwa, str):
        return jsonify({"blad": "Brak nazwy dania"}), 400
    if typ_posilku not in DOZWOLONE_TYPY:
        return jsonify({"blad": "Nieprawidłowy typ posiłku"}), 400
    if not isinstance(skladniki, list) or len(skladniki) == 0:
        return jsonify({"blad": "Danie musi mieć co najmniej jeden składnik"}), 400

    try:
        dania = wczytaj_json(DANIA_PATH)
        produkty = wczytaj_json(PRODUKTY_PATH)
    except Exception:
        return jsonify({"blad": "Nie udało się wczytać bazy"}), 500

    produkty_po_kodzie = {p["kod_kreskowy"]: p for p in produkty}

    suma = {klucz: 0.0 for klucz in KLUCZE_WARTOSCI}
    suma_gram = 0.0

    for sk in skladniki:
        produkt = produkty_po_kodzie.get(sk.get("kod_kreskowy"))
        if not produkt:
            return jsonify({"blad": f"Nieznany produkt o kodzie {sk.get('kod_kreskowy')}"}), 400

        try:
            gram = float(sk.get("gram"))
        except (TypeError, ValueError):
            gram = 0

        if gram <= 0:
            return jsonify({"blad": f"Nieprawidłowa gramatura dla {produkt['nazwa']}"}), 400

        wspolczynnik = gram / 100
        wo = produkt.get("wartosci_odzywcze_na_100g", {})

        for klucz in KLUCZE_WARTOSCI:
            suma[klucz] += (wo.get(klucz) or 0) * wspolczynnik

        suma_gram += gram

    nastepne_id = max([d["id"] for d in dania], default=0) + 1

    nowe_danie = {
        "id": nastepne_id,
        "nazwa": nazwa,
        "typ_posilku": typ_posilku,
        "skladniki": skladniki,
        "wartosci_odzywcze": {klucz: round(wartosc, 2) for klucz, wartosc in suma.items()},
        "kcal": round(suma["kcal"]),
        "gram": round(suma_gram, 1),
        "ocena_zgodnosci": None,
    }

    dania.append(nowe_danie)

    try:
        zapisz_json(DANIA_PATH, dania)
    except Exception:
        return jsonify({"blad": "Błąd zapisu dania"}), 500

    return jsonify(nowe_danie), 201



@app.route("/api/produkty", methods=["GET"])
def pobierz_produkty():
    try:
        return jsonify(wczytaj_json(PRODUKTY_PATH))
    except Exception:
        return jsonify({"blad": "Nie udało się odczytać produkty.json"}), 500


@app.route("/api/produkty/kod/<kod>", methods=["GET"])
def pobierz_produkt(kod):
    try:
        produkty = wczytaj_json(PRODUKTY_PATH)
    except Exception:
        return jsonify({"blad": "Błąd serwera"}), 500

    produkt = next((p for p in produkty if p["kod_kreskowy"] == kod), None)
    if not produkt:
        return jsonify({"blad": "Nie znaleziono produktu"}), 404

    return jsonify(produkt)


@app.route("/api/produkty/kod/<kod>", methods=["PATCH"])
def aktualizuj_alergeny(kod):
    body = request.get_json(silent=True) or {}
    alergeny = body.get("alergeny")

    if not isinstance(alergeny, list):
        return jsonify({"blad": "Pole alergeny musi być tablicą"}), 400

    try:
        produkty = wczytaj_json(PRODUKTY_PATH)
    except Exception:
        return jsonify({"blad": "Błąd serwera"}), 500

    produkt = next((p for p in produkty if p["kod_kreskowy"] == kod), None)
    if not produkt:
        return jsonify({"blad": "Nie znaleziono produktu"}), 404

    produkt["alergeny"] = alergeny

    try:
        zapisz_json(PRODUKTY_PATH, produkty)
    except Exception:
        return jsonify({"blad": "Błąd zapisu produktu"}), 500

    return jsonify(produkt)



@app.route("/")
@app.route("/<path:sciezka>")
def pliki_statyczne(sciezka="home.html"):
    return send_from_directory(BASE_DIR, sciezka)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 3000))
    print(f"Serwer działa: http://localhost:{port}/home.html")
    app.run(host="0.0.0.0", port=port, debug=True)
