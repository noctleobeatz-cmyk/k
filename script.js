const GRUPY_WIEKOWE = [
    {id: "1", etykieta: "1 rok", kcal: 745},
    {id: "2", etykieta: "2 lata", kcal: 988},
    {id: "3", etykieta: "3 lata", kcal: 1126},
    {id: "4", etykieta: "4 lata", kcal: 1370},
    {id: "5", etykieta: "5 lat", kcal: 1472},
    {id: "6", etykieta: "6 lat", kcal: 1560},
    {id: "7", etykieta: "7 lat", kcal: 1652},
    {id: "8", etykieta: "8 lat", kcal: 1757},
    {id: "9", etykieta: "9 lat", kcal: 1862},
    {id: "10", etykieta: "10 lat", kcal: 2131},
    {id: "11", etykieta: "11 lat", kcal: 2244},
    {id: "12", etykieta: "12 lat", kcal: 2381},
    {id: "13", etykieta: "13 lat", kcal: 2529},
    {id: "14", etykieta: "14 lat", kcal: 2665},
    {id: "15", etykieta: "15 lat", kcal: 2774}
];

const NORMY_SKLADNIKOW = {
    "1-3": {"blonnik_g": 10, "cukry_g": 25, "sod_mg": 1100, "witamina_c_mg": 40, "zelazo_mg": 7, "bialko_g": 15, "tluszcz_g": 40, "weglowodany_g": 130, "woda_g": 1300},
    "4-6": {"blonnik_g": 14, "cukry_g": 30, "sod_mg": 1200, "witamina_c_mg": 50, "zelazo_mg": 10, "bialko_g": 19, "tluszcz_g": 55, "weglowodany_g": 180, "woda_g": 1600},
    "7-9": {"blonnik_g": 16, "cukry_g": 40, "sod_mg": 1400, "witamina_c_mg": 55, "zelazo_mg": 10, "bialko_g": 27, "tluszcz_g": 65, "weglowodany_g": 220, "woda_g": 1800},
    "10-12": {"blonnik_g": 19, "cukry_g": 45, "sod_mg": 1500, "witamina_c_mg": 60, "zelazo_mg": 10, "bialko_g": 35, "tluszcz_g": 75, "weglowodany_g": 260, "woda_g": 2000},
    "13-15": {"blonnik_g": 21, "cukry_g": 50, "sod_mg": 1500, "witamina_c_mg": 75, "zelazo_mg": 12, "bialko_g": 46, "tluszcz_g": 85, "weglowodany_g": 300, "woda_g": 2100}
};

const MAPA_PIERSCIENI = {B: "blonnik_g", C: "cukry_g", S: "sod_mg", W: "witamina_c_mg", Z: "zelazo_mg", Bi: "bialko_g", T: "tluszcz_g", We: "weglowodany_g", Wo: "woda_g"};

const ETYKIETY_WARTOSCI_ODZYWCZYCH = {
    blonnik_g: "Błonnik",
    cukry_g: "Cukry",
    sod_mg: "Sód",
    witamina_c_mg: "Wit. C",
    zelazo_mg: "Żelazo",
    bialko_g: "Białko",
    tluszcz_g: "Tłuszcz",
    weglowodany_g: "Węglow.",
    woda_g: "Woda"
};

const JEDNOSTKI_WARTOSCI_ODZYWCZYCH = {
    blonnik_g: "g",
    cukry_g: "g",
    sod_mg: "mg",
    witamina_c_mg: "mg",
    zelazo_mg: "mg",
    bialko_g: "g",
    tluszcz_g: "g",
    weglowodany_g: "g",
    woda_g: "g"
};
const SLOTY = ["sniadanie", "drugie_sniadanie", "obiad"];
const DNI_TYG = ["Niedziela", "Poniedziałek", "Wtorek", "Środa", "Czwartek", "Piątek", "Sobota"];
const MIESIACE = ["styczeń", "luty", "marzec", "kwiecień", "maj", "czerwiec", "lipiec", "sierpień", "wrzesień", "październik", "listopad", "grudzień"];
const KLUCZ_CONFIG = "stolowka_config";
const KLUCZ_PRODUKTY_WLASNE = "stolowka_produkty_wlasne";

const ALERGENY = [
    {klucz: "gluten", etykieta: "Gluten"},
    {klucz: "skorupiaki", etykieta: "Skorupiaki"},
    {klucz: "jaja", etykieta: "Jaja"},
    {klucz: "ryby", etykieta: "Ryby"},
    {klucz: "orzeszki_ziemne", etykieta: "Orzeszki ziemne"},
    {klucz: "soja", etykieta: "Soja"},
    {klucz: "mleko", etykieta: "Mleko (laktoza)"},
    {klucz: "orzechy", etykieta: "Orzechy"},
    {klucz: "seler", etykieta: "Seler"},
    {klucz: "gorczyca", etykieta: "Gorczyca"},
    {klucz: "sezam", etykieta: "Nasiona sezamu"},
    {klucz: "siarczyny", etykieta: "Siarczyny / SO2"},
    {klucz: "lubin", etykieta: "Łubin"},
    {klucz: "mieczaki", etykieta: "Mięczaki"}
];

function etykietaAlergenu(klucz) {
    const wpis = ALERGENY.find(function(a) {
        return a.klucz === klucz;
    });

    if (wpis) {
        return wpis.etykieta;
    } else {
        return klucz;
    }
}

