const state = {
    poniedzialek: poniedzialekTygodnia(new Date()),
    produktyPoKodzie: new Map()
};

async function wczytajProdukty() {
    let produktyBazowe = [];

    try {
        const res = await fetch("produkty.json");
        produktyBazowe = await res.json();
    } catch (err) {
        produktyBazowe = [];
    }

    const zapis = localStorage.getItem(KLUCZ_PRODUKTY_WLASNE);
    let produktyWlasne = [];

    if (zapis) {
        try {
            produktyWlasne = JSON.parse(zapis);
        } catch (err) {
            produktyWlasne = [];
        }
    }

    const wszystkie = produktyBazowe.concat(produktyWlasne);
    state.produktyPoKodzie = new Map(wszystkie.map(function(p) { return [p.kod_kreskowy, p]; }));
}

function alergenyDania(danie) {
    const alergeny = new Set();

    (danie.skladniki || []).forEach(function(sk) {
        const produkt = state.produktyPoKodzie.get(sk.kod_kreskowy);

        (produkt && produkt.alergeny || []).forEach(function(a) {
            alergeny.add(a);
        });
    });

    return Array.from(alergeny);
}

function nazwyDan(lista) {
    if (!lista || lista.length === 0) {
        return null;
    }

    return lista.map(function(d) { return d.nazwa; }).join(", ");
}

function kcalSlotu(lista) {
    return (lista || []).reduce(function(s, d) { return s + (d.kcal || 0); }, 0);
}

function odswiezZakres() {
    const piatek = new Date(state.poniedzialek);
    piatek.setDate(piatek.getDate() + 4);

    document.getElementById("jadlospis-zakres").textContent =
        `${formatujDataZapisu(fmtData(state.poniedzialek))} \u2013 ${formatujDataZapisu(fmtData(piatek))}`;
}

// --- nowa walidacja kalorii ---
function obliczKcalZeSkladnikow(skladniki) {
    let suma = 0;
    if (!Array.isArray(skladniki)) return {kcal: 0, brak: []};

    const brak = new Set();

    skladniki.forEach(function(sk) {
        const kod = sk.kod_kreskowy || sk.kod || sk.kodKreskowy || null;
        const gram = Number(sk.gram || sk.ilosc || 0);

        if (!kod || !state.produktyPoKodzie.has(kod) || !gram) {
            if (!kod) return; // pomijamy jeśli brak kodu
            brak.add(kod);
            return;
        }

        const produkt = state.produktyPoKodzie.get(kod);
        const wo = produkt && produkt.wartosci_odzywcze_na_100g;
        if (!wo || typeof wo.kcal !== 'number') {
            brak.add(kod);
            return;
        }

        suma += wo.kcal * (gram / 100);
    });

    return {kcal: Math.round(suma), brak: Array.from(brak)};
}

function sprawdzKalorieTygodnia() {
    const dni = dniRobocze(state.poniedzialek);
    const mismatches = [];
    const missingProdukty = new Set();

    dni.forEach(function(data) {
        const iso = fmtData(data);
        const dzien = wczytajDzienZKlucza(data) || pustyDzien();

        SLOTY.forEach(function(slot) {
            const lista = dzien[slot] || [];

            lista.forEach(function(danie) {
                const wynik = obliczKcalZeSkladnikow(danie.skladniki || []);
                if (wynik.brak && wynik.brak.length) {
                    wynik.brak.forEach(k => missingProdukty.add(k));
                }

                const expected = wynik.kcal || 0;
                const recorded = Number(danie.kcal || 0);
                const diff = Math.abs(expected - recorded);

                // tolerancja 5 kcal lub 5% whichever bigger
                const tol = Math.max(5, Math.round(Math.max(expected * 0.05, 0)));

                if (diff > tol) {
                    mismatches.push({data: iso, slot: slot, nazwa: danie.nazwa, recorded: recorded, expected: expected, diff: diff});
                }
            });
        });
    });

    return {mismatches: mismatches, missing: Array.from(missingProdukty)};
}

function pokazSzczegolyKalorii() {
    const raport = sprawdzKalorieTygodnia();
    const okno = window.open("", "_blank", "noopener");
    if (!okno) { alert('Zezwól na wyskakujące okna, aby zobaczyć szczegóły.'); return; }

    let html = `<html><head><title>Raport kalorii</title><meta charset="utf-8"><style>body{font-family:Arial} table{border-collapse:collapse} th,td{border:1px solid #ccc;padding:6px}</style></head><body>`;

    html += `<h1>Raport walidacji kalorii</h1>`;

    if (raport.missing.length) {
        html += `<h2>Brakujące dane produktów (${raport.missing.length})</h2><ul>`;
        raport.missing.forEach(function(kod){
            const p = state.produktyPoKodzie.get(kod);
            html += `<li>${kod} ${p ? '- ' + p.nazwa : ''}</li>`;
        });
        html += `</ul>`;
    }

    if (raport.mismatches.length) {
        html += `<h2>Rozbieżności kcal (${raport.mismatches.length})</h2>`;
        html += `<table><thead><tr><th>Data</th><th>Slot</th><th>Danie</th><th>Zapisane kcal</th><th>Obliczone kcal</th><th>Różnica</th></tr></thead><tbody>`;
        raport.mismatches.forEach(function(m){
            html += `<tr><td>${m.data}</td><td>${SLOTY_ETYKIETY[m.slot] || m.slot}</td><td>${m.nazwa}</td><td>${m.recorded}</td><td>${m.expected}</td><td>${m.diff}</td></tr>`;
        });
        html += `</tbody></table>`;
    }

    if (!raport.missing.length && !raport.mismatches.length) {
        html += `<p>Brak problemów z danymi kalorii w tym tygodniu.</p>`;
    }

    html += `<p><button onclick="window.print();">Drukuj</button></p>`;
    html += `</body></html>`;

    okno.document.write(html);
    okno.document.close();
}

