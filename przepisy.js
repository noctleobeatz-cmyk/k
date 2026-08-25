function obliczSredniaKcalBracketu(bracket) {
    const grupyBracketu = GRUPY_WIEKOWE.filter(function(grupa) {
        return kluczBracketuDlaWieku(Number(grupa.id)) === bracket;
    });

    const suma = grupyBracketu.reduce(function(s, grupa) {
        return s + grupa.kcal;
    }, 0);

    return Math.round(suma / grupyBracketu.length);
}

function renderujTabeleNorm() {
    const bracketId = Object.keys(NORMY_SKLADNIKOW);
    const nagłowki = document.getElementById("naglowki-tabeli-norm");

    nagłowki.innerHTML = `
    <span class="komorka-naglowek">Grupa wiekowa</span>
    <span class="komorka-naglowek">kcal</span>
    ${Object.values(MAPA_PIERSCIENI).map(function(klucz) {
        return `<span class="komorka-naglowek">${ETYKIETY_SKLADNIKOW_PRZEPISY[klucz]}</span>`;
    }).join("")}
    `;

    const wiersze = document.getElementById("wiersze-tabeli-norm");

    wiersze.innerHTML = bracketId.map(function(bracket) {
        const normy = NORMY_SKLADNIKOW[bracket];
        const kcal = obliczSredniaKcalBracketu(bracket);

        return `
        <section class="wiersz-tabeli-norm">
            <span class="komorka-tabeli">${bracket} lat</span>
            <span class="komorka-tabeli">${kcal}</span>
            ${Object.values(MAPA_PIERSCIENI).map(function(klucz) {
                return `<span class="komorka-tabeli">${normy[klucz]}</span>`;
            }).join("")}
        </section>
        `;
    }).join("");
}

const ETYKIETY_SKLADNIKOW_PRZEPISY = ETYKIETY_WARTOSCI_ODZYWCZYCH;

function renderujZgodnoscRozporzadzenie() {
    const poniedzialek = poniedzialekTygodnia(new Date());
    const piatek = new Date(poniedzialek);
    piatek.setDate(piatek.getDate() + 4);

    document.getElementById("zr-zakres-tygodnia").textContent =
        `tydzień ${formatujDataZapisu(fmtData(poniedzialek))}\u2013${formatujDataZapisu(fmtData(piatek))}`;

    const dni = dniRobocze(poniedzialek);
    const zebrane = zbierzObiadyTygodnia(dni);
    const kontenerReguly = document.getElementById("zr-lista-regul");
    const statusOgolny = document.getElementById("zr-status-ogolny");

    if (zebrane.dniZDanymi === 0) {
        kontenerReguly.innerHTML = `<p class="zr-brak-danych">Brak zatwierdzonych obiadów w tym tygodniu &ndash; dodaj i zatwierdź posiłki na stronie „Dziś", aby sprawdzić zgodność z rozporządzeniem.</p>`;
        statusOgolny.className = "tag";
        statusOgolny.textContent = "brak danych";
        return;
    }

    const liczMieso = zebrane.dania.filter(function(d) { return cechaDania(d, "zawiera_mieso_swieze"); }).length;
    const liczZupaWywar = zebrane.dania.filter(function(d) { return cechaDania(d, "zupa_na_wywarze_warzywnym"); }).length;
    const liczRoslinne = zebrane.dania.filter(function(d) { return cechaDania(d, "danie_roslinne_bez_odzwierzecych"); }).length;
    const liczEnergiaOk = zebrane.dania.filter(function(d) {
        return d.ocena_zgodnosci && d.ocena_zgodnosci.energia_zgodna_z_udzialem_docelowym;
    }).length;

    const reguly = [
        {
            tytul: "Dania z mięsa świeżego",
            opis: "Rozporządzenie ogranicza dania mięsne w obiedzie do maksymalnie 2 razy w tygodniu.",
            wartosc: liczMieso,
            cel: 2,
            typ: "max"
        },
        {
            tytul: "Zupy na wywarze warzywnym",
            opis: "Zupy powinny być przygotowywane na wywarze warzywnym co najmniej 2 razy w tygodniu.",
            wartosc: liczZupaWywar,
            cel: 2,
            typ: "min"
        },
        {
            tytul: "Danie roślinne na bazie strączków",
            opis: "Co najmniej raz w tygodniu obiad musi zawierać danie w pełni roślinne, bez produktów odzwierzęcych.",
            wartosc: liczRoslinne,
            cel: 1,
            typ: "min"
        },
        {
            tytul: "Warzywo lub owoc w obiedzie",
            opis: "Warzywo lub owoc powinno być składnikiem obiadu każdego zarejestrowanego dnia.",
            wartosc: zebrane.dniZWarzywem,
            cel: zebrane.dniZDanymi,
            typ: "min"
        },
        {
            tytul: "Energia zgodna z docelowym udziałem",
            opis: "Obiad jednodaniowy powinien pokrywać 20%, a dwudaniowy 30% dziennego zapotrzebowania energetycznego.",
            wartosc: liczEnergiaOk,
            cel: zebrane.dania.length,
            typ: "min"
        }
    ];

    let wszystkoOk = true;

    kontenerReguly.innerHTML = reguly.map(function(regula) {
        let spelniona;

        if (regula.typ === "max") {
            spelniona = regula.wartosc <= regula.cel;
        } else {
            spelniona = regula.wartosc >= regula.cel;
        }

        if (!spelniona) {
            wszystkoOk = false;
        }

        let procent;

        if (regula.cel > 0) {
            procent = Math.min(100, Math.round((regula.wartosc / regula.cel) * 100));
        } else if (regula.wartosc > 0) {
            procent = 100;
        } else {
            procent = 0;
        }

        let licznik;

        if (regula.typ === "max") {
            licznik = `${regula.wartosc} / maks. ${regula.cel}`;
        } else {
            licznik = `${regula.wartosc} / min. ${regula.cel}`;
        }

        let klasaSpelniona;
        let tekstSpelniona;

        if (spelniona) {
            klasaSpelniona = "ok";
            tekstSpelniona = "spełnione";
        } else {
            klasaSpelniona = "bad";
            tekstSpelniona = "sprawdź";
        }

        return `
        <section class="zr-regula ${klasaSpelniona}">
            <section class="zr-regula-naglowek">
                <span class="zr-regula-tytul">${regula.tytul}</span>
                <span class="tag ${klasaSpelniona}">${tekstSpelniona}</span>
            </section>
            <p class="zr-regula-opis">${regula.opis}</p>
            <section class="zr-pasek"><span style="width:${procent}%"></span></section>
            <p class="zr-regula-wartosc">${licznik}</p>
        </section>
        `;
    }).join("");

    if (wszystkoOk) {
        statusOgolny.className = "tag ok";
        statusOgolny.textContent = "zgodny z rozporządzeniem";
    } else {
        statusOgolny.className = "tag bad";
        statusOgolny.textContent = "wymaga poprawek";
    }
}