const SLOTY_ETYKIETY = {
    sniadanie: "Śniadanie",
    drugie_sniadanie: "Drugie Śniadanie",
    obiad: "Obiad"
};

function fmtData(d) {
    return d.toISOString().slice(0, 10);
}

function kluczDnia(d) {
    let iso;

    if (d instanceof Date) {
        iso = fmtData(d);
    } else {
        iso = d;
    }

    return "stolowka_posilki_" + iso;
}

function pustyDzien() {
    return {sniadanie: [], drugie_sniadanie: [], obiad: [], zatwierdzony: false};
}

function odmienLata(n) {
    if (n === 1) {
        return "rok";
    }

    const ostatnia = n % 10;
    const dziesiatki = n % 100;

    if (ostatnia >= 2 && ostatnia <= 4 && !(dziesiatki >= 12 && dziesiatki <= 14)) {
        return "lata";
    }

    return "lat";
}

function formatujDate(d) {
    const dzien = DNI_TYG[d.getDay()];
    return `${dzien}, ${d.getDate()} ${MIESIACE[d.getMonth()]} ${d.getFullYear()}`;
}

function formatujDataZapisu(iso) {
    const d = new Date(iso);
    const dzien = String(d.getDate()).padStart(2, "0");
    const miesiac = String(d.getMonth() + 1).padStart(2, "0");

    return `${dzien}.${miesiac}.${d.getFullYear()}`;
}

function kluczBracketuDlaWieku(wiek) {
    if (wiek >= 1 && wiek <= 3) {
        return "1-3";
    } else if (wiek >= 4 && wiek <= 6) {
        return "4-6";
    } else if (wiek >= 7 && wiek <= 9) {
        return "7-9";
    } else if (wiek >= 10 && wiek <= 12) {
        return "10-12";
    } else if (wiek >= 13 && wiek <= 15) {
        return "13-15";
    } else {
        return null;
    }
}

function obliczZapotrzebowanie(grupy) {
    let sumaKcal = 0;
    let sumaDzieci = 0;

    GRUPY_WIEKOWE.forEach(function(grupa) {
        const liczba = grupy[grupa.id] || 0;
        sumaKcal += liczba * grupa.kcal;
        sumaDzieci += liczba;
    });

    if (!sumaDzieci) {
        return 0;
    }

    return Math.round(sumaKcal / sumaDzieci);
}

function obliczNormySkladnikow(grupy) {
    let sumaDzieci = 0;
    const sumaNorm = {};

    Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
        sumaNorm[klucz] = 0;
    });

    GRUPY_WIEKOWE.forEach(function(grupa) {
        const liczba = grupy[grupa.id] || 0;

        if (liczba === 0) {
            return;
        }

        const bracket = kluczBracketuDlaWieku(Number(grupa.id));
        let normy;

        if (bracket) {
            normy = NORMY_SKLADNIKOW[bracket];
        } else {
            normy = null;
        }

        sumaDzieci += liczba;

        if (normy) {
            Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
                sumaNorm[klucz] += liczba * (normy[klucz] || 0);
            });
        }
    });

    const wynik = {};

    Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
        if (sumaDzieci) {
            wynik[klucz] = sumaNorm[klucz] / sumaDzieci;
        } else {
            wynik[klucz] = 0;
        }
    });

    return wynik;
}

function podswietlAktywnaStrone() {
    const aktualnaSciezka = window.location.pathname.split("/").pop();

    document.querySelectorAll("nav a").forEach(function(link) {
        const cel = link.getAttribute("href");

        if (cel === aktualnaSciezka) {
            link.classList.add("aktywny");
        } else {
            link.classList.remove("aktywny");
        }
    });
}

function poniedzialekTygodnia(data) {
    const kopia = new Date(data);
    const dzienTyg = kopia.getDay();
    let offset;

    if (dzienTyg === 0) {
        offset = -6;
    } else {
        offset = 1 - dzienTyg;
    }

    kopia.setDate(kopia.getDate() + offset);
    kopia.setHours(0, 0, 0, 0);

    return kopia;
}

function dniRobocze(poniedzialek) {
    const dni = [];

    for (let i = 0; i < 5; i++) {
        const d = new Date(poniedzialek);
        d.setDate(d.getDate() + i);
        dni.push(d);
    }

    return dni;
}

function wczytajDzienZKlucza(data) {
    const zapis = localStorage.getItem(kluczDnia(data));

    if (!zapis) {
        return null;
    }

    try {
        return JSON.parse(zapis);
    } catch (err) {
        return null;
    }
}

function cechaDania(danie, klucz) {
    return !!(danie.ocena_zgodnosci && danie.ocena_zgodnosci.cechy_dania && danie.ocena_zgodnosci.cechy_dania[klucz]);
}

function zbierzObiadyTygodnia(dni) {
    const dania = [];
    let dniZDanymi = 0;
    let dniZWarzywem = 0;

    dni.forEach(function(data) {
        const dzien = wczytajDzienZKlucza(data);

        if (!dzien || !dzien.zatwierdzony) {
            return;
        }

        const obiad = dzien.obiad || [];

        if (obiad.length === 0) {
            return;
        }

        dniZDanymi++;

        if (obiad.some(function(danie) { return cechaDania(danie, "zawiera_warzywo_lub_owoc"); })) {
            dniZWarzywem++;
        }

        obiad.forEach(function(danie) {
            dania.push(danie);
        });
    });

    return {dania: dania, dniZDanymi: dniZDanymi, dniZWarzywem: dniZWarzywem};
}

podswietlAktywnaStrone();