// --- koniec walidacji kalorii ---

function renderujStatus() {
    const dni = dniRobocze(state.poniedzialek);
    const zebrane = zbierzObiadyTygodnia(dni);
    const kontener = document.getElementById("jadlospis-status");

    const kalorieRaport = sprawdzKalorieTygodnia();

    if (zebrane.dniZDanymi === 0 && kalorieRaport.mismatches.length === 0 && kalorieRaport.missing.length === 0) {
        kontener.innerHTML = `
        <section class="jadlospis-status-karta">
            <span class="tag">brak zatwierdzonych obiadów w tym tygodniu</span>
            <p>Dodaj i zatwierdź posiłki, aby zobaczyć tu zgodność z rozporządzeniem Ministra Zdrowia.</p>
        </section>
        `;
        return;
    }

    const liczMieso = zebrane.dania.filter(function(d) { return cechaDania(d, "zawiera_mieso_swieze"); }).length;
    const liczZupaWywar = zebrane.dania.filter(function(d) { return cechaDania(d, "zupa_na_wywarze_warzywnym"); }).length;
    const liczRoslinne = zebrane.dania.filter(function(d) { return cechaDania(d, "danie_roslinne_bez_odzwierzecych"); }).length;

    const spelnioneMieso = liczMieso <= 2;
    const spelnioneZupa = liczZupaWywar >= 2;
    const spelnioneRoslinne = liczRoslinne >= 1;
    const spelnioneWarzywo = zebrane.dniZWarzywem >= zebrane.dniZDanymi;

    const wszystkoOk = spelnioneMieso && spelnioneZupa && spelnioneRoslinne && spelnioneWarzywo;

    const znaczniki = [
        [spelnioneMieso, `Mięso świeże: ${liczMieso}/maks. 2`],
        [spelnioneZupa, `Zupy na wywarze warzywnym: ${liczZupaWywar}/min. 2`],
        [spelnioneRoslinne, `Danie roślinne: ${liczRoslinne}/min. 1`],
        [spelnioneWarzywo, `Warzywo/owoc: ${zebrane.dniZWarzywem}/${zebrane.dniZDanymi} dni`]
    ];

    let dodatkowe = "";
    if (kalorieRaport.missing.length || kalorieRaport.mismatches.length) {
        dodatkowe = `<p class="uwaga">Błędy danych: ${kalorieRaport.missing.length} brakujących produktów, ${kalorieRaport.mismatches.length} rozbieżności kcal. <button id=\"pokaz-kalorie\">Pokaż szczegóły</button></p>`;
    }

    kontener.innerHTML = `
    <section class="jadlospis-status-karta">
        <span class="tag ${wszystkoOk ? "ok" : "bad"}">${wszystkoOk ? "✅ zgodny z rozporządzeniem" : "⚠️ wymaga poprawek"}</span>
        <section class="jadlospis-status-znaczniki">
            ${znaczniki.map(function(z) {
                return `<span class="tag ${z[0] ? "ok" : "bad"}">${z[1]}</span>`;
            }).join("")}
        </section>
        ${dodatkowe}
        <a href="przepisy.html">Zobacz pełne zestawienie zgodności →</a>
    </section>
    `;

    if (kalorieRaport.missing.length || kalorieRaport.mismatches.length) {
        document.getElementById('pokaz-kalorie').addEventListener('click', pokazSzczegolyKalorii);
    }
}

