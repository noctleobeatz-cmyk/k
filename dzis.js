const DATA_MINIMALNA = new Date(2026, 6, 20);
DATA_MINIMALNA.setHours(0, 0, 0, 0);

function odczytajDateZUrl() {
    const params = new URLSearchParams(window.location.search);
    const iso = params.get("data");

    if (!iso) {
        return new Date();
    }

    const d = new Date(iso);

    if (isNaN(d.getTime())) {
        return new Date();
    }

    return d;
}

const state = {
    aktualnaData: odczytajDateZUrl(),
    config: null,
    dzien: null
};

function zmienDate(liczbaDni) {
    const nowaData = new Date(state.aktualnaData);
    nowaData.setDate(nowaData.getDate() + liczbaDni);
    nowaData.setHours(0, 0, 0, 0);

    if (nowaData < DATA_MINIMALNA) {
        return;
    }

    state.aktualnaData = nowaData;
    odswiezDate();
}

function odswiezDate() {
    const element = document.getElementById("pokaz");
    const sformatowanaData = formatujDate(state.aktualnaData);
    
    if (element) {
        element.textContent = sformatowanaData;
    } else {
        console.error("Element #pokaz nie znaleziony w DOM");
    }
    
    wczytajDzien();
}

function wczytajCeleNiestandardowe() {
    const zapis = localStorage.getItem("stolowka_cele_niestandardowe");

    if (zapis) {
        return JSON.parse(zapis);
    } else {
        return null;
    }
}

function aktualizujZapotrzebowanie(grupyOverride) {
    const element = document.getElementById("zapotrzebowanie");
    let grupy;

    if (grupyOverride) {
        grupy = grupyOverride;
    } else {
        grupy = state.config && state.config.grupy;
    }

    const celeNiestandardowe = wczytajCeleNiestandardowe();
    let cel = 0;

    if (celeNiestandardowe && celeNiestandardowe.kcal) {
        cel = celeNiestandardowe.kcal;
    } else if (grupy) {
        cel = obliczZapotrzebowanie(grupy);
    }

    if (cel) {
        element.textContent = `${cel} kcal`;
    } else {
        element.textContent = "-kcal";
    }
}

function pokazBrakKonfiguracji() {
    document.getElementById("widok-podsumowania").hidden = true;
    document.getElementById("brak-konfiguracji").hidden = false;
    aktualizujZapotrzebowanie();
}

function pokazTrybPodsumowania() {
    document.getElementById("widok-podsumowania").hidden = false;
    document.getElementById("brak-konfiguracji").hidden = true;

    document.getElementById("podsumowanie-placowka").textContent = state.config.placowka || "-";
    document.getElementById("data-zapisu").textContent = formatujDataZapisu(state.config.zaktualizowano);
    aktualizujZapotrzebowanie();
}

function wczytajConfig() {
    const zapis = localStorage.getItem(KLUCZ_CONFIG);

    if (!zapis) {
        state.config = null;
        pokazBrakKonfiguracji();
        return;
    }

    state.config = JSON.parse(zapis);
    pokazTrybPodsumowania();
}

function wczytajDzien() {
    const zapis = localStorage.getItem(kluczDnia(state.aktualnaData));

    if (zapis) {
        state.dzien = JSON.parse(zapis);
    } else {
        state.dzien = pustyDzien();
    }

    renderujWszystkiePosilki();
    aktualizujPiersienieIPozostalo();
    aktualizujStanZatwierdzenia();
}

function zapiszDzien() {
    localStorage.setItem(kluczDnia(state.aktualnaData), JSON.stringify(state.dzien));
}

function renderujWszystkiePosilki() {
    SLOTY.forEach(renderujPosilek);
}

function renderujPosilek(slot) {
    const sekcja = document.querySelector(`section[data-posilek="${slot}"]`);

    if (!sekcja) {
        return;
    }

    const dania = state.dzien[slot] || [];
    const puste = sekcja.querySelector(".puste");
    const stopka = sekcja.querySelector(".stopka-posiłku");
    const kcalEl = sekcja.querySelector(".meta .kcal");
    const czasEl = sekcja.querySelector(".meta .czas");
    const zgodnoscEl = sekcja.querySelector(".zgodnosc");
    const link = sekcja.querySelector("a");

    if (link) {
        link.href = `baza.html?slot=${slot}&data=${fmtData(state.aktualnaData)}`;
    }

    if (dania.length === 0) {
        if (puste) {
            puste.style.display = "";
        }

        if (kcalEl) {
            kcalEl.textContent = "";
        }

        if (czasEl) {
            czasEl.textContent = "";
        }

        if (zgodnoscEl) {
            zgodnoscEl.innerHTML = "";
        }

        return;
    }

    const sumaKcal = dania.reduce(function(s, d) {
        return s + (d.kcal || 0);
    }, 0);

    if (kcalEl) {
        kcalEl.textContent = `${sumaKcal} kcal`;
    }

    if (czasEl) {
        czasEl.textContent = dania[dania.length - 1].godzina || "";
    }

    if (puste) {
        puste.style.display = "none";
    }

    if (zgodnoscEl) {
        const wszystkieOk = dania.every(function(d) {
            return d.ocena_zgodnosci && d.ocena_zgodnosci.energia_zgodna_z_udzialem_docelowym !== false;
        });

        let klasa = "bad";
        let tekst = "⚠️ sprawdź zgodność";

        if (wszystkieOk) {
            klasa = "ok";
            tekst = "✅ zgodne z normą";
        }

        const nazwyDan = dania.map(function(d) {
            return `<li>${escapeHtmlProdukt(d.nazwa)}</li>`;
        }).join("");

        zgodnoscEl.innerHTML = `
        <span class="tag ${klasa}">
        ${tekst}
        </span>

        <div class="lista-dan">
        <ul>${nazwyDan}</ul>
        </div>
        `;
    }

    if (slot === "obiad" && state.config && stopka) {
        const limit = state.config.obiady || 1;
        const przycisk = stopka.querySelector("button");

        if (przycisk) {
            const osiagnietoLimit = dania.length >= limit;

            przycisk.disabled = osiagnietoLimit;

            if (osiagnietoLimit) {
                przycisk.textContent = `Osiągnięto limit ${limit} dań`;
            } else {
                przycisk.textContent = "+ Dodaj posiłek";
            }
        }
    }
}