function podsumujDzienPrzepisy(dzien) {
    const suma = {};

    Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
        suma[klucz] = 0;
    });

    let sumaKcal = 0;

    SLOTY.forEach(function(slot) {
        (dzien[slot] || []).forEach(function(danie) {
            sumaKcal += danie.kcal || 0;
            const wo = danie.wartosci_odzywcze || {};

            Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
                suma[klucz] += wo[klucz] || 0;
            });
        });
    });

    return {suma: suma, sumaKcal: sumaKcal};
}

function renderujSprawdzenieDzisiaj() {
    const kontener = document.getElementById("wynik-sprawdzenia-dzisiaj");
    const zapisConfig = localStorage.getItem(KLUCZ_CONFIG);

    if (!zapisConfig) {
        kontener.innerHTML = "<p>Uzupełnij dane placówki na stronie „Dziś”, aby sprawdzić zgodność z normami</p>";
        return;
    }

    const config = JSON.parse(zapisConfig);
    const kluczDzisiaj = kluczDnia(new Date());
    const zapisDnia = localStorage.getItem(kluczDzisiaj);
    let dzien;

    if (zapisDnia) {
        dzien = JSON.parse(zapisDnia);
    } else {
        dzien = pustyDzien();
    }

    const podsumowanie = podsumujDzienPrzepisy(dzien);
    const normySkladnikow = obliczNormySkladnikow(config.grupy);
    const celKcal = obliczZapotrzebowanie(config.grupy);

    let kcalTag;

    if (celKcal && podsumowanie.sumaKcal <= celKcal * 1.1 && podsumowanie.sumaKcal >= celKcal * 0.9) {
        kcalTag = `<span class="tag ok">✅ zgodne</span>`;
    } else {
        kcalTag = `<span class="tag bad">⚠️ sprawdź</span>`;
    }

    const wierszeSkladnikow = Object.entries(MAPA_PIERSCIENI).map(function(para) {
        const klucz = para[1];
        const wartosc = podsumowanie.suma[klucz];
        const norma = normySkladnikow[klucz] || 0;
        let procent;

        if (norma) {
            procent = Math.round((wartosc / norma) * 100);
        } else {
            procent = 0;
        }

        let klasa;

        if (procent >= 80 && procent <= 120) {
            klasa = "ok";
        } else {
            klasa = "bad";
        }

        return `
        <section class="wiersz-sprawdzenia">
            <span>${ETYKIETY_SKLADNIKOW_PRZEPISY[klucz]}</span>
            <span>${wartosc.toFixed(1)} / ${norma.toFixed(1)}</span>
            <span class="tag ${klasa}">${procent}%</span>
        </section>
        `;
    }).join("");

    kontener.innerHTML = `
    <section class="wiersz-sprawdzenia">
        <span>Kalorie</span>
        <span>${Math.round(podsumowanie.sumaKcal)} / ${celKcal || "-"} kcal</span>
        ${kcalTag}
    </section>
    ${wierszeSkladnikow}
    `;
}

renderujSprawdzenieDzisiaj();
renderujTabeleNorm();
renderujZgodnoscRozporzadzenie();
