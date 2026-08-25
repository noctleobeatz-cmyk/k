const PREFIKS_DNIA = "stolowka_posilki_";

function pobierzWszystkieDni() {
    const wynik = [];

    for (let i = 0; i < localStorage.length; i++) {
        const klucz = localStorage.key(i);

        if (!klucz || klucz.indexOf(PREFIKS_DNIA) !== 0) {
            continue;
        }

        const iso = klucz.slice(PREFIKS_DNIA.length);
        let dzien;

        try {
            dzien = JSON.parse(localStorage.getItem(klucz));
        } catch (err) {
            continue;
        }

        wynik.push({iso: iso, dzien: dzien});
    }

    wynik.sort(function(a, b) {
        return b.iso.localeCompare(a.iso);
    });

    return wynik;
}

function podsumujDzien(dzien) {
    const suma = {};

    Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
        suma[klucz] = 0;
    });

    let sumaKcal = 0;
    let liczbaDan = 0;

    SLOTY.forEach(function(slot) {
        (dzien[slot] || []).forEach(function(danie) {
            sumaKcal += danie.kcal || 0;
            liczbaDan += 1;
            const wo = danie.wartosci_odzywcze || {};

            Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
                suma[klucz] += wo[klucz] || 0;
            });
        });
    });

    return {suma: suma, sumaKcal: sumaKcal, liczbaDan: liczbaDan};
}

function formatujDateIso(iso) {
    const d = new Date(iso + "T00:00:00");
    return formatujDate(d);
}

function renderujPodsumowanie(wpisy) {
    const kontener = document.getElementById("podsumowanie-raportow");

    if (wpisy.length === 0) {
        kontener.innerHTML = "";
        return;
    }

    const zatwierdzoneDni = wpisy.filter(function(w) {
        return w.dzien.zatwierdzony;
    });

    const sredniaKcal = Math.round(
        wpisy.reduce(function(s, w) {
            return s + podsumujDzien(w.dzien).sumaKcal;
        }, 0) / wpisy.length
    );

    kontener.innerHTML = `
    <section class="karta-podsumowania">
        <b>${wpisy.length}</b>
        <span>dni z zapisanymi posiłkami</span>
    </section>

    <section class="karta-podsumowania">
        <b>${zatwierdzoneDni.length}</b>
        <span>dni zatwierdzonych</span>
    </section>

    <section class="karta-podsumowania">
        <b>${sredniaKcal} kcal</b>
        <span>średnio dziennie</span>
    </section>
    `;
}

function renderujListeRaportow(wpisy) {
    const kontener = document.getElementById("lista-raportow");

    if (wpisy.length === 0) {
        kontener.innerHTML = "<p>Brak zapisanych dni w wybranym zakresie</p>";
        return;
    }

    kontener.innerHTML = wpisy.map(function(wpis) {
        const podsumowanie = podsumujDzien(wpis.dzien);
        let status;

        if (wpis.dzien.zatwierdzony) {
            status = `<span class="tag ok">✅ zatwierdzony</span>`;
        } else {
            status = `<span class="tag bad">⏳ niezatwierdzony</span>`;
        }

        const wierszeMakro = Object.entries(MAPA_PIERSCIENI).map(function(para) {
            const klucz = para[1];
            const etykieta = ETYKIETY_WARTOSCI_ODZYWCZYCH[klucz];
            const jednostka = JEDNOSTKI_WARTOSCI_ODZYWCZYCH[klucz];
            return `<span class="makro-pozycja"><b>${etykieta}</b> ${podsumowanie.suma[klucz].toFixed(1)}${jednostka}</span>`;
        }).join("");

        return `
        <article class="karta-raportu">
            <section class="naglowek-karty-raportu">
                <h3>${formatujDateIso(wpis.iso)}</h3>
                ${status}
            </section>

            <p class="kcal-raportu">${Math.round(podsumowanie.sumaKcal)} kcal | ${podsumowanie.liczbaDan} dań</p>

            <section class="makro-raportu">${wierszeMakro}</section>
        </article>
        `;
    }).join("");
}

function odswiezRaporty() {
    const zakres = Number(document.getElementById("zakres-dni").value);
    const wszystkie = pobierzWszystkieDni();
    const wybrane = wszystkie.slice(0, zakres);

    document.getElementById("opis-raportow").textContent =
        "Podsumowanie zapisanych posiłków na podstawie danych zapisanych w tej przeglądarce.";

    renderujPodsumowanie(wybrane);
    renderujListeRaportow(wybrane);
}

function eksportujRaportDoPdf() {
    const opis = document.getElementById("opis-raportow").textContent;
    const zakresTekst = document.getElementById("zakres-dni").selectedOptions[0].textContent;
    const podsumowanie = document.getElementById("podsumowanie-raportow").innerHTML;
    const listaRaportow = document.getElementById("lista-raportow").innerHTML;

    const zawartosc = `
    <html>
        <head>
            <title>Raport Stołówka</title>
            <style>
                body { font-family: Arial, sans-serif; color: #111; margin: 24px; }
                h1, h2, h3 { margin: 0 0 12px 0; }
                p { margin: 0 0 10px 0; }
                .karta-podsumowania, .karta-raportu { border: 1px solid #ddd; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
                .karta-podsumowania b { display: block; font-size: 20px; margin-bottom: 6px; }
                .naglowek-karty-raportu { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 8px; }
                .tag { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 0.9em; }
                .tag.ok { background: #d8f5d7; color: #1e662d; }
                .tag.bad { background: #fee2e2; color: #7a1c1c; }
                .makro-pozycja { display: block; margin-top: 6px; font-size: 0.95em; }
                .kcal-raportu { font-weight: 700; margin-top: 4px; }
                .lista-raportow { display: grid; gap: 12px; }
            </style>
        </head>
        <body>
            <h1>Raport Stołówka</h1>
            <p>${opis}</p>
            <p><strong>Zakres:</strong> ${zakresTekst}</p>
            <section>${podsumowanie}</section>
            <section class="lista-raportow">${listaRaportow}</section>
        </body>
    </html>
    `;

    const okno = window.open("", "_blank");

    if (!okno) {
        alert("Nie udało się otworzyć okna eksportu PDF. Zezwól na wyskakujące okienka dla tej strony.");
        return;
    }

    okno.document.write(zawartosc);
    okno.document.close();
    okno.focus();

    function uruchomDrukowanie() {
        try {
            okno.print();
        } catch (err) {
            console.error("Drukowanie PDF nie powiodło się:", err);
        }
    }

    if (okno.document.readyState === "complete") {
        uruchomDrukowanie();
    } else {
        okno.onload = uruchomDrukowanie;
    }
}

const zakresElement = document.getElementById("zakres-dni");
const eksportujElement = document.getElementById("eksportuj-pdf");

if (zakresElement) {
    zakresElement.addEventListener("change", odswiezRaporty);
} else {
    console.error("Element #zakres-dni nie znaleziony");
}

if (eksportujElement) {
    eksportujElement.addEventListener("click", eksportujRaportDoPdf);
} else {
    console.error("Element #eksportuj-pdf nie znaleziony");
}

if (zakresElement) {
    odswiezRaporty();
}

