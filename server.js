// server.js — replacement for serwer.py (Node + Express)
// Usage: npm install express cors body-parser

const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');

const BASE_DIR = __dirname;
const DANIA_PATH = path.join(BASE_DIR, 'normy.json');
const PRODUKTY_PATH = path.join(BASE_DIR, 'produkty.json');

const DOZWOLONE_TYPY = ['sniadanie','drugie_sniadanie','obiad'];
const KLUCZE_WARTOSCI = ['kcal','bialko_g','tluszcz_g','weglowodany_g','blonnik_g','cukry_g','sod_mg','witamina_c_mg','zelazo_mg','woda_g'];

function readJson(p) {
  try {
    if (!fs.existsSync(p)) return [];
    const raw = fs.readFileSync(p, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

function writeJson(p, data) {
  fs.writeFileSync(p, JSON.stringify(data, null, 2), 'utf8');
}

const app = express();
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(BASE_DIR));

app.get('/api/dania', (req, res) => {
  try {
    res.json(readJson(DANIA_PATH));
  } catch (e) { res.status(500).json({blad: 'Nie udało się odczytać normy.json'}); }
});

app.get('/api/dania/:danie_id', (req, res) => {
  try {
    const dania = readJson(DANIA_PATH);
    const id = Number(req.params.danie_id);
    const danie = dania.find(d => d.id === id);
    if (!danie) return res.status(404).json({blad: 'Nie znaleziono dania'});
    res.json(danie);
  } catch (e) { res.status(500).json({blad: 'Nie udało się odczytać normy.json'}); }
});

app.post('/api/dania', (req, res) => {
  const body = req.body || {};
  const nazwa = body.nazwa;
  const typ_posilku = body.typ_posilku;
  const skladniki = body.skladniki;

  if (!nazwa || typeof nazwa !== 'string') return res.status(400).json({blad: 'Brak nazwy dania'});
  if (!DOZWOLONE_TYPY.includes(typ_posilku)) return res.status(400).json({blad: 'Nieprawidłowy typ posiłku'});
  if (!Array.isArray(skladniki) || skladniki.length === 0) return res.status(400).json({blad: 'Danie musi mieć co najmniej jeden składnik'});

  try {
    const dania = readJson(DANIA_PATH);
    const produkty = readJson(PRODUKTY_PATH);
    const produkty_po_kodzie = {};
    produkty.forEach(p => { produkty_po_kodzie[p.kod_kreskowy] = p; });

    const suma = {};
    KLUCZE_WARTOSCI.forEach(k => suma[k] = 0.0);
    let suma_gram = 0.0;

    for (const sk of skladniki) {
      const produkt = produkty_po_kodzie[sk.kod_kreskowy];
      if (!produkt) return res.status(400).json({blad: `Nieznany produkt o kodzie ${sk.kod_kreskowy}`});
      const gram = Number(sk.gram);
      if (!gram || gram <= 0) return res.status(400).json({blad: `Nieprawidłowa gramatura dla ${produkt.nazwa}`});
      const wsp = gram / 100.0;
      const wo = produkt.wartosci_odzywcze_na_100g || {};
      KLUCZE_WARTOSCI.forEach(k => { suma[k] += (wo[k] || 0) * wsp; });
      suma_gram += gram;
    }

    const nastepne_id = (dania.length ? Math.max(...dania.map(d=>d.id)) : 0) + 1;
    const nowe_danie = {
      id: nastepne_id,
      nazwa,
      typ_posilku,
      skladniki,
      wartosci_odzywcze: Object.fromEntries(Object.entries(suma).map(([k,v])=>[k, Math.round(v*100)/100])),
      kcal: Math.round(suma.kcal || 0),
      gram: Math.round(suma_gram*10)/10,
      ocena_zgodnosci: null
    };

    dania.push(nowe_danie);
    writeJson(DANIA_PATH, dania);
    res.status(201).json(nowe_danie);
  } catch (e) { res.status(500).json({blad: 'Błąd serwera'}); }
});

app.get('/api/produkty', (req, res) => {
  try { res.json(readJson(PRODUKTY_PATH)); } catch(e){ res.status(500).json({blad:'Nie udało się odczytać produkty.json'}); }
});

app.get('/api/produkty/kod/:kod', (req, res) => {
  try {
    const produkty = readJson(PRODUKTY_PATH);
    const p = produkty.find(x => x.kod_kreskowy == req.params.kod);
    if (!p) return res.status(404).json({blad: 'Nie znaleziono produktu'});
    res.json(p);
  } catch (e) { res.status(500).json({blad:'Błąd serwera'}); }
});

app.patch('/api/produkty/kod/:kod', (req, res) => {
  const alergeny = req.body.alergeny;
  if (!Array.isArray(alergeny)) return res.status(400).json({blad:'Pole alergeny musi być tablicą'});
  try {
    const produkty = readJson(PRODUKTY_PATH);
    const idx = produkty.findIndex(x => x.kod_kreskowy == req.params.kod);
    if (idx === -1) return res.status(404).json({blad:'Nie znaleziono produktu'});
    produkty[idx].alergeny = alergeny;
    writeJson(PRODUKTY_PATH, produkty);
    res.json(produkty[idx]);
  } catch (e) { res.status(500).json({blad:'Błąd zapisu produktu'}); }
});

// fallback to index/static files (already handled by express.static)

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', ()=> console.log(`Server listening on http://localhost:${port}`));
}