function renderujSiatke() {
    const dni = dniRobocze(state.poniedzialek);
    const kontener = document.getElementById("jadlospis-siatka");

    kontener.innerHTML = dni.map(function(data) {
        const iso = fmtData(data);
        const dzien = wczytajDzienZKlucza(data) || pustyDzien();
        const nazwaDnia = DNI_TYG[data.getDay()];

        const wierszeSlotow = SLOTY.map(function(slot) {
            const lista = dzien[slot] || [];
            const nazwy = nazwyDan(lista);
            const alergenyZestaw = new Set();

            lista.forEach(function(d) {
                alergenyDania(d).forEach(function(a) { alergenyZestaw.add(a); });
            });

            const kcal = kcalSlotu(lista);
            const daneUrl = `baza.html?slot=${slot}&data=${iso}`;

            return `
            <section class="jadlospis-slot">
                <span class="jadlospis-slot-etykieta">${SLOTY_ETYKIETY[slot] || slot}</span>
                ${nazwy ? `
                    <p class="jadlospis-slot-danie">${nazwy}${kcal ? ` <span class="jadlospis-slot-kcal">${Math.round(kcal)} kcal</span>` : ""}</p>
                    ${alergenyZestaw.size ? `<p class="jadlospis-alergeny">Alergeny: ${Array.from(alergenyZestaw).map(etykietaAlergenu).join(", ")}</p>` : ""}
                ` : `<a class="jadlospis-dodaj" href="${daneUrl}">+ dodaj</a>`}
            </section>
            `;
        }).join("");

        const statusZnacznik = dzien.zatwierdzony
            ? `<span class="tag ok">zatwierdzony</span>`
            : `<span class="tag bad">niezatwierdzony</span>`;

        return `
        <article class="jadlospis-dzien">
            <header class="jadlospis-dzien-naglowek">
                <h2>${nazwaDnia}<span>${formatujDataZapisu(iso)}</span></h2>
                ${statusZnacznik}
            </header>
            ${wierszeSlotow}
            <a class="jadlospis-edytuj" href="home.html?data=${iso}">Edytuj dzień →</a>
        </article>
        `;
    }).join("");
}

function odswiez() {
    odswiezZakres();
    renderujStatus();
    renderujSiatke();
}

function eksportujJadlospis() {
    const dni = dniRobocze(state.poniedzialek);
    const zapisConfig = localStorage.getItem(KLUCZ_CONFIG);
    const placowka = zapisConfig ? (JSON.parse(zapisConfig).placowka || "") : "";
    const piatek = new Date(state.poniedzialek);
    piatek.setDate(piatek.getDate() + 4);
    const zakres = `${formatujDataZapisu(fmtData(state.poniedzialek))} \u2013 ${formatujDataZapisu(fmtData(piatek))}`;

    const wiersze = dni.map(function(data) {
        const iso = fmtData(data);
        const dzien = wczytajDzienZKlucza(data) || pustyDzien();
        const nazwaDnia = DNI_TYG[data.getDay()];

        const komorki = SLOTY.map(function(slot) {
            const lista = dzien[slot] || [];
            const nazwy = nazwyDan(lista) || "-";
            const alergenyZestaw = new Set();

            lista.forEach(function(d) {
                alergenyDania(d).forEach(function(a) { alergenyZestaw.add(a); });
            });

            const alergenyTekst = alergenyZestaw.size
                ? `<div class="alergeny-pdf">Alergeny: ${Array.from(alergenyZestaw).map(etykietaAlergenu).join(", ")}</div>`
                : "";

            return `<td>${nazwy}${alergenyTekst}</td>`;
        }).join("");

        return `<tr><td><b>${nazwaDnia}</b><br>${formatujDataZapisu(iso)}</td>${komorki}</tr>`;
    }).join("");

    const zawartosc = `
    <html>
        <head>
            <title>Jadłospis tygodniowy</title>
            <style>
                body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
                h1 { margin: 0 0 4px 0; }
                p { margin: 0 0 16px 0; color: #444; }
                table { width: 100%; border-collapse: collapse; }
                th, td { border: 1px solid #ccc; padding: 10px; text-align: left; vertical-align: top; font-size: 14px; }
                th { background: #f2f2f2; }
                .alergeny-pdf { font-size: 11px; color: #a33; margin-top: 4px; }
            </style>
        </head>
        <body>
            <h1>Jadłospis tygodniowy${placowka ? " - " + placowka : ""}</h1>
            <p>${zakres}</p>
            <table>
                <thead>
                    <tr><th>Dzień</th>${SLOTY.map(s => `<th>${SLOTY_ETYKIETY[s] || s}</th>`).join("")}</tr>
                </thead>
                <tbody>${wiersze}</tbody>
            </table>
        </body>
    </html>
    `;

    const okno = window.open("", "_blank");

    if (!okno) {
        alert("Nie udało się otworzyć okna eksportu. Zezwól na wyskakujące okienka dla tej strony.");
        return;
    }

    okno.document.write(zawartosc);
    okno.document.close();
    okno.focus();

    function uruchomDrukowanie() {
        try {
            okno.print();
        } catch (err) {
            console.error("Drukowanie nie powiodło się:", err);
        }
    }

    if (okno.document.readyState === "complete") {
        uruchomDrukowanie();
    } else {
        okno.onload = uruchomDrukowanie;
    }
}

// nawigacja tygodniowa
document.getElementById("tydzien-poprzedni").addEventListener("click", function() {
    state.poniedzialek.setDate(state.poniedzialek.getDate() - 7);
    odswiez();
});

document.getElementById("tydzien-nastepny").addEventListener("click", function() {
    state.poniedzialek.setDate(state.poniedzialek.getDate() + 7);
    odswiez();
});

document.getElementById("drukuj-jadlospis").addEventListener("click", eksportujJadlospis);

wczytajProdukty().then(odswiez);