function zsumujWartosciOdzywcze() {
    const suma = {};

    Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
        suma[klucz] = 0;
    });

    let sumaKcal = 0;

    SLOTY.forEach(function(slot) {
        (state.dzien[slot] || []).forEach(function(danie) {
            sumaKcal += danie.kcal || 0;
            const wo = danie.wartosci_odzywcze || {};

            Object.values(MAPA_PIERSCIENI).forEach(function(klucz) {
                suma[klucz] += wo[klucz] || 0;
            });
        });
    });

    return {suma: suma, sumaKcal: sumaKcal};
}

function aktualizujPiersienieIPozostalo() {
    const wynikSumy = zsumujWartosciOdzywcze();
    const suma = wynikSumy.suma;
    const sumaKcal = wynikSumy.sumaKcal;
    const celeNiestandardowe = wczytajCeleNiestandardowe();
    let normy;

    if (celeNiestandardowe && celeNiestandardowe.skladniki) {
        normy = celeNiestandardowe.skladniki;
    } else if (state.config) {
        normy = obliczNormySkladnikow(state.config.grupy);
    } else {
        normy = {};
    }

    Object.entries(MAPA_PIERSCIENI).forEach(function(para) {
        const sufiks = para[0];
        const klucz = para[1];
        const pierscien = document.getElementById(`pierścień_${sufiks}`);

        if (!pierscien) {
            return;
        }

        const obecnieEl = pierscien.querySelector(".obecnie");
        const normaEl = pierscien.querySelector(".norma_dawkowa");

        if (obecnieEl) {
            obecnieEl.textContent = suma[klucz].toFixed(1);
        }

        if (normaEl) {
            normaEl.textContent = (normy[klucz] || 0).toFixed(1);
        }
    });

    let cel = 0;

    if (celeNiestandardowe && celeNiestandardowe.kcal) {
        cel = celeNiestandardowe.kcal;
    } else if (state.config) {
        cel = obliczZapotrzebowanie(state.config.grupy);
    }

    const elementPozostalo = document.getElementById("pozostalo");

    if (elementPozostalo) {
        if (cel) {
            elementPozostalo.textContent = `${cel - sumaKcal} kcal`;
        } else {
            elementPozostalo.textContent = "-kcal";
        }
    }
}

function aktualizujStanZatwierdzenia() {
    const zapisz = document.getElementById("zapisz");

    if (!zapisz) {
        return;
    }

    if (state.dzien.zatwierdzony) {
        zapisz.textContent = "✅ Posiłki zatwierdzone";
        zapisz.disabled = true;
    } else {
        zapisz.textContent = "Zatwierdz posiłek";
        zapisz.disabled = false;
    }
}

function inicjujStroneDzis() {
    if (document.getElementById("dzien-poprzedni")) {
        document.getElementById("dzien-poprzedni").addEventListener("click", function() {
            zmienDate(-1);
        });
    }

    if (document.getElementById("dzien-nastepny")) {
        document.getElementById("dzien-nastepny").addEventListener("click", function() {
            zmienDate(1);
        });
    }

    if (document.getElementById("zapisz")) {
        document.getElementById("zapisz").addEventListener("click", function() {
            const brakDan = SLOTY.every(function(slot) {
                const posilek = state.dzien[slot] || [];
                return posilek.length === 0;
            });

            if (brakDan) {
                alert("Nie dodano jeszcze żadnych posiłków na ten dzień");
                return;
            }

            const czyZatwierdzic = confirm("Czy na pewno zatwierdzić posiłki na ten dzień? Nie będzie można ich później edytować");

            if (czyZatwierdzic) {
                state.dzien.zatwierdzony = true;
                zapiszDzien();
                aktualizujStanZatwierdzenia();
            }
        });
    }

    wczytajConfig();
    odswiezDate();
}

function escapeHtmlProdukt(str) {
    const section = document.createElement("section");
    section.textContent = str;
    return section.innerHTML;
}

if (document.getElementById("pokaz")) {
    inicjujStroneDzis();
}
