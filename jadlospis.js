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

function renderujStatus() {
    const dni = dniRobocze(state.poniedzialek);
    const zebrane = zbierzObiadyTygodnia(dni);
    const kontener = document.getElementById("jadlospis-status");

    if (zebrane.dniZDanymi === 0) {
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

    kontener.innerHTML = `
    <section class="jadlospis-status-karta">
        <span class="tag ${wszystkoOk ? "ok" : "bad"}">${wszystkoOk ? "✅ zgodny z rozporządzeniem" : "⚠️ wymaga poprawek"}</span>
        <section class="jadlospis-status-znaczniki">
            ${znaczniki.map(function(z) {
                return `<span class="tag ${z[0] ? "ok" : "bad"}">${z[1]}</span>`;
            }).join("")}
        </section>
        <a href="przepisy.html">Zobacz pełne zestawienie zgodności →</a>
    </section>
    `;
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
                <span class="jadlospis-slot-etykieta">${SLOTY_ETYKIETY[slot]}</span>
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
                    <tr><th>Dzień</th><th>Śniadanie</th><th>Drugie śniadanie</th><th>Obiad</th></tr>
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